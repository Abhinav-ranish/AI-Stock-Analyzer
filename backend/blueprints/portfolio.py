from flask import Blueprint, request, jsonify
from supabase_client import supabase
import bcrypt

portfolio_bp = Blueprint("portfolio", __name__, url_prefix="/portfolio")

# REGISTER
@portfolio_bp.route("/auth/register", methods=["POST"])
def register():
    data = request.json
    email = data.get("email")
    nickname = data.get("nickname")
    password = data.get("password")

    if not email or not nickname:
        return jsonify({"error": "Email and nickname required"}), 400

    user_check = supabase.table("users").select("email").eq("email", email).execute()
    if user_check.data:
        return jsonify({"error": "User already exists"}), 409

    hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode() if password else None

    supabase.table("users").insert({
        "email": email,
        "nickname": nickname,
        "password": hashed
    }).execute()

    return jsonify({"message": "Registered"}), 200


# LOGIN
@portfolio_bp.route("/auth/login", methods=["POST"])
def login():
    data = request.json
    email = data.get("email")
    password = data.get("password")

    user_res = supabase.table("users").select("*").eq("email", email).execute()
    if not user_res.data:
        return jsonify({"error": "User not found"}), 404

    user = user_res.data[0]
    if user["password"]:
        if not password or not bcrypt.checkpw(password.encode(), user["password"].encode()):
            return jsonify({"error": "Wrong password"}), 401

    return jsonify({"message": "Login successful", "nickname": user["nickname"]}), 200


# GET Portfolio
@portfolio_bp.route("/<email>", methods=["GET"])
def get_portfolio(email):
    res = supabase.table("portfolio").select("*").eq("user_email", email).execute()
    return jsonify(res.data)


# ADD stock
@portfolio_bp.route("/<email>", methods=["POST"])
def add_stock(email):
    data = request.json
    ticker = data.get("ticker")
    frequency = data.get("frequency", "weekly")

    supabase.table("portfolio").insert({
        "user_email": email,
        "ticker": ticker,
        "frequency": frequency
    }).execute()
    return jsonify({"message": "Stock added"}), 200


# PATCH reminder frequency
@portfolio_bp.route("/<email>", methods=["PATCH"])
def update_frequency(email):
    data = request.json
    ticker = data.get("ticker")
    new_freq = data.get("frequency")

    supabase.table("portfolio").update({"frequency": new_freq}) \
        .eq("user_email", email).eq("ticker", ticker).execute()

    return jsonify({"message": "Frequency updated"}), 200


# DELETE stock
@portfolio_bp.route("/<email>/<ticker>", methods=["DELETE"])
def delete_stock(email, ticker):
    supabase.table("portfolio").delete().eq("user_email", email).eq("ticker", ticker).execute()
    return jsonify({"message": "Stock removed"}), 200
