//處理停頓時間指標 
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

//打字相關資訊呈現
function updateDisplay() {
    chrome.storage.local.get(["keyCount", "backspaceCount", "keyTimestamps", "last_focus_score"], (data) => {
        const keyCount = data.keyCount || 0;
        const backspaceCount = data.backspaceCount || 0;
        const keyTimestamps = data.keyTimestamps || [];
        let totalPauseTime = analyzePauseTime(keyTimestamps)
        let wpm = 0; //word per min
        if (keyTimestamps.length >= 2) {
            const durationMinutes = Math.max(1,(keyTimestamps.at(-1) - keyTimestamps[0]) / 60000); //總共經過幾分鐘
            wpm = Math.round(keyCount / durationMinutes);
        }
        document.getElementById("Displaywpm").textContent = wpm;
        document.getElementById("DisplaybackspaceCount").textContent = backspaceCount;
        totalPauseTime = Math.floor(totalPauseTime / 60000);
        document.getElementById("DisplayPauseTime").textContent = totalPauseTime;

        const focusScore = data.last_focus_score || "N/A";
        document.getElementById("DisplayFocusScore").textContent = focusScore;
    });
}

updateDisplay();

//測試用
function openReminder(){
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        let tab = tabs[0];
        chrome.runtime.sendMessage({ action: "openReminder" ,tab: tab});
    });
}
openReminder();