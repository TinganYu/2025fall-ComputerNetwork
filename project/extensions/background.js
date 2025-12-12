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
    periodInMinutes: 5 // 每5分鐘更新一次專注度
  });
});

const CALCULATE_INTERVAL =  600000//多久算一次專注度->10 mins->600000ms
function calculate_focus(data){
    //指標：打字速度變化率、停頓時間、錯字率(backspaceCount/(backspaceCount+keyCount))
};

//監聽專注度鬧鐘

chrome.alarms.onAlarm.addListener((alarm) => {
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