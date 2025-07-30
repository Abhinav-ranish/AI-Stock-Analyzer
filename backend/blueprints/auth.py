from flask import Blueprint, request, jsonify
from supabase import create_client
import os
import bcrypt

auth_bp = Blueprint("auth", __name__, url_prefix="/auth")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Utils
def hash_pw(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()

def verify_pw(pw: str, hashed_pw: str) -> bool:
    return bcrypt.checkpw(pw.encode(), hashed_pw.encode())

# ✅ Register
@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.json
    email = data.get("email")
    nickname = data.get("nickname")
    password = data.get("password")

    if not email or not nickname:
        return jsonify({"error": "Email and nickname required"}), 400

    existing = supabase.table("users").select("id").eq("email", email).execute()
    if existing.data:
        return jsonify({"error": "User already exists"}), 409

    hashed_password = hash_pw(password) if password else None

    res = supabase.table("users").insert({
        "email": email,
        "nickname": nickname,
        "password": hashed_password
    }).execute()

    return jsonify({"message": "Registered", "token": res.data[0]["id"]}), 200

# ✅ Login
@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.json
    email = data.get("email")
    password = data.get("password")

    user_res = supabase.table("users").select("*").eq("email", email).execute()
    if not user_res.data:
        return jsonify({"error": "User not found"}), 404

    user = user_res.data[0]
    if user["password"]:
        if not password or not verify_pw(password, user["password"]):
            return jsonify({"error": "Wrong password"}), 401

    return jsonify({
        "message": "Login successful",
        "nickname": user["nickname"],
        "token": user["id"]  # UUID as token for now
    }), 200
