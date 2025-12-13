from dotenv import load_dotenv
import os
from flask import Flask, request, jsonify, render_template
import math
from flask_cors import CORS
import psycopg2

app = Flask(__name__)
CORS(app)

load_dotenv()
DB_URL = os.environ.get("E_DB_URL")

'''
database 中 有 trigger
會在每次上傳 focus 時，即時更新今日目前的平均專注度
並刪除今日前的 focus 資料

database error 請回報到群組，能附上時間最好
'''
from datetime import datetime, timezone, timedelta

@app.route("/update_focus", methods=["POST"])   # 上傳專注度
def update_focus():
    data = request.json
    now_ms = data.get("now", "")
    now_ms += 8 * 60 * 60 * 1000    # UTC+8
    print("time:",datetime.fromtimestamp(now_ms / 1000, tz=timezone(timedelta(hours=8))))
    print("ms:",now_ms)
    now_ms -= 1000  # 避免延遲影響計算
    now_ms = math.ceil(now_ms / (1000 * 60 * 30))
    focus = data.get("focus", "")
    user_id = data.get("id", "")
    
    try:
        with psycopg2.connect(DB_URL) as conn:
            with conn.cursor() as cur:
                command = "SELECT * FROM daily WHERE id = %s AND \"Timestamps\" = %s"
                cur.execute(command, (user_id,now_ms))
                row = cur.fetchone()
                if row:
                    focus = (focus + row[2]) / (row[3] + 1)
                    command = "UPDATE daily SET focus = %s, merge = %s WHERE id = %s AND \"Timestamps\" = %s"
                    cur.execute(command, (focus,row[3]+1,user_id,now_ms))
                else:
                    command = "INSERT INTO daily (id, \"Timestamps\", focus, merge) VALUES (%s, %s, %s, %s)"
                    cur.execute(command, (user_id,now_ms,focus,1))
                conn.commit()
        return jsonify({"log": "update focus success"})
    except Exception as e:
        print("Database error:", e)
        return jsonify({"error": "Database error"}), 500
    
@app.route("/show_review", methods=["GET"]) #顯示日回顧跟周回顧
def show_review():
    now_ms = int(request.args.get('now'))
    now_ms += 8 * 60 * 60 * 1000    # UTC+8
    now_ms -= 1000  # 避免延遲影響計算
    now_day = math.floor((math.ceil(now_ms / (1000 * 60 * 30)) -1) / 48)
    user_id = request.args.get('id')
    if not user_id or not now_ms:
        print(request)
        return jsonify({"error": "Request error"}), 400
    
    try:
        with psycopg2.connect(DB_URL) as conn:
            with conn.cursor() as cur:
                command = "SELECT \"Timestamps\", focus FROM daily WHERE id = %s AND (\"Timestamps\"-1)/48 = %s"
                cur.execute(command, (user_id,now_day))
                dailys = cur.fetchall()
                dailyLabels = []
                dailyData = []
                for i in range(48):
                    dailyLabels.append(f"{math.floor(i / 2)}:{30*(i%2):02d}")
                    dailyData.append(0)
                for i in dailys:
                    p = (i[0]-1) % 48
                    dailyData[p] = i[1]
                
                command = "SELECT day, focus FROM weekly WHERE id = %s AND (%s - day) < 7"
                cur.execute(command, (user_id,now_day))
                weeklys = cur.fetchall()    # 起始日是星期四
                weeklyLabels = ['週日', '週一', '週二', '週三', '週四', '週五', '週六']
                weeklyData = [0,0,0,0,0,0,0]
                for i in weeklys:
                    p = (i[0] + 4) % 7
                    weeklyData[p] = i[1]
                p_ = (now_day + 4) % 7
                weeklyLabels[p_] = "今日"
                for i in range(p_+1,7):
                    weeklyLabels[i] = "上" + weeklyLabels[i]
                print(dailyLabels,dailyData,weeklyLabels,weeklyData)
        return render_template('review_AI.html',dailyLabels=dailyLabels,dailyData=dailyData,weeklyLabels=weeklyLabels,weeklyData=weeklyData)
    except Exception as e:
        print("Database error:", e)
        return jsonify({"error": "Database error"}), 500

@app.route("/check_id", methods=["POST"])   # 確定 id 有沒有重複、回傳 bias
def check_id():
    data = request.json
    check_id = data.get("id", "")
    if check_id == "":
        return jsonify({"error": "Request error"}), 400
    
    try:
        with psycopg2.connect(DB_URL) as conn:
            with conn.cursor() as cur:
                command = "SELECT * FROM users WHERE id = %s"
                cur.execute(command, (check_id,))
                rows = cur.fetchone()
                
                if rows:
                    return jsonify({"exists": True, "bias": rows[1]})
                else:
                    command = "INSERT INTO users (id, bias) VALUES (%s, %s)"
                    cur.execute(command, (check_id,0))
                    conn.commit()
                    return jsonify({"exists": False, "bias": 0})
    except Exception as e:
        print("Database error:", e)
        return jsonify({"error": "Database error"}), 500
    
@app.route("/update_bias", methods=["POST"])    # 更新 user 的 bias
def update_bias():
    data = request.json
    user_id = data.get("id", "")
    new_bias = data.get("bias", "")
    if new_bias == "" or id == "":
        return jsonify({"error": "Request error"}), 400
    
    try:
        with psycopg2.connect(DB_URL) as conn:
            with conn.cursor() as cur:
                command = "UPDATE users SET bias = %s WHERE id = %s"
                cur.execute(command, (new_bias,user_id))
                conn.commit()
        return jsonify({"log": "update bias success"})
    except:
        return jsonify({"error": "Database error"}), 500
    
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)