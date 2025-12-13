from dotenv import load_dotenv
import os
from flask import Flask, request, jsonify
import math
from flask_cors import CORS
import psycopg2

app = Flask(__name__)
CORS(app)

load_dotenv()
DB_URL = os.environ.get("E_DB_URL")

'''
function calculate_date(timestamp){
  const days = Math.floor(timestamp / (1000 * 60 * 60 * 24));
  return days;
}'''

@app.route("/update_focus", methods=["POST"])
def update_focus():
    data = request.json
    now_ms = data.get("now", "")
    now_ms = math.ceil(now_ms / 1000 * 60 * 30)
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
            # 推到 weekly 跟刪掉日回顧 可以用trigger? 加了待測試
        return jsonify({"log": "update focus success"})
    except Exception as e:
        print("Database error:", e)
        return jsonify({"error": "Database error"}), 500
    
'''@app.route("/show_review", methods=["POST"])
def show_review():
    with psycopg2.connect(DB_URL) as conn:
        with conn.cursor() as cur:
            data = request.json
            command = "SELECT * FROM your_table WHERE user_id = %s"
            cur.execute(command, (None,))
            rows = cur.fetchall()
    return'''

@app.route("/check_id", methods=["POST"])
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
    
@app.route("/update_bias", methods=["POST","OPTIONS"])
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