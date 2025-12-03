//處理停頓時間指標 TODO 要記恍神次數嗎？ 
const LONG_PAUSE_THRESHOLD = 60000 //停1min才算停頓時間(盡量讓思考時間不會被記錄)
function analyzePauseTime(timestamps) {
    if (timestamps.length < 2) { 
        return 0;
    }
    let totalPauseTime = 0;
    for (let i = 1; i < timestamps.length; i++) {
        const interval = timestamps[i] - timestamps[i - 1]; //停頓時間
        if (interval > LONG_PAUSE_THRESHOLD) { //超過閾值，才累積到總暫停時間
            totalPauseTime += interval; 
        }
    }
    return totalPauseTime;
}
const CALCULATE_INTERVAL = 600000 //多久算一次專注度->10 mins
let LAST_CALCULATE_FOCUS = //上次算專注度的時間
function calculate_focus(){
    //指標：打字速度變化率、停頓時間、錯字率(backspaceCount/(backspaceCount+keyCount))
}

function openReminder(){    //開啟專注度低跳提醒
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        let tab = tabs[0];
        chrome.runtime.sendMessage({ action: "openReminder" ,tab: tab});
    });
}

openReminder();

//打字相關資訊呈現
chrome.storage.local.get(["keyCount", "backspaceCount", "keyTimestamps"], (data) => {
    const keyCount = data.keyCount || 0;
    const backspaceCount = data.backspaceCount || 0;
    const keyTimestamps = data.keyTimestamps || [];
    let totalPauseTime = analyzePauseTime(keyTimestamps)
    let wpm = 0; //word per min
    if (keyTimestamps.length >= 2) {
        const durationMinutes = (keyTimestamps.at(-1) - keyTimestamps[0]) / 60000; //總共經過幾分鐘
        wpm = Math.round(keyCount / 5 / durationMinutes);  //默認按五次鍵盤=1個字
    }
    if(keyTimestamps.at(-1) - LAST_CALCULATE_FOCUS > CALCULATE_INTERVAL){// 上一次算專注度距離現在已經超過CALCULATE_INTERVAL
        calculate_focus(/*TODO*/);
        LAST_CALCULATE_FOCUS = keyTimestamps.at(-1);
    }
    document.getElementById("Displaywpm").textContent = wpm;
    document.getElementById("DisplaybackspaceCount").textContent = backspaceCount;
    totalPauseTime = Math.floor(totalPauseTime / 60000);
    document.getElementById("DisplayPauseTime").textContent = totalPauseTime;
});