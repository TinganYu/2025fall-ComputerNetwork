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
    // *** 移除 AI 呼叫邏輯，改為通知 content.js 顯示 AI 視窗
    chrome.tabs.sendMessage(tab.id, { 
        action: "showAIWindow", // 新增一個動作標籤
        text: info.selectionText // 傳遞選取文字
    });
  }
});
// // 監聽右鍵選單點擊
// chrome.contextMenus.onClicked.addListener((info, tab) => {
//   if (info.menuItemId === "askAI" && info.selectionText) {
//     fetch("https://two025fall-computernetwork.onrender.com/ask", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({ text: info.selectionText })
//     })
//     .then(res => res.json())
//     .then(data => {
//       // 檢查 reply 是否存在且是字串
//       const replyText = typeof data.reply === "string" ? data.reply : "AI 回覆錯誤";
//       chrome.tabs.sendMessage(tab.id, { reply: replyText });
//     })
//     .catch(err => console.error(err));
//   }
// });
