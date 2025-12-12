const QUICK_PROMPTS = {
    summarize: "請將下列選取的內容，用簡潔、清晰的中文進行摘要及文章重點。",
    translate: "請將下列選取的內容，翻譯成流暢的中文。",
    beautify: "請檢查下列選取的內容的語法和詞彙，並將其潤飾美化，使語言更專業流暢。",
};
//監聽打字(目前測試：gemini、hackmd、colab讀的到，google doc、word線上版讀不到)
let keyCount = 0
let backspaceCount = 0;
let keyTimestamps = []; //每次按按鍵的時間

chrome.storage.local.get(["keyCount", "backspaceCount", "keyTimestamps"], (data) => {//繼承之前/其他網站的行為資料
  keyCount = data.keyCount || 0;
  backspaceCount = data.backspaceCount || 0;
  keyTimestamps = data.keyTimestamps || []; 
  /* 超時歸零功能有問題，先不做了
  if(keyTimestamps.length >= 2){
    if(Date.now() - keyTimestamps.at(-1) > 10000){ //14400000 ms = 4hr沒打字就重置(長期專注度記錄再另外放在後端)
      keyTimestamps = [];
      keyCount = 0;
      backspaceCount = 0;
      chrome.storage.local.set({keyCount, backspaceCount, keyTimestamps});
    }
  }
  */
  document.addEventListener("keydown", (e) =>{ //監聽是否按按鍵

    if (e.key === "Backspace") {
      backspaceCount++;
      //keyTimestamps.push(Date.now()); 
    }
    else{ //刪字不算在打字裡面
      keyCount++;
      keyTimestamps.push(Date.now()); 
    }
    chrome.storage.local.set({keyCount, backspaceCount, keyTimestamps});
  });
});


// ---------- AI Modal part ----------

if (window.__FOCUSTYPING_LOADED__) {
  console.log("[FocusTyping] already loaded");
} else {
  window.__FOCUSTYPING_LOADED__ = true;

  (function () {
    console.log("[FocusTyping] content.js start");

    let modalShown = false;
    function createAndShow(initialText) {  //生出頁面
      if (!aiModal) createModal(initialText);
      else if (inputArea) inputArea.value = initialText || "";
      if (modalShown) return;   // 防止重複
      modalShown = true;
      if (aiModal) {
        aiModal.style.display = "block";
        if (inputArea && (!inputArea.value || inputArea.value.trim() === "")) inputArea.value = initialText || "";
        if (outputDiv) outputDiv.textContent = "請編輯問題後按「詢問 AI」";
      }
    }

    // ---------- Modal UI ----------
    let container = null, shadow = null;
    let aiModal = null, inputArea = null, outputDiv = null, sendBtn = null, closeBtn = null;

    function createModal(initialText) {
      if (aiModal) return; // already
      if (!document.body) {
        console.warn("[FocusTyping] document.body not ready - retry shortly");
        setTimeout(() => createModal(initialText), 100);
        return;
      }

      // 建立 container 與 shadow root
      container = document.createElement("div");
      container.id = "ft-ai-container";
      shadow = container.attachShadow({ mode: "open" });
      document.body.appendChild(container);

      // style 隔離字體
      const style = document.createElement("style");
      style.textContent = `
        #ft-ai-modal {
          position: fixed;
          bottom: 20px;
          right: 20px;
          width: 360px;
          background: #fff;
          border: 1px solid #ddd;
          padding: 10px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.12);
          z-index: 9999999;
          border-radius: 6px;
          font-family: "Noto Sans TC", sans-serif;
        }
        #ft-ai-modal button { font-family: inherit; }
        #ft-ai-modal textarea { font-family: inherit; }
        #ft-ai-modal div { font-family: inherit; }
      `;
      shadow.appendChild(style);

      // main modal
      aiModal = document.createElement("div");
      aiModal.id = "ft-ai-modal";
      aiModal.style.display = "none";

      // header (drag)
      const header = document.createElement("div");
      header.style.cssText = "display:flex;justify-content:space-between;align-items:center;cursor:move;padding-bottom:6px";
      const title = document.createElement("div"); title.textContent = "AI 寫作助手"; title.style.fontWeight="600";
      closeBtn = document.createElement("button"); closeBtn.textContent = "✕"; closeBtn.style.border="none"; closeBtn.style.background="none"; closeBtn.style.cursor="pointer";
      header.appendChild(title); header.appendChild(closeBtn);

      // 快捷按鈕容器
      const quickButtonsDiv = document.createElement("div");
      quickButtonsDiv.style.cssText = "display:flex; justify-content:space-between; margin-top:8px; margin-bottom:10px;";

      const buttonNames = ["摘要", "翻譯成中文", "美化"];
      const buttonActions = ["summarize", "translate", "beautify"];

      buttonNames.forEach((name, index) => {
          const btn = document.createElement("button");
          btn.textContent = name;
          btn.setAttribute('data-action', buttonActions[index]); // 設置動作標籤
          btn.style.cssText = "padding:6px 8px; flex-grow:1; margin-right:5px; background:#e9ecef; color:#343a40; border:1px solid #ced4da; border-radius:4px; cursor:pointer; font-size:0.9em;";
          if (index === buttonNames.length - 1) btn.style.marginRight = "0"; // 最後一個按鈕移除右邊距
          
          quickButtonsDiv.appendChild(btn);
      });

      inputArea = document.createElement("textarea");
      inputArea.style.cssText = "width:100%;height:80px;box-sizing:border-box;padding:6px;margin-top:6px";
      inputArea.placeholder = "輸入您的問題...";

      sendBtn = document.createElement("button");
      sendBtn.textContent = "詢問 AI";
      sendBtn.style.cssText = "width:100%;padding:8px;margin-top:8px;background:#007bff;color:#fff;border:none;border-radius:4px;cursor:pointer";

      outputDiv = document.createElement("div");
      outputDiv.style.cssText = "white-space:pre-wrap;margin-top:10px;max-height:200px;overflow:auto;border:1px solid #eee;padding:8px;border-radius:4px;background:#fafafa";
      outputDiv.textContent = "...";

      aiModal.appendChild(header);
      aiModal.appendChild(quickButtonsDiv);
      aiModal.appendChild(inputArea);
      aiModal.appendChild(sendBtn);
      aiModal.appendChild(outputDiv);
      shadow.appendChild(aiModal);

      // handlers
      closeBtn.addEventListener("click", () => {aiModal.style.display = "none"; modalShown = false;});
      sendBtn.addEventListener("click", () => {
        const currentSelectedText = inputArea.value.trim();
        if (!currentSelectedText) { outputDiv.textContent = "請輸入問題"; return; }
        outputDiv.textContent = "AI 正在思考中...";
        sendBtn.disabled = true;

        fetch("https://two025fall-computernetwork.onrender.com/ask", {
          method: "POST",
          headers: {"Content-Type":"application/json"},
          body: JSON.stringify({ text: currentSelectedText })
        })
        .then(r => r.json().catch(()=>{}))
        .then(data => {
          console.log("[FocusTyping] backend data:", data);
          const text = (data && (data.reply || data.response || data.result || data.text)) || "AI 回傳格式錯誤";
          outputDiv.textContent = text;
        })
        .catch(err => {
          outputDiv.textContent = `發生錯誤: ${err.message}`;
          console.error(err);
        })
        .finally(()=> sendBtn.disabled = false);
      });

      // 快捷按鈕專門的監聽器
      quickButtonsDiv.querySelectorAll('button').forEach(btn => {
          btn.addEventListener('click', () => {
              const action = btn.getAttribute('data-action');
              const promptTemplate = QUICK_PROMPTS[action];
              const currentSelectedText = inputArea.value.trim();
              if (!currentSelectedText) {
                  outputDiv.textContent = "請先選取您要處理的文字。";
                  return;
              }

              // 組合 Prompt: 系統模板 + 選取內容
              const fullTextForAI = `${promptTemplate}\n\n選取的內容：【${currentSelectedText}】`;

              // 執行自動 Fetch
              autoFetchAI(fullTextForAI);
          });
      });

      makeDraggable(aiModal, header);

      // 把反白文字放入
      if (initialText) inputArea.value = initialText;
    }

    // 輔助函式：用於處理快捷按鈕的 Fetch 請求
    function autoFetchAI(fullTextForAI) {
        // 設置狀態
        outputDiv.textContent = "AI 正在思考中...";
        sendBtn.disabled = true; 
        
        // 將所有快捷按鈕禁用，避免重複點擊
        const quickButtons = aiModal.querySelectorAll('[data-action]');
        quickButtons.forEach(b => b.disabled = true);

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
            quickButtons.forEach(b => b.disabled = false); // 啟用所有按鈕
        });
    }

    // 讓他可以拖曳的輔助功能
    function makeDraggable(el, handle) {
      let down = false, sx=0, sy=0, left=0, top=0;
      handle.addEventListener("mousedown", (e) => {
        down = true;
        sx = e.clientX; sy = e.clientY;
        const r = el.getBoundingClientRect();
        left = r.left; top = r.top;
        // switch to absolute positioning
        el.style.right = "auto"; el.style.bottom = "auto";
        el.style.left = left + "px"; el.style.top = top + "px";
        document.addEventListener("mousemove", onMove);
        document.addEventListener("mouseup", onUp);
      });
      function onMove(e) {
        if (!down) return;
        const dx = e.clientX - sx; const dy = e.clientY - sy;
        el.style.left = (left + dx) + "px";
        el.style.top = (top + dy) + "px";
      }
      function onUp() {
        if (!down) return;
        down = false;
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
      }
    }

    chrome.runtime.onMessage.addListener((msg) => {
      if (msg && msg.action === "showAIWindow") {
        if (window !== window.top) {
          window.top.postMessage({
            action: "showAIWindow-forward",
            text: msg.text || ""
          }, "*");
          return;
        }
        createAndShow(msg.text || "");
      }    
    });
    window.addEventListener("message", (event) => {
      if (event.data?.action === "showAIWindow-forward") {
        console.log("[Forward] Received in top frame");
        createAndShow(event.data.text || "");
      }
    });

    console.log("[FocusTyping] ready");
  })();
};
