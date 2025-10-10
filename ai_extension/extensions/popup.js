document.getElementById("sendBtn").addEventListener("click", async () => {
  const text = document.getElementById("input").value.trim();
  if (!text) return alert("請輸入文字！");

  document.getElementById("output").innerText = "正在思考中...";

  try {
    const res = await fetch("https://你的後端網址/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });

    const data = await res.json();
    document.getElementById("output").innerText = data.reply || data.error;
  } catch (err) {
    document.getElementById("output").innerText = "連線錯誤：" + err;
  }
});
