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
      console.log("Assigned new user ID:", uid);
    }
    else
      console.log("User ID:", data.user_id)
  });
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