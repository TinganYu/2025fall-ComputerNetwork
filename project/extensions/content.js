// ==========================
// 0. 防止 content script 被重複注入
// ==========================
if (window.__FOCUSTYPING_LOADED__) {
    console.log("[FocusTyping] content.js already loaded — skip");
    return;
}
window.__FOCUSTYPING_LOADED__ = true;

console.log("[FocusTyping] content script injected");


// ==========================
// 1. DOM Ready + iframe 修復 (for HackMD SPA)
// ==========================

function waitForDOM(callback) {
    if (document.body) return callback();
    const observer = new MutationObserver(() => {
        if (document.body) {
            observer.disconnect();
            callback();
        }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
}

waitForDOM(() => {
    console.log("[FocusTyping] DOM ready");
});


// ==========================
// 2. 安全存取 storage（避免 context invalidated）
// ==========================
async function safeStorageSet(obj) {
    try {
        chrome.storage.local.set(obj);
    } catch (err) {
        console.warn("[FocusTyping] storage.set failed — context invalidated", err);
    }
}


// ==========================
// 3. UI 元件定義
// ==========================
let aiModal, inputArea, outputDiv, sendBtn, closeBtn;
let currentSelectedText = "";


// ==========================
// 4. 接收 background 訊息（呼叫 AI 視窗）
// ==========================
chrome.runtime.onMessage.addListener((message) => {
    if (message.action === "showAIWindow") {
        if (!aiModal) {
            initializeModal(message.text);
        } else {
            currentSelectedText = message.text || "";
            inputArea.value = "";
            outputDiv.textContent = "請輸入您對選取內容的需求（如：提供大綱、翻譯等）";
            aiModal.style.display = "flex";
        }
    }
});


// ==========================
// 5. 打字偵測（已修復 hackmd reload 造成的錯誤）
// ==========================

function initTypingTracker() {
    let keyCount = 0;
    let backspaceCount = 0;
    let keyTimestamps = [];

    chrome.storage.local.get(
        ["keyCount", "backspaceCount", "keyTimestamps"],
        (data) => {
            keyCount = data.keyCount || 0;
            backspaceCount = data.backspaceCount || 0;
            keyTimestamps = data.keyTimestamps || [];

            // 超過 4 小時重置
            if (keyTimestamps.length > 0 &&
                Date.now() - keyTimestamps.at(-1) > 14400000) {
                keyTimestamps = [];
                keyCount = 0;
                backspaceCount = 0;
            }

            document.addEventListener("keydown", (e) => {
                keyCount++;
                keyTimestamps.push(Date.now());
                if (e.key === "Backspace") backspaceCount++;

                safeStorageSet({ keyCount, backspaceCount, keyTimestamps });
            });
        }
    );
}

initTypingTracker();


// ==========================
// 6. UI 視窗建立
// ==========================
function initializeModal(initialText) {
    if (aiModal) return;

    waitForDOM(() => {
        aiModal = document.createElement("div");
        aiModal.style = `
            position: fixed;
            top: 20px;
            right: 20px;
            width: 350px;
            height: 500px;
            background: white;
            border: 1px solid #ccc;
            box-shadow: 0 0 10px rgba(0,0,0,0.3);
            z-index: 999999999;
            display: flex;
            flex-direction: column;
            padding: 10px;
        `;
        
        inputArea = document.createElement("textarea");
        inputArea.style = "flex: 1; margin-bottom: 10px;";

        outputDiv = document.createElement("div");
        outputDiv.style = "flex: 1; border: 1px solid #ddd; padding: 5px; overflow-y: auto;";
        outputDiv.textContent = "請輸入您對選取內容的需求（如：提供大綱、翻譯等）";

        sendBtn = document.createElement("button");
        sendBtn.textContent = "送出";

        closeBtn = document.createElement("button");
        closeBtn.textContent = "關閉";

        const btnRow = document.createElement("div");
        btnRow.style = "display: flex; gap: 10px; margin-top: 10px;";
        btnRow.append(sendBtn, closeBtn);

        aiModal.append(inputArea, outputDiv, btnRow);
        document.body.appendChild(aiModal);

        currentSelectedText = initialText || "";

        sendBtn.onclick = () => {
            callAPI(inputArea.value);
        };

        closeBtn.onclick = () => {
            aiModal.style.display = "none";
        };
    });
}


// ==========================
// 7. 呼叫後端 API
// ==========================
async function callAPI(prompt) {
    outputDiv.textContent = "AI 正在思考中...";

    try {
        const res = await fetch("https://two025fall-computernetwork.onrender.com/focustyping", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                text: currentSelectedText,
                prompt: prompt
            })
        });

        const data = await res.json();
        outputDiv.textContent = data.response || "AI 回傳格式錯誤";
    } catch (err) {
        outputDiv.textContent = "⚠️ API 呼叫失敗";
        console.error(err);
    }
}
