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
