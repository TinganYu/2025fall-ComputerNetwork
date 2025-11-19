let keyCount = 0;
let backspaceCount = 0;
let keyTimestamps = [];

document.addEventListener("keydown", (e) => {
  keyCount++;
  keyTimestamps.push(Date.now());
  if (e.key === "Backspace") backspaceCount++;

  // 儲存到 Chrome Storage
  chrome.storage.local.set({ keyCount, backspaceCount, keyTimestamps });
});
