const floatingWindow = document.createElement('div');
floatingWindow.id = 'reminder-window';

floatingWindow.style.cssText = `
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
`;

floatingWindow.innerHTML = `
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
`;

document.body.appendChild(floatingWindow);

const overlay = document.createElement('div');
overlay.id = 'floating-overlay';

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

const closeBtn = floatingWindow.querySelector("#closeWindow");
closeBtn.addEventListener("click", () => {
    const UserCbox = floatingWindow.querySelector("#user_response");
    if(UserCbox.checked){
        // 紀錄User沒有不專注
    }
    floatingWindow.style.display = "none";
    overlay.style.display = "none";
});