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
