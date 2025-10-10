chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "askAI",
    title: "送給 AI",
    contexts: ["selection"] // 只在選取文字時顯示
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "askAI" && info.selectionText) {
    fetch("https://two025fall-computernetwork.onrender.com/askAI", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: info.selectionText })
    })
    .then(res => res.json())
    .then(data => {
      alert(data.reply);
    })
    .catch(err => console.error(err));
  }
});
