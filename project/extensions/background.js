chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "askAI",
    title: "送給 AI",
    contexts: ["selection"]
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
    chrome.scripting.executeScript({
      target: { tabId: msg.tab.id, allFrames: true },
      files: ["reminder.js"]
    });
  }
});