# FocusTyping

FocusTyping 是一個以 Chrome 擴充功能為主要介面的智慧專注寫作助手。系統在使用者輸入文字時蒐集打字行為，依照打字速度變化、長時間停頓與刪字比例估算專注度，並在專注度偏低時提供提醒與恢復專注的選項。

除了專注度分析，FocusTyping 也提供 AI 寫作助手。使用者可以從網頁選取文字，透過右鍵選單請 AI 進行摘要、翻譯、文字潤飾，或直接輸入問題取得中文寫作建議。系統另外提供日回顧與週回顧圖表，協助使用者觀察自己的工作狀態。

## 功能

- 監測網頁中的鍵盤輸入，記錄按鍵次數、刪字次數與按鍵時間。
- 每 10 分鐘計算一次專注度分數，分數範圍為 0 至 100。
- 以打字速度變化率、長時間停頓與刪字比例作為專注度指標。
- 專注度低於門檻時顯示提醒視窗，提供專注音樂、番茄鐘、AI 寫作助手與簡單運動建議。
- 從網頁選取文字後，透過右鍵選單開啟 AI 寫作助手。
- 支援摘要、翻譯成中文與文字美化等快捷操作。
- 在擴充功能彈出視窗查看打字速度、刪字次數、停頓時間與目前專注度。
- 查看當日半小時區間與過去七天的專注度回顧。

## 系統架構

```text
Chrome Extension
├── content.js       監測打字行為、提供 AI 寫作視窗
├── background.js    排程專注度計算、同步資料、處理右鍵選單
├── popup.html/js    顯示即時統計資料
└── reminder.js      顯示低專注度提醒與恢復選單
          │
          ├── /ask
          │       Flask AI API -> Groq Chat Completions API
          │
          └── /check_id、/update_focus、/update_bias、/show_review
                  Flask 資料 API -> PostgreSQL
```


## 專案結構

```text
.
├── project/
│   ├── backend/
│   │   ├── app.py                 AI 寫作 API
│   │   ├── database.py            專注度與回顧 API
│   │   ├── requirements.txt       Python 套件清單
│   │   └── templates/
│   │       └── review_AI.html     日、週回顧圖表頁面
│   └── extensions/
│       ├── manifest.json          Chrome Extension 設定
│       ├── background.js          背景服務與專注度計算
│       ├── content.js             網頁輸入監測與 AI 介面
│       ├── popup.html              擴充功能彈出視窗
│       ├── popup.js                彈出視窗資料呈現
│       └── reminder.js             低專注度提醒視窗
└── README.md
```

## 使用擴充功能

1. 開啟 Chrome，進入 `chrome://extensions`。
2. 開啟右上角的「開發人員模式」。
3. 選擇「載入未封裝項目」，指定本專案的 `project/extensions` 資料夾。
4. 開啟一般網頁並進行輸入，即可從擴充功能圖示查看統計資料。
5. 選取網頁文字後按右鍵，可使用「送給 AI」；從右鍵選單選擇「查看回顧」可開啟圖表頁面。

首次安裝擴充功能時，背景服務會向資料服務註冊一組 UUID。使用者識別碼儲存在 Chrome Sync Storage，不需要另外建立帳號。

## 後端設定

### 安裝套件

建議使用 Python 3.10 以上版本，並在 `project/backend` 建立虛擬環境：

```bash
cd project/backend
python -m venv .venv
```

Windows PowerShell：

```powershell
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### 環境變數

在 `project/backend` 建立 `.env`，依服務填入必要設定：

```env
GROQ_API_KEY=your_groq_api_key
E_DB_URL=your_postgresql_connection_string
```

不要將 `.env` 或任何 API 金鑰提交至版本控制系統。

### 啟動服務

AI API：

```bash
python app.py
```

資料與回顧 API：

```bash
python database.py
```

兩個服務預設都使用 `5000` 埠，因此本機測試時需要分別配置埠號，或一次只啟動其中一個服務。正式部署可使用 Gunicorn，例如：

```bash
gunicorn app:app
gunicorn database:app
```

### Render 部署

本專題原先部署於 Render，分成兩個 Web Service：

| Service | 程式 | 用途 | 必要環境變數 |
| --- | --- | --- | --- |
| AI 服務 | `app.py` | AI 寫作助手與運動建議 | `GROQ_API_KEY` |
| 資料服務 | `database.py` | 使用者、專注度與回顧資料 | `E_DB_URL` |

兩個 Service 的 Root Directory 都指向 `project/backend`，Build Command 都可使用：

```bash
pip install -r requirements.txt
```

Start Command 分別設定為：

```bash
# AI 服務
gunicorn app:app

# 資料服務
gunicorn database:app
```

Render 會提供 HTTPS 網址，擴充功能目前透過 `content.js` 與 `background.js` 中的網址連線至這兩個服務。若重新建立 Render Service 或更換網址，必須同步更新擴充功能程式中的 API URL，重新載入擴充功能後才會套用變更。

資料服務需要 PostgreSQL 中存在 `users`、`daily` 與 `weekly` 資料表。`daily` 用於儲存時段專注度，`weekly` 用於儲存每日平均專注度，`users` 則儲存使用者識別碼與個人偏置值。

## API 概要

| 方法 | 路徑 | 用途 |
| --- | --- | --- |
| `POST` | `/ask` | 傳送文字給 Groq，取得 AI 回覆 |
| `POST` | `/check_id` | 檢查或建立使用者識別碼 |
| `POST` | `/update_focus` | 儲存指定時段的專注度 |
| `POST` | `/update_bias` | 更新使用者專注度偏置值 |
| `GET` | `/show_review` | 產生日回顧與週回顧頁面 |

## 技術使用

- Chrome Extension Manifest V3
- JavaScript
- Python、Flask、Flask-CORS
- PostgreSQL、psycopg2
- Groq API
- Chart.js
- Render

## 注意事項

- 目前擴充功能的 API 網址寫在前端程式中；若改用本機或其他部署環境，需同步修改 `content.js`、`background.js` 與相關請求網址。
- Chrome 的內容腳本受網頁本身結構與權限限制，部分線上編輯器可能無法完整取得輸入事件。
- 專注度是依打字行為推估的指標，不能視為生理或醫療測量結果。
