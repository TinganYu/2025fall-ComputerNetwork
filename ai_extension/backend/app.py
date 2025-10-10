# backend/app.py
from dotenv import load_dotenv
import os
from flask import Flask, request, jsonify
import requests
from flask_cors import CORS  # 允許前端跨來源請求

app = Flask(__name__)
CORS(app)

# 載入 .env 檔案中的變數
load_dotenv()

# 透過 os.environ 讀取變數
GROQ_API_KEY = os.environ.get("GROQ_API_KEY")

@app.route("/ask", methods=["POST"])
def ask():
    data = request.json
    user_text = data.get("text", "")
    if not user_text:
        return jsonify({"error": "Missing text"}), 400

    prompt = f"你是一位知識淺顯易懂的中文助教，請用簡短中文解釋下列問題：{user_text}"

    res = requests.post(
        "https://api.groq.com/openai/v1/chat/completions",
        headers={"Authorization": f"Bearer {GROQ_API_KEY}"},
        json={
            "model": "llama-3.1-8b-instant",
            "messages": [{"role": "user", "content": prompt}]
        },
        timeout=20
    )

    if res.status_code != 200:
        return jsonify({"error": res.text}), 500

    reply = res.json()["choices"][0]["message"]["content"]
    return jsonify({"reply": reply})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
