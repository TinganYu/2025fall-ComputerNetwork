// // content.js
// document.addEventListener("mouseup", () => {
//   const selectedText = window.getSelection().toString();
//   if (selectedText) {
//     chrome.runtime.sendMessage({ text: selectedText });
//   }
// });
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

//監聽打字(目前測試：gemini、hackmd、colab讀的到，google doc、word線上版讀不到)
let keyCount = 0
let backspaceCount = 0;
let keyTimestamps = []; //每次按按鍵的時間

chrome.storage.local.get(["keyCount", "backspaceCount", "keyTimestamps"], (data) => {//繼承之前/其他網站的行為資料
  keyCount = data.keyCount || 0;
  backspaceCount = data.backspaceCount || 0;
  keyTimestamps = data.keyTimestamps || []; 
  if(keyTimestamps.length > 0){
      if(Date.now() - keyTimestamps.at(-1) > 14400000){ //4hr沒打字就重置(長期專注度記錄再另外放在後端)
      keyTimestamps = [];
      keyCount = 0;
      backspaceCount = 0;
    }
  }
  document.addEventListener("keydown", (e) =>{
    keyCount++;
    keyTimestamps.push(Date.now()); 
    if (e.key === "Backspace") backspaceCount++;
    chrome.storage.local.set({keyCount, backspaceCount, keyTimestamps});
  });
});
