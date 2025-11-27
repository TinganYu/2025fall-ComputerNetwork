let aiModal, inputArea, outputDiv, sendBtn, closeBtn;
let currentSelectedText = "";

// 1. 訊息接收器 (TOP PRIORITY)
chrome.runtime.onMessage.addListener((message) => {
    if (message.action === "showAIWindow") {
        if (!aiModal) {
            initializeModal(message.text);
        } else {
            currentSelectedText = message.text;
            inputArea.value = "";
            outputDiv.textContent = "請輸入您對選取內容的需求（如：提供大綱、翻譯等）";
            aiModal.style.display = "flex";
        }
    }
});


// 2. 打字偵測邏輯
let keyCount = 0
let backspaceCount = 0;
let keyTimestamps = [];

chrome.storage.local.get(["keyCount", "backspaceCount", "keyTimestamps"], (data) => {
    keyCount = data.keyCount || 0;
    backspaceCount = data.backspaceCount || 0;
    keyTimestamps = data.keyTimestamps || [];
    if(keyTimestamps.length > 0){
        if(Date.now() - keyTimestamps.at(-1) > 14400000){
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


// 3. UI 初始化和事件綁定 (只有在收到訊息時才執行)
function initializeModal(initialText) {
    if (aiModal) return;

    if (!document.body) {
        console.error("無法找到 document.body，暫時無法注入 UI。");
        return;
    }

    // A. 建立 UI 元素
    aiModal = document.createElement("div");
    aiModal.id = "ai-modal-panel"; 
    aiModal.style.cssText = `
        position: fixed; top: 50px; right: 20px; width: 350px; 
        max-height: 80vh; background: white; border: 1px solid #ccc;
        border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 10000; display: none; flex-direction: column; padding: 10px;
    `;
    aiModal.innerHTML = `
        <div id="ai-modal-content">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <h3 style="margin: 0; font-size: 1.2em;">AI 寫作助手</h3>
                <button id="ai-close-btn" style="border: none; background: none; font-size: 1.5em; cursor: pointer;">&times;</button>
            </div>
            <textarea id="ai-input" style="width: 100%; height: 60px; margin-bottom: 10px; padding: 5px; box-sizing: border-box;" placeholder="輸入您的需求..."></textarea>
            <button id="ai-send-btn" style="width: 100%; padding: 8px; background-color: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">詢問 AI</button>
            <div style="margin-top: 15px; font-weight: bold; padding-top: 5px; border-top: 1px solid #eee;">AI 回覆:</div>
            <div id="ai-output" style="white-space: pre-wrap; margin-top: 5px; max-height: 250px; overflow-y: auto; border: 1px solid #eee; padding: 10px; border-radius: 4px; background-color: #f9f9f9;">...</div>
        </div>
    `;
    document.body.appendChild(aiModal);

    // B. 獲取內部元素
    inputArea = aiModal.querySelector("#ai-input");
    outputDiv = aiModal.querySelector("#ai-output");
    sendBtn = aiModal.querySelector("#ai-send-btn");
    closeBtn = aiModal.querySelector("#ai-close-btn");

    // C. 綁定關閉事件
    closeBtn.addEventListener("click", () => {
        aiModal.style.display = "none";
    });

    // D. 綁定 AI 呼叫事件 (fetch 邏輯)
    sendBtn.addEventListener("click", () => {
        const userDemand = inputArea.value;
        if (!userDemand) {
            outputDiv.textContent = "請輸入問題或需求。";
            return;
        }

        const fullTextForAI = `選取的文件內容為：【${currentSelectedText}】。\n\n我的需求是：${userDemand}`;

        outputDiv.textContent = "AI 正在思考中...";
        sendBtn.disabled = true;

        fetch("https://two025fall-computernetwork.onrender.com/ask", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: fullTextForAI })
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

    // E. 顯示面板
    currentSelectedText = initialText;
    inputArea.value = "";
    outputDiv.textContent = "請輸入您對選取內容的需求（如：提供大綱、翻譯等）";
    aiModal.style.display = "flex";
}