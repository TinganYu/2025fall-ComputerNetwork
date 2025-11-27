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
// --- 2. 訊息接收器（放置在最頂層，確保優先註冊） ---
// 此處優先註冊，避免被後面的 UI 邏輯錯誤阻擋
chrome.runtime.onMessage.addListener((message) => {
    if (message.action === "showAIWindow") {
        // ... (這裡的邏輯需要獲取 UI 元素，所以我們需要檢查 UI 是否已初始化)
        
        // 檢查 UI 元素是否已準備好，如果還沒，就呼叫初始化函式
        if (!aiModal || aiModal.style.display === "none") {
            initializeModal(message.text); // 使用函式呼叫初始化 UI
        } else {
            // 如果已存在，直接更新狀態並顯示
            currentSelectedText = message.text; 
            inputArea.value = ""; 
            outputDiv.textContent = "請輸入您對選取內容的需求（如：提供大綱、翻譯等）";
            aiModal.style.display = "flex"; 
        }
    }
});

// --- 3. UI 初始化和事件綁定 (移入函式，並加入安全檢查) ---
let aiModal, inputArea, outputDiv, sendBtn, closeBtn;
let currentSelectedText = "";

function initializeModal(initialText) {
    if (aiModal) return; // 如果已經初始化過，則跳出

    // *** 關鍵安全檢查 ***
    if (!document.body) {
        console.error("無法找到 document.body，暫時無法注入 UI。");
        // 由於無法顯示 UI，我們在這裡停止，但訊息監聽器已經註冊了。
        return; 
    }

    // 1. 建立 UI 元素 (您的原程式碼)
    aiModal = document.createElement("div");
    // ... (您的 CSS 樣式和 innerHTML 保持不變) ...
    aiModal.innerHTML = `
        <div id="ai-modal-content">
            </div>
    `;

    document.body.appendChild(aiModal); // 只有在這裡才嘗試注入

    // 2. 獲取內部元素
    inputArea = aiModal.querySelector("#ai-input");
    outputDiv = aiModal.querySelector("#ai-output");
    sendBtn = aiModal.querySelector("#ai-send-btn");
    closeBtn = aiModal.querySelector("#ai-close-btn");

    // 3. 綁定事件 (您的原程式碼)
    closeBtn.addEventListener("click", () => { aiModal.style.display = "none"; });
    
    // 4. 綁定 AI 呼叫事件 (您的原程式碼中的 fetch 邏輯)
    sendBtn.addEventListener("click", () => {
        // ... (您的 fetch 邏輯) ...
    });
    
    // 初始化完成後顯示
    currentSelectedText = initialText; 
    inputArea.value = ""; 
    outputDiv.textContent = "請輸入您對選取內容的需求（如：提供大綱、翻譯等）";
    aiModal.style.display = "flex";
}

// 首次載入時，不必自動初始化，只需監聽訊息。
// 讓訊息接收器 (addListener) 負責在收到訊息時呼叫 initializeModal()。