from flask import Blueprint, request, jsonify
from supabase_client import supabase

portfolio_bp = Blueprint("portfolio", __name__, url_prefix="/portfolio")


def get_user_from_token():
    auth_header = request.headers.get("Authorization", "")
    token = auth_header.replace("Bearer ", "")
    if not token:
        return None
    res = supabase.table("users").select("*").eq("id", token).execute()
    return res.data[0] if res.data else None


@portfolio_bp.route("", methods=["GET"])
def get_portfolio():
    user = get_user_from_token()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    res = supabase.table("portfolio").select("*") \
        .eq("user_id", user["id"]) \
        .order("ticker", desc=False) \
        .execute()

    return jsonify(res.data)


@portfolio_bp.route("", methods=["POST"])
def add_stock():
    user = get_user_from_token()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    data = request.json
    ticker = data.get("ticker")
    frequency = data.get("frequency", "weekly")

    if not ticker:
        return jsonify({"error": "Ticker is required"}), 400

    # Prevent duplicates
    existing = supabase.table("portfolio").select("*") \
        .eq("user_id", user["id"]).eq("ticker", ticker).execute()

    if existing.data:
        return jsonify({"error": "Stock already exists"}), 409

    result = supabase.table("portfolio").insert({
        "user_id": user["id"],
        "ticker": ticker,
        "frequency": frequency
    }).execute()

    if not result.data:
        return jsonify({"error": "Failed to add stock"}), 500

    return jsonify(result.data[0]), 200


@portfolio_bp.route("", methods=["PATCH"])
def update_frequency():
    user = get_user_from_token()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    data = request.json
    ticker = data.get("ticker")
    new_freq = data.get("frequency")

    if not ticker or not new_freq:
        return jsonify({"error": "Ticker and new frequency are required"}), 400

    supabase.table("portfolio").update({"frequency": new_freq}) \
        .eq("user_id", user["id"]).eq("ticker", ticker).execute()

    return jsonify({"message": "Frequency updated"}), 200


@portfolio_bp.route("/<ticker>", methods=["DELETE"])
def delete_stock(ticker):
    user = get_user_from_token()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    supabase.table("portfolio").delete() \
        .eq("user_id", user["id"]).eq("ticker", ticker).execute()

    return jsonify({"message": "Stock removed"}), 200
