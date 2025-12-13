function cal_start(nowtime){
  return Math.ceil(nowtime / CALCULATE_INTERVAL) * CALCULATE_INTERVAL;
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "askAI",
    title: "送給 AI",
    contexts: ["selection"]
  });
  chrome.storage.sync.get(["user_id"], (data) => {  //sync: 透過chrome同步功能同步
    if (!data.user_id) {
      const uid = crypto.randomUUID();
      // 確認id沒有重複: db
      chrome.storage.sync.set({ user_id: uid });
      chrome.storage.sync.set({ bias: 0 });
      console.log("Assigned new user ID:", uid);
    }
    else
    {
      console.log("User ID:", data.user_id);
      chrome.storage.sync.set({ bias: /*從db抓*/0 });
    }
  });

  chrome.alarms.create("focusScoreAlarm", { 
    when: cal_start(Date.now()),
    periodInMinutes: 10 // 每10分鐘更新一次專注度
  });
});

//算停頓時間
function analyzePauseTime(timestamps) {
    if (timestamps.length < 2) { 
        return 0;
    }
    let totalPauseTime = 0;
    for (let i = 1; i < timestamps.length; i++) {
        const interval = timestamps[i] - timestamps[i - 1]; //停頓時間
        if (interval > LONG_PAUSE_THRESHOLD) { //超過閾值，才累積到總暫停時間
            totalPauseTime += interval; 
        }
    }
    return totalPauseTime;
};

// background.js (新增)

//算每10秒的打字速度
const SECTION_INTERVAL_MS = 10000; //固定每 10 秒計算一次速度
function calculateAverageChangeRate(timestamps) {
    if (timestamps.length < 2) {
        return []; 
    }

    const startTime = timestamps[0];
    const endTime = timestamps.at(-1);
    if (endTime - startTime < SECTION_INTERVAL_MS) {
        return []; //總時長不足一個區間
    }

    const sectionSpeeds = []; //紀錄每個區間的速度
    let currentIntervalStart = startTime;
    let keysInCurrentSection = 0;
    let timestampIndex = 0;

    while (currentIntervalStart < endTime) {
        const currentIntervalEnd = currentIntervalStart + SECTION_INTERVAL_MS;
        keysInCurrentSection = 0;
        
        //計算區間內keyCount
        while (timestampIndex < timestamps.length && timestamps[timestampIndex] < currentIntervalEnd) {
            keysInCurrentSection++; //打了一次字
            timestampIndex++;
        }
        
        //V_k = 該區間內keyCount / 區間秒數
        const sectionSpeed = keysInCurrentSection / (SECTION_INTERVAL_MS / 1000); 
        
        //如果該區間有按鍵，則記錄速度
        if (keysInCurrentSection > 0) {
            sectionSpeeds.push(sectionSpeed);
        }

        //算下一個區間
        currentIntervalStart = currentIntervalEnd;
    }

    return sectionSpeeds;
}


//計算平均速度變化率
function calculateDeltaV(v) {
    if (v.length < 2) {
        return 0;
    }
    let deltaVSum = 0;
    const n = v.length; 
    // Delta_v = (1 / (n-1)) * Sum(|V(i+1) - V(i)|)
    for (let i = 0; i < n - 1; i++) {
        const V_i = v[i];
        const V_i_plus_1 = v[i + 1];
        deltaVSum += Math.abs(V_i_plus_1 - V_i);
    }
    const averageChangeRate = deltaVSum / (n - 1); 

    return averageChangeRate; 
}

const CALCULATE_INTERVAL =  600000 //多久算一次專注度->10 mins->600000ms
function calculate_focus(data){
    //指標：打字速度變化率、停頓時間、錯字率(backspaceCount/(backspaceCount+keyCount))
    const keyCount = data.keyCount || 0;
    const backspaceCount = data.backspaceCount || 0;
    const keyTimestamps = data.keyTimestamps || [];

    let totalPauseTime = analyzePauseTime(keyTimestamps); //停頓時間
    totalPauseTime = Math.floor(totalPauseTime / 1000); //單位：秒

    let errorRate;
    if(backspaceCount===0 && keyCount===0){
      errorRate = 0;
    }
    else{
      errorRate = backspaceCount/(backspaceCount+keyCount); //錯字率
    }
    
    //打字速度變化率
    const sectionSpeeds = calculateSectionalVelocity(keyTimestamps); 
    const Delta_v = calculateDeltaV(sectionSpeeds);

    


    return focusScore
};

//監聽專注度鬧鐘

chrome.alarms.onAlarm.addListener((alarm) => {
    //console.log(Date());
    if (alarm.name === "focusScoreAlarm") {
        chrome.storage.local.get(["keyCount", "backspaceCount", "keyTimestamps", "last_focus_score", "LAST_CALCULATE_FOCUS"], (data) => {
          const keyTimestamps = data.keyTimestamps || [];
          const LAST_CALCULATE_FOCUS = data.LAST_CALCULATE_FOCUS || 0;

          // 檢查是否已達到計算週期
          if ((Date.now() - LAST_CALCULATE_FOCUS) >= CALCULATE_INTERVAL) {
              const focusScore = calculate_focus(data);
              // 儲存最新的分數和計算時間(供 popup.js 讀取)
              chrome.storage.local.set({
                  last_focus_score: focusScore,
                  LAST_CALCULATE_FOCUS: Date.now() // 更新上次計算時間
              }, () => {
                 // TODO //後端上傳
                 // 傳focus + Date.now() + user_id
              });
          }
        });
    }
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "askAI" && info.selectionText) {
    chrome.tabs.sendMessage(tab.id, {
      action: "showAIWindow",
      text: info.selectionText
    }).catch(() => {
      console.warn("Content Script 未啟動，嘗試注入所有 frame...");

      // 重新注入 content script（主 frame + 子 frame）
      chrome.scripting.executeScript({
        target: { tabId: tab.id, allFrames: true },
        files: ["content.js"]
      }, () => {
        // 再試一次
        chrome.tabs.sendMessage(tab.id, {
          action: "showAIWindow",
          text: info.selectionText
        });
      });
    });
  }
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.action === "openReminder") {
    chrome.tabs.sendMessage(msg.tab.id, {action: "showWindow"},
      (response) => {
        if(chrome.runtime.lastError)
          chrome.scripting.executeScript({
            target: { tabId: msg.tab.id, allFrames: true },
            files: ["reminder.js"]
          });
      });
  }
});