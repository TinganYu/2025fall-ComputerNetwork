chrome.storage.local.get(["keyCount", "backspaceCount", "keyTimestamps"], (data) => {
  const keyCount = data.keyCount || 0;
  const backspaceCount = data.backspaceCount || 0;
  const keyTimestamps = data.keyTimestamps || [];

  let wpm = 0;
  if (keyTimestamps.length >= 2) {
    const durationMinutes = (keyTimestamps.at(-1) - keyTimestamps[0]) / 60000;
    wpm = Math.round(keyCount / 5 / durationMinutes);
  }

  let stress = "高";
  if (wpm < 20 && backspaceCount > 5) stress = "低";
  else if (wpm < 30) stress = "中";

  document.getElementById("status").textContent =
    `每分鐘字數：${wpm}\n刪除鍵次數：${backspaceCount}\n專注等級：${stress}`;
});
