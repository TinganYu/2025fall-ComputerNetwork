// 建立右鍵選單
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "askAI",
    title: "送給 AI",
    contexts: ["selection"]
  });
});
// 監聽右鍵選單點擊
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "askAI" && info.selectionText) {
    
    // 檢查 tab 是否有效且不是受限頁面 (防止在 chrome:// 等特殊頁面發送訊息)
    if (!tab || !tab.id || (tab.url && (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('view-source:')))) {
        console.warn("無法在 Chrome 特殊頁面啟動 AI 助手。");
        return;
    }

    // 僅傳遞訊息，並使用 .catch() 捕獲連線錯誤
    // chrome.tabs.sendMessage 返回一個 Promise，必須捕獲其失敗狀態
    chrome.tabs.sendMessage(tab.id, { 
        action: "showAIWindow", 
        text: info.selectionText 
    }).catch(error => {
        // 捕獲並處理 "Receiving end does not exist" 錯誤，阻止它變成 Uncaught 錯誤
        if (error.message.includes('Receiving end does not exist')) {
            console.error("Content Script 未啟動，無法建立連線。請在普通網頁上重試。");
        } else {
            // 處理其他未預期的錯誤
            console.error("傳送訊息時發生錯誤:", error);
        }
    });
  }
});