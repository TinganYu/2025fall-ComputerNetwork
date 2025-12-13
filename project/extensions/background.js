//計算專注度的週期
const FOCUS_INTERVAL_MIN = 10;
const FOCUS_INTERVAL_MS = FOCUS_INTERVAL_MIN * 60 * 1000;

function cal_start(nowtime){
  return Math.ceil(nowtime / FOCUS_INTERVAL_MS) * FOCUS_INTERVAL_MS;
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "askAI",
    title: "送給 AI",
    contexts: ["selection"]
  });
  chrome.storage.sync.get(["user_id"], (data) => {  //sync: 透過chrome同步功能同步
    if (!data.user_id) {
        (async () => {  //確認不是重複uid
            let uid_repeat = true;
            let uid = crypto.randomUUID();
            while(uid_repeat){
                const response =  await fetch("https://two025fall-computernetwork-aiv7.onrender.com/check_id", {
                    method: "POST",
                    headers: {"Content-Type":"application/json"},
                    body: JSON.stringify({ id: uid })
                });
                const result = await response.json();
                if(!result.exists)
                    uid_repeat = false;
                else
                    uid = crypto.randomUUID();
            }
            chrome.storage.sync.set({ user_id: uid });
            chrome.storage.sync.set({ bias: 0 });
            console.log("Assigned new user ID:", uid);
        })();
    }
    else  //以防萬一跟 db 同步 id + bias
    {
      console.log("User ID:", data.user_id);
      fetch("https://two025fall-computernetwork-aiv7.onrender.com/check_id", {
          method: "POST",
          headers: {"Content-Type":"application/json"},
          body: JSON.stringify({ id: data.user_id })
      })
      .then(r => r.json().catch(()=>{}))
      .then(data => {
        chrome.storage.sync.set({ bias: data.bias });
        console.log("[Eileen's part] Get user bias:", data);
      });
    }
  });

  chrome.alarms.create("focusScoreAlarm", { 
    when: cal_start(Date.now()),
    periodInMinutes: FOCUS_INTERVAL_MIN // 每10分鐘更新一次專注度
  });
});

//開啟專注度低跳提醒
function openReminder(){
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        let tab = tabs[0];
        chrome.runtime.sendMessage({ action: "openReminder" ,tab: tab});
    });
}

//-------專注度分數處理-------

//正規化
function normalizeScore(nowValue, minValue, maxValue) {
    if (maxValue === minValue) return 1; // 避免除以零，直接視為專注度極高(打字行為穩定)

    const normalizedRatio = (nowValue - minValue) / (maxValue - minValue);
    
    // 專注度指標都是越小越好，所以需要用1-
    return 1 - normalizedRatio;
}

//找min max
function getExtremes(history, key, now) { 
    const relevantData = history.map(record => record[key]);//從history矩陣中提取對應要的值用成一個陣列
    
    //過去沒有任何值，所以最大最小都是自己
    if (relevantData.length === 0) {
        if (key === 'dv') return { min: now, max: now }; 
        if (key === 'p') return { min: now, max: now };     
        if (key === 'd') return { min: now, max: now };   
        return { min: now, max: now };
    }
    const min = Math.min(...relevantData); //...->取出relevantData裡的所有值
    const max = Math.max(...relevantData);
    
    return { min, max };
}

//算停頓時間
const LONG_PAUSE_THRESHOLD = 60000 //停1min才算停頓時間(盡量讓思考時間不會被記錄)
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

//算每10分的打字速度
const SECTION_INTERVAL_MS = FOCUS_INTERVAL_MS; //固定每 10 分鐘計算一次速度
function calculateAverageChangeRate(timestamps) {
    if (timestamps.length < 2) {
        return []; 
    }

    const startTime = timestamps[0];
    const endTime = timestamps.at(-1);
    if (endTime - startTime < SECTION_INTERVAL_MS) {//總時長不足一個區間
        return []; 
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

//計算當前專注度的三個指標
function calculate_focus(data, lastCalcTime){
    //指標：打字速度變化率、停頓時間、錯字率(backspaceCount/(backspaceCount+keyCount))
    const keyCount = data.keyCount || 0;
    const backspaceCount = data.backspaceCount || 0;
    const keyTimestamps = data.keyTimestamps || [];

    const currentCycleTimestamps = keyTimestamps.filter(t => t >= lastCalcTime);//篩選出只屬於當前週期 (上次計算時間 ~ 現在) 的按鍵
    const previousBoundaryTimestamp = keyTimestamps.findLast(t => t < lastCalcTime); //找出前一個週期 (lastCalcTime 之前) 的最後一次按鍵時間
    let recentTimestamps = [];
    if (previousBoundaryTimestamp) {// 如果找到邊界按鍵則將其放在陣列開頭
        recentTimestamps.push(previousBoundaryTimestamp); 
    }
    recentTimestamps = recentTimestamps.concat(currentCycleTimestamps); //合成要計算的停頓時間值

    let totalPauseTime = analyzePauseTime(recentTimestamps); //停頓時間計算
    totalPauseTime = Math.floor(totalPauseTime / 1000); //單位：秒

    if(totalPauseTime===0 && keyTimestamps.length > 0){
      totalPauseTime =  Math.floor((Date.now() - keyTimestamps.at(-1))/1000);
    }

    let errorRate;
    if(backspaceCount===0 && keyCount===0){
      errorRate = 0;
    }
    else{
      errorRate = backspaceCount/(backspaceCount+keyCount); //錯字率
    }
    
    //打字速度變化率
    const sectionSpeeds = calculateAverageChangeRate(keyTimestamps); 
    const Delta_v = calculateDeltaV(sectionSpeeds);


    return {
        now_Delta_v: Delta_v,
        now_PauseTime: totalPauseTime, // 單位：秒
        now_ErrorRate: errorRate
    };
};

const INACTIVITY_THRESHOLD_MS = 4 * 60 * 60 * 1000; //4hr沒打字就重置
//監聽專注度的鬧鐘(10min更新一次)
chrome.alarms.onAlarm.addListener((alarm) => {
    console.log("ALARM FIRED", alarm.name, Date.now());
    if (alarm.name === "focusScoreAlarm") {
        chrome.storage.sync.get(["bias","user_id"], (data_sync) => {
            chrome.storage.local.get(["keyCount", "backspaceCount", "keyTimestamps", "LAST_CALCULATE_FOCUS", "focus_history"], (data) => {
            const now = Date.now();
            const keyTimestamps = data.keyTimestamps || [];
            const lastKeyTime = keyTimestamps.at(-1) || 0;

            // 超過 4 小時沒打字 → 初始化
            if (keyTimestamps.length > 0 && now - lastKeyTime > INACTIVITY_THRESHOLD_MS) {
                chrome.storage.local.set({
                keyTimestamps: [],
                keyCount: 0,
                backspaceCount: 0,
                last_focus_score: 0,
                LAST_CALCULATE_FOCUS: 0,
                focus_history: []
                }, () => {
                console.log("User inactive for 4h+, all typing & focus data reset.");
                });
                return; // 不用再計算專注度
            }
            
            const LAST_CALCULATE_FOCUS = data.LAST_CALCULATE_FOCUS || 0;
            let history = data.focus_history || []; 

            // 檢查是否已達到計算週期(過了10分鐘)
            if ((Date.now() - LAST_CALCULATE_FOCUS) >= FOCUS_INTERVAL_MS) {

                //算現在的專注度
                const { now_Delta_v, now_PauseTime, now_ErrorRate } = calculate_focus(data, LAST_CALCULATE_FOCUS); 

                //找min max
                const dvExtremes = getExtremes(history, 'dv', now_Delta_v); 
                const pExtremes = getExtremes(history, 'p', now_PauseTime);   
                const dExtremes = getExtremes(history, 'd', now_ErrorRate);
                
                //做正規化
                const deltaVPrime = normalizeScore(now_Delta_v, Math.min(dvExtremes.min, now_Delta_v), Math.max(dvExtremes.max, now_Delta_v));
                const pauseTimePrime = normalizeScore(now_PauseTime, Math.min(pExtremes.min, now_PauseTime), Math.max(pExtremes.max, now_PauseTime));
                const errorRatePrime = normalizeScore(now_ErrorRate, Math.min(dExtremes.min, now_ErrorRate), Math.max(dExtremes.max,now_ErrorRate));
                
                // 算FocusScore S (假設 w1=0.33, w2=0.33, w3=0.34, b=0)
                // S = w1*Delta_v' + w2*p' + w3*d' + b
                const bias = data_sync.bias || 0; // 從 sync 讀取偏置項
                const focusScore = ((0.33 * deltaVPrime) + (0.33 * pauseTimePrime) + (0.34 * errorRatePrime)) * 100 + bias;

                // 確保分數在 0 到 100 之間
                const finalScore = Math.round(Math.min(Math.max(focusScore, 0), 100));

                //新增歷史紀錄
                const newRecord = { 
                    timestamp: Date.now(), 
                    dv: now_Delta_v, 
                    p: now_PauseTime, 
                    d: now_ErrorRate 
                };
                history.push(newRecord);

                // 限制歷史陣列大小 (專注度最多用過去一天的資料，不然儲存空間會爆炸)
                const MAX_HISTORY_LENGTH = 150; //10分鐘一筆，24小時=1440分鐘
                if (history.length > MAX_HISTORY_LENGTH) {
                    history = history.slice(history.length - MAX_HISTORY_LENGTH); //太長只留新的
                }
                console.log("準備呼叫db");
                //存進chrome
                chrome.storage.local.set({
                    last_focus_score: finalScore,
                    LAST_CALCULATE_FOCUS: Date.now(),
                    focus_history: history 
                }, () => {
                    if (finalScore < 40)    //待調整 專注力提醒
                        openReminder(); 

                    // 將 focus 存進 db
                    fetch("https://two025fall-computernetwork-aiv7.onrender.com/update_focus", {
                        method: "POST",
                        headers: {"Content-Type":"application/json"},  
                        body: JSON.stringify({ id: data_sync.user_id , now: Date.now(), focus: finalScore})
                    })
                    .then(r => r.json().catch(()=>{}))
                    .then(data_db => {
                        console.log("[Eileen's Part] update focus to db: ",data_db);
                    });
                });

                console.log("FOCUS DEBUG", {
                Delta_v: now_Delta_v,
                Pause: now_PauseTime,
                Error: now_ErrorRate,
                Prime: {
                    dv: deltaVPrime,
                    p: pauseTimePrime,
                    d: errorRatePrime
                },
                finalScore
                });
            }
            });
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
    //console.log("try to open reminder");
    chrome.tabs.sendMessage(msg.tab.id, {action: "showWindow"},
      (response) => {
        if(chrome.runtime.lastError)
          chrome.scripting.executeScript({
            target: { tabId: msg.tab.id, allFrames: true },
            files: ["reminder.js"]
          });
      });
  }

  else if (msg && msg.action == "updateBias"){
    fetch("https://two025fall-computernetwork-aiv7.onrender.com/update_bias", {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({ id: msg.user_id , bias: msg.bias })
    })
    .then(r => r.json().catch(()=>{}))
    .then(data => {
        console.log("[Eileen's Part] update bias to db: ",data);
    });
  }

});