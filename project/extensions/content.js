// ======================
// 全域變數
// ======================
let keyCount = 0;
let backspaceCount = 0;
let keyTimestamps = [];

let aiModal, inputArea, outputDiv, sendBtn, closeBtn;


// ======================
// 0. 安全的 chrome.storage.set（避免 context invalidated）
// ======================
function safeStorageSet(obj) {
    try {
        chrome.storage.local.set(obj).catch(() => {});
    } catch (e) {
        console.warn("storage.set failed (context invalidated)", e);
    }
}


// ======================
// 1. 打字偵測（Keydown）
// ======================
function keyListener(e) {
    keyCount++;
    keyTimestamps.push(Date.now());
    if (e.key === "Backspace") backspaceCount++;

    safeStorageSet({ keyCount, backspaceCount, keyTimestamps });
}

// 初始化 keyCount
chrome.storage.local.get(["keyCount", "backspaceCount", "keyTimestamps"], (data) => {
    keyCount = data.keyCount || 0;
    backspaceCount = data.backspaceCount || 0;
    keyTimestamps = data.keyTimestamps || [];

    if (keyTimestamps.length > 0) {
        if (Date.now() - keyTimestamps.at(-1) > 14400000) { // 4 小時重置
            keyTimestamps = [];
            keyCount = 0;
            backspaceCount = 0;
        }
    }

    document.addEventListener("keydown", keyListener);
});

// HackMD iframe unload 時移除事件 ———— 防止「Extension context invalidated」
window.addEventListener("unload", () => {
    document.removeEventListener("keydown", keyListener);
});


// ======================
// 2. 建立可編輯、可關閉 AI 視窗（永遠只建立一次）
// ======================
function createAIModal() {
    if (aiModal) return; // 避免重複建立

    aiModal = document.createElement("div");
    aiModal.id = "ai-modal-panel";
    aiModal.style.cssText = `
        position: fixed; top: 50px; right: 20px; width: 350px;
        max-height: 80vh; background: white; border: 1px solid #ccc;
        border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 999999; display: none; flex-direction: column; padding: 10px;
    `;

    aiModal.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center;">
            <h3 style="margin:0;font-size:1.2em;">AI 寫作助手</h3>
            <button id="ai-close-btn" style="border:none;background:none;font-size:1.5em;cursor:pointer;">&times;</button>
        </div>

        <textarea id="ai-input" style="width:100%;height:80px;margin-top:10px;padding:5px;"></textarea>

        <button id="ai-send-btn" style="
            width:100%;margin-top:8px;padding:10px;
            background:#007bff;color:white;border:none;border-radius:4px;
        ">詢問 AI</button>

        <div style="margin-top:12px;font-weight:bold;border-top:1px solid #eee;padding-top:8px;">AI 回覆：</div>
        <div id="ai-output" style="
            white-space:pre-wrap;margin-top:5px;max-height:250px;overflow-y:auto;
            border:1px solid #eee;padding:8px;border-radius:4px;background:#f9f9f9;
        ">...</div>
    `;

    document.body.appendChild(aiModal);

    inputArea = aiModal.querySelector("#ai-input");
    outputDiv = aiModal.querySelector("#ai-output");
    sendBtn = aiModal.querySelector("#ai-send-btn");
    closeBtn = aiModal.querySelector("#ai-close-btn");

    closeBtn.addEventListener("click", () => {
        aiModal.style.display = "none";
    });

    sendBtn.addEventListener("click", () => {
        const userDemand = inputArea.value.trim();
        if (!userDemand) {
            outputDiv.textContent = "請輸入問題或需求。";
            return;
        }

        outputDiv.textContent = "AI 正在思考中...";
        sendBtn.disabled = true;

        fetch("https://two025fall-computernetwork.onrender.com/ask", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: userDemand })
        })
        .then(r => r.json())
        .then(data => {
            outputDiv.textContent = data.reply || "AI 回覆錯誤";
        })
        .catch(err => {
            outputDiv.textContent = "發生錯誤：" + err.message;
        })
        .finally(() => {
            sendBtn.disabled = false;
        });
    });
}

// 初始化 UI（永遠只建立一次）
createAIModal();


// ======================
// 3. 接收 background.js 的訊息 → 彈窗 + 填入選取文字
// ======================
chrome.runtime.onMessage.addListener((message) => {
    if (message.action === "showAIWindow") {
        createAIModal(); // 確保已建立

        inputArea.value = message.text || "";
        outputDiv.textContent = "請輸入您的需求後按下「詢問 AI」";
        aiModal.style.display = "flex";
    }
});
