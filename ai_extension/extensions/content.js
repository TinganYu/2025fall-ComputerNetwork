chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "ai_helper",
    title: "用 AI 解釋選取文字",
    contexts: ["selection"]
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "ai_helper" && info.selectionText) {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: async (selectedText) => {
        const res = await fetch("https://你的後端網址/ask", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: selectedText })
        });
        const data = await res.json();
        alert("AI 回覆：" + data.reply);
      },
      args: [info.selectionText]
    });
  }
});
