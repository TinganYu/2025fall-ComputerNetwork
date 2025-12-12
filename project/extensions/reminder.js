// ------ 防止重複注入 ------
if (window.__FOCUS_FLOATING_WINDOW_INIT__) {
    console.log("floating window already injected, skip");
} else {
    window.__FOCUS_FLOATING_WINDOW_INIT__ = true;

    const floatingWindow = document.createElement('div');
    const shadow = floatingWindow.attachShadow({ mode: "open" });
    floatingWindow.id = 'reminder-window';

    document.body.appendChild(floatingWindow);

    const overlay = document.createElement('div');
    overlay.id = 'floating-overlay';
    overlay.style.display = "block";

    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0,0,0,0.5); /* 半透明灰 */
        z-index: 999998; /* 比浮窗低 */
    `;

    document.body.appendChild(overlay);

    // 兩個 container
    const reminderContainer = document.createElement('div');
    reminderContainer.innerHTML = `
    <style>
        #main {
            all: initial;
            position: fixed;
            width: 250px;
            padding: 10px;
            top: calc(50% - 50px);
            left: calc(50% - 125px);
            font-family: sans-serif;
            background: white;
            border: 1px solid #ddd;
            box-shadow: 0 4px 10px rgba(0,0,0,0.15);
            z-index: 999999;
        }
    </style>

    <div id="main">
        <button id="closeWindow" style="
                position: absolute; top: 3px; right: 3px;
                border: none; background: none; font-size: 16px; cursor: pointer; color: #666666;
            ">✕</button>
        <div style="text-align:center ;margin:0 0 10px 0; text-align: center; font-size:20px; font-weight: bold;">
            <label>噢！你似乎有點分心囉</label><br>
            <label>休息一下，繼續努力！</label><br>
        </div>
        <div style="text-align: center; padding-left: -10px;">
            <input type="checkbox" id="user_response" style="position: relative; transform: translate(-50%, 25.5%);"/>
            <label for="user_response" style="font-size:12px; color: #666666; margin-left: -5px;">沒有分心嗎？點擊勾選以回報</label>
        </div>
    </div>
`;
    shadow.appendChild(reminderContainer);
    
    //協助恢復的選單!
    const recoveryContainer = document.createElement('div'); 
    recoveryContainer.style.display = "none"; // 初始隱藏
    recoveryContainer.innerHTML = `
        <style> /* recovery CSS */ #main{all:initial;position:fixed;width:320px;padding:15px;top:calc(50% - 150px);left:calc(50% - 160px);font-family:sans-serif;background:white;border:1px solid #ddd;box-shadow:0 4px 15px rgba(0,0,0,0.2);z-index:999999;border-radius:8px;} .menu-btn{display:block;width:100%;padding:10px 15px;margin-bottom:8px;background:#f8f9fa;color:#495057;border:1px solid #ced4da;border-radius:4px;cursor:pointer;font-size:16px;text-align:left;} .menu-btn:last-child{margin-top:15px;background:#dc3545;color:white;} .title{text-align:center;margin-bottom:20px;font-size:20px;font-weight:bold;color:#343a40;} </style>
        <div id="main">
            <div class="title">是否需要提升專注? 選取以下功能協助</div>
            <button id="music-btn" class="menu-btn">🎧 播放專注音樂 (YouTube)</button>
            <button id="pomodoro-btn" class="menu-btn">🍅 使用番茄鐘</button>
            <button id="assist-btn" class="menu-btn">💡 開啟AI寫作助手</button>
            <button id="exercise-btn" class="menu-btn">🏃 AI 運動建議 (稍等幾秒)</button>
            <button id="close-menu-btn" class="menu-btn">❌ 關閉選單，繼續寫作</button>
        </div>
    `;
    shadow.appendChild(recoveryContainer);

    // 監聽
    reminderContainer.querySelector("#closeWindow").addEventListener("click", () => {
        const userCbox = reminderContainer.querySelector("#user_response");
        if (userCbox?.checked) {
            chrome.storage.sync.get(["bias"], (data) => {
                chrome.storage.sync.set({ bias: (data.bias || 0) + 1 });    //增加量待調整?
                //database update bias
            });
        }
        showRecoveryMenu();
    });

    // Recovery menu 按鈕
    const menuClose = () => {
        reminderContainer.style.display = "none";
        recoveryContainer.style.display = "none";
        overlay.style.display = "none";
    };

    recoveryContainer.querySelector("#music-btn").addEventListener("click", () => {
        window.open("https://www.youtube.com/results?search_query=focus+music+no+ads+studying", "_blank");
        menuClose();
    });
    recoveryContainer.querySelector("#pomodoro-btn").addEventListener("click", () => {
        window.open("https://pomofocus.io/", "_blank");
        menuClose();
    });
    recoveryContainer.querySelector("#assist-btn").addEventListener("click", () => {
        window.top.postMessage({ action: "showAIWindow-forward", text: "" }, "*");
        menuClose();
    });
    recoveryContainer.querySelector("#exercise-btn").addEventListener("click", () => {
        const now = new Date();
        const timeStr = now.toLocaleTimeString();
        chrome.storage.local.get(["keyTimestamps"], (data) => {
            const timestamps = data.keyTimestamps || [];
            const lastTyping = timestamps.length ? timestamps.at(-1) : Date.now();  //取得打多久的時間
            const focusDurationMs = Date.now() - lastTyping;
            const focusDurationMin = Math.floor(focusDurationMs / 60000);
            console.log("距離上次打字時間:", focusDurationMin, "分鐘");
                const prompt = `現在時間是 ${timeStr}，我已經專注工作${focusDurationMin} 分鐘。請給我一個簡單運動建議。`;
                fetch("https://two025fall-computernetwork.onrender.com/ask", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ text: prompt })
                })
                .then(r => r.json())
                .then(data => {
                    alert(data.reply || "AI 回覆錯誤");
                    menuClose(); // 等 AI 回覆後再關閉浮窗
                })
                .catch(err => {
                    alert(`發生錯誤: ${err.message}`);
                    menuClose();
                });
        });
    });
    recoveryContainer.querySelector("#close-menu-btn").addEventListener("click", menuClose);

    function showReminderWindow() {
        reminderContainer.style.display = "block";
        recoveryContainer.style.display = "none";
        overlay.style.display = "block";
    }

    function showRecoveryMenu() {
        reminderContainer.style.display = "none";
        recoveryContainer.style.display = "block";
        overlay.style.display = "block";
    }

    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
        if (msg && msg.action === "showWindow") {
            showReminderWindow();
            sendResponse({ exists: true });
        }
    });
}
