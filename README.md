# 2025fall-ComputerNetwork專題

gpt暫時給我的架構

ai-extension/
│
├── backend/                 ← Flask 後端
│   ├── app.py
│   └── requirements.txt
│
└── extension/               ← Chrome 插件
    ├── manifest.json
    ├── popup.html
    ├── popup.js
    └── content.js


ai-extension/
│
├── functions/               ← Firebase Functions 目錄
│   ├── index.js             ← 你的 Function 主要程式
│   ├── package.json
│   └── node_modules/        ← npm 依賴
│
├── extension/               ← Chrome 擴充功能
│   ├── manifest.json
│   ├── popup.html
│   ├── popup.js
│   └── content.js
│
└── firebase.json            ← Firebase 設定檔

```
架構三:
project-root/
│
├── extension/
│   ├── manifest.json
│   ├── background.js
│   ├── content.js
│   ├── popup/
│   │   ├── popup.html
│   │   └── popup.js
│   ├── ui/
│   │   ├── focus-alert.html
│   │   └── focus-alert.js
│   ├── utils/
│   │   ├── storage.js   # 本地記錄/取資料
│   │   └── focusCalc.js # 專注度公式
│   └── icons/
│
├── backend/  (Render)
│   ├── index.js  # Express 主程式
│   ├── routes/
│   │   ├── ai.js         # 呼叫 OpenAI Threads
│   │   └── records.js    # 儲存/查詢使用者紀錄
│   ├── db/
│   │   └── schema.sql    # 如用 PostgreSQL
│   └── package.json
│
└── README.md
```
