// Simple, robust content script for testing and modal UI
if (window.__FOCUSTYPING_LOADED__) {
  console.log("[FocusTyping] already loaded");
} else {
  window.__FOCUSTYPING_LOADED__ = true;

  (function () {
    console.log("[FocusTyping] content.js start");

    // global safe wrapper for storage
    function safeStorageSet(obj) {
      try {
        chrome.storage.local.set(obj);
      } catch (e) {
        console.warn("[FocusTyping] storage.set failed:", e && e.message);
      }
    }

    // simple typing tracker (non-intrusive)
    let keyCount = 0
    let backspaceCount = 0;
    let keyTimestamps = []; //每次按按鍵的時間

    chrome.storage.local.get(["keyCount", "backspaceCount", "keyTimestamps"], (data) => {
      keyCount = data.keyCount || 0;
      backspaceCount = data.backspaceCount || 0;
      keyTimestamps = data.keyTimestamps || []; 
      if (keyTimestamps.length > 0) {
        if (Date.now() - keyTimestamps.at(-1) > 14400000) {
          keyTimestamps = [];
          keyCount = 0;
          backspaceCount = 0;
        }
      }

      // 🔥 這段絕對要放在（iframe 的 content script 裡）
      document.addEventListener("keydown", (e) => {
        keyCount++;
        keyTimestamps.push(Date.now()); 
        if (e.key === "Backspace") backspaceCount++;
        chrome.storage.local.set({keyCount, backspaceCount, keyTimestamps});
      });
    });

    // ---------- Modal UI (simple, draggable) ----------
    let aiModal = null, inputArea = null, outputDiv = null, sendBtn = null, closeBtn = null;
    let currentSelectedText = "";

    function createModal(initialText) {
      if (aiModal) return; // already
      // basic DOM ready guard
      if (!document.body) {
        console.warn("[FocusTyping] document.body not ready - retry shortly");
        setTimeout(() => createModal(initialText), 100);
        return;
      }

      aiModal = document.createElement("div");
      aiModal.id = "ft-ai-modal";
      aiModal.style.cssText = "position:fixed;bottom:20px;right:20px;width:360px;background:#fff;border:1px solid #ddd;padding:10px;box-shadow:0 4px 12px rgba(0,0,0,0.12);z-index:9999999;border-radius:6px;display:none;";

      // header (drag)
      const header = document.createElement("div");
      header.style.cssText = "display:flex;justify-content:space-between;align-items:center;cursor:move;padding-bottom:6px";
      const title = document.createElement("div"); title.textContent = "AI 寫作助手"; title.style.fontWeight="600";
      closeBtn = document.createElement("button"); closeBtn.textContent = "✕"; closeBtn.style.border="none"; closeBtn.style.background="none"; closeBtn.style.cursor="pointer";
      header.appendChild(title); header.appendChild(closeBtn);

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
      aiModal.appendChild(inputArea);
      aiModal.appendChild(sendBtn);
      aiModal.appendChild(outputDiv);
      document.body.appendChild(aiModal);

      // handlers
      closeBtn.addEventListener("click", () => aiModal.style.display = "none");
      sendBtn.addEventListener("click", () => {
        const txt = inputArea.value.trim();
        if (!txt) { outputDiv.textContent = "請輸入問題"; return; }
        outputDiv.textContent = "AI 正在思考中...";
        sendBtn.disabled = true;

        fetch("https://two025fall-computernetwork.onrender.com/ask", {
          method: "POST",
          headers: {"Content-Type":"application/json"},
          body: JSON.stringify({ text: txt })
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

      makeDraggable(aiModal, header);

      // fill initial
      if (initialText) inputArea.value = initialText;
    }

    // draggable helper
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

    // background -> content message
    chrome.runtime.onMessage.addListener((msg) => {
      if (msg && msg.action === "showAIWindow") {
        // ensure modal exists and show
        try {
          createAndShow(msg.text || "");
        } catch (e) {
          console.error("[FocusTyping] show error", e);
        }
      }
    });

    function createAndShow(initialText) {
      if (!aiModal) createModal(initialText);
      else if (inputArea) inputArea.value = initialText || "";
      if (aiModal) {
        aiModal.style.display = "block";
        if (inputArea && (!inputArea.value || inputArea.value.trim() === "")) inputArea.value = initialText || "";
        if (outputDiv) outputDiv.textContent = "請編輯問題後按「詢問 AI」";
      }
    }

    // quick test: log alive
    console.log("[FocusTyping] ready");
  })();
}
