// // popup.js
// let selectedText = "";

// // 監聽 content.js 傳來的文字
// chrome.runtime.onMessage.addListener((message) => {
//   if (message.text) {
//     selectedText = message.text;
//     document.getElementById("selectedText").textContent = selectedText;
//   }
// });

// // 按鈕送出
// document.getElementById("sendBtn").addEventListener("click", () => {
//   if (!selectedText) return alert("請先選文字");

//   fetch("https://two025fall-computernetwork.onrender.com/askAI", {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify({ text: selectedText })
//   })
//   .then(res => res.json())
//   .then(data => {
//     if (data.reply) {
//       document.getElementById("result").textContent = data.reply;
//     } else {
//       console.error(data.error);
//     }
//   })
//   .catch(err => console.error(err));
// });

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