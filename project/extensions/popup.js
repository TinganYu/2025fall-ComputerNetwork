//打字相關資訊呈現
chrome.storage.local.get(["keyCount", "backspaceCount", "keyTimestamps"], (data) => {
    const keyCount = data.keyCount || 0;
    const backspaceCount = data.backspaceCount || 0;
    const keyTimestamps = data.keyTimestamps || [];
    let wpm = 0;
    if (keyTimestamps.length >= 2) {
        const durationMinutes = (keyTimestamps.at(-1) - keyTimestamps[0]) / 60000; //總共經過幾分鐘
        wpm = Math.round(keyCount / 5 / durationMinutes);
    }
    document.getElementById("Displaywpm").textContent = wpm;
    document.getElementById("DisplaybackspaceCount").textContent = backspaceCount;
});