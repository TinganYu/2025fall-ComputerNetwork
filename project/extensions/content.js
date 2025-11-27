// 建立浮動框（初始隱藏）
let aiDiv = document.createElement("div");
aiDiv.id = "ai-popup-div";
aiDiv.style.position = "fixed";
aiDiv.style.bottom = "20px";
aiDiv.style.right = "20px";
aiDiv.style.backgroundColor = "white";
aiDiv.style.border = "1px solid black";
aiDiv.style.padding = "10px";
aiDiv.style.zIndex = "9999";
aiDiv.style.maxWidth = "300px";
aiDiv.style.boxShadow = "0px 0px 5px rgba(0,0,0,0.3)";
aiDiv.style.display = "none"; // 初始隱藏
document.body.appendChild(aiDiv);

// 監聽 background.js 傳來的訊息
chrome.runtime.onMessage.addListener((message) => {
  if (message.reply) {
    aiDiv.textContent = message.reply;
    aiDiv.style.display = "block"; // 顯示
    // 自動 5 秒消失
    setTimeout(() => {
      aiDiv.style.display = "none";
    }, 5000);
  }
});
