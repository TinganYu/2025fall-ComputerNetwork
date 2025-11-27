// // 建立浮動框（初始隱藏）
// let aiDiv = document.createElement("div");
// aiDiv.id = "ai-popup-div";
// aiDiv.style.position = "fixed";
// aiDiv.style.bottom = "20px";
// aiDiv.style.right = "20px";
// aiDiv.style.backgroundColor = "white";
// aiDiv.style.border = "1px solid black";
// aiDiv.style.padding = "10px";
// aiDiv.style.zIndex = "9999";
// aiDiv.style.maxWidth = "300px";
// aiDiv.style.boxShadow = "0px 0px 5px rgba(0,0,0,0.3)";
// aiDiv.style.display = "none"; // 初始隱藏
// document.body.appendChild(aiDiv);

// // 監聽 background.js 傳來的訊息
// chrome.runtime.onMessage.addListener((message) => {
//   if (message.reply) {
//     aiDiv.textContent = message.reply;
//     aiDiv.style.display = "block"; // 顯示
//     // 自動 5 秒消失
//     setTimeout(() => {
//       aiDiv.style.display = "none";
//     }, 5000);
//   }
// });

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

// --- AI 彈出視窗邏輯 ---

// 1. 建立 UI 元素 (使用更簡潔的 HTML 結構)
let aiModal = document.createElement("div");
aiModal.id = "ai-modal-overlay";
aiModal.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background-color: rgba(0,0,0,0.5); z-index: 10000;
    display: none; justify-content: center; align-items: center;
`;
aiModal.innerHTML = `
    <div id="ai-modal-content" style="
        background: white; padding: 20px; border-radius: 8px;
        width: 90%; max-width: 400px; box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    ">
        <div style="display: flex; justify-content: space-between; align-items: center;">
            <h3>AI 寫作助手</h3>
            <button id="ai-close-btn" style="border: none; background: none; font-size: 1.5em; cursor: pointer;">&times;</button>
        </div>
        <textarea id="ai-input" style="width: 100%; height: 80px; margin-bottom: 10px; padding: 5px;" placeholder="輸入您的問題"></textarea>
        <button id="ai-send-btn" style="width: 100%; padding: 10px; background-color: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer;">詢問 AI</button>
        <div style="margin-top: 15px; font-weight: bold;">AI 回覆:</div>
        <div id="ai-output" style="white-space: pre-wrap; margin-top: 5px; max-height: 200px; overflow-y: auto; border: 1px solid #ccc; padding: 10px; border-radius: 4px;">...</div>
    </div>
`;
document.body.appendChild(aiModal);

// 2. 獲取內部元素
const inputArea = aiModal.querySelector("#ai-input");
const outputDiv = aiModal.querySelector("#ai-output");
const sendBtn = aiModal.querySelector("#ai-send-btn");
const closeBtn = aiModal.querySelector("#ai-close-btn");

// 3. 綁定關閉事件
closeBtn.addEventListener("click", () => {
    aiModal.style.display = "none";
});

// 4. 綁定 AI 呼叫事件
sendBtn.addEventListener("click", () => {
    const userText = inputArea.value;
    if (!userText) {
        outputDiv.textContent = "請輸入問題";
        return;
    }
    outputDiv.textContent = "AI 正在思考中...";
    sendBtn.disabled = true;

    fetch("https://two025fall-computernetwork.onrender.com/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: userText })
    })
    .then(res => res.json())
    .then(data => {
        const replyText = typeof data.reply === "string" ? data.reply : "AI 回覆錯誤";
        outputDiv.textContent = replyText;
    })
    .catch(err => {
        outputDiv.textContent = `發生錯誤: ${err.message}`;
        console.error("AI 查詢錯誤", err);
    })
    .finally(() => {
        sendBtn.disabled = false;
    });
});

// 5. 監聽來自 background.js 的訊息
chrome.runtime.onMessage.addListener((message) => {
    if (message.action === "showAIWindow") {
        const selectedText = message.text;
        
        // 將選取文字加入到輸入框中 (這是讓使用者編輯問題的關鍵)
        inputArea.value = selectedText; 
        outputDiv.textContent = "請編輯問題後點擊 '詢問 AI'";
        aiModal.style.display = "flex"; // 顯示視窗
    }
});
