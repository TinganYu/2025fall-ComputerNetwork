from dotenv import load_dotenv
import os
from flask import Flask, request, jsonify
import requests
from flask_cors import CORS
import psycopg2

app = Flask(__name__)
CORS(app)

load_dotenv()
DB_URL = os.environ.get("E_DB_URL")

@app.route("/db_store", methods=["POST"])
def insert():
    with psycopg2.connect(DB_URL) as conn:
        with conn.cursor() as cur:
            data = request.json
            command = "INSERT INTO your_table (column1, column2) VALUES (%s, %s)"
            cur.execute(command, (None,None))
            conn.commit()
    return
    
@app.route("/db_get", methods=["POST"])
def select():
    with psycopg2.connect(DB_URL) as conn:
        with conn.cursor() as cur:
            data = request.json
            command = "SELECT * FROM your_table WHERE user_id = %s"
            cur.execute(command, (None,))
            rows = cur.fetchall()
    return

@app.route("/check_id", methods=["POST"])
def check_id():
    data = request.json
    check_id = data.get("id", "")
    if check_id == "":
        return jsonify({"exists": True})
    
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
    except:
        return jsonify({"error": "Database error"}), 500