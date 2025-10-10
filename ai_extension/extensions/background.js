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
    fetch("https://two025fall-computernetwork.onrender.com/askAI", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: info.selectionText })
    })
    .then(res => res.json())
    .then(data => {
      // 把結果傳給 content.js
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (reply) => {
          // 這段會在 content.js 的網頁環境執行
          let div = document.getElementById("ai-popup-div");
          if (!div) {
            div = document.createElement("div");
            div.id = "ai-popup-div";
            div.style.position = "fixed";
            div.style.bottom = "20px";
            div.style.right = "20px";
            div.style.backgroundColor = "white";
            div.style.border = "1px solid black";
            div.style.padding = "10px";
            div.style.zIndex = "9999";
            div.style.maxWidth = "300px";
            div.style.boxShadow = "0px 0px 5px rgba(0,0,0,0.3)";
            document.body.appendChild(div);
          }
          div.textContent = reply;
        },
        args: [data.reply]
      });
    })
    .catch(err => console.error(err));
  }
});
