from flask import Blueprint, request, jsonify
from db.mongo import db
from models.user import user_schema
import bcrypt
import jwt
import os
from datetime import datetime, timedelta, timezone

auth_bp = Blueprint("auth", __name__)

JWT_SECRET = os.getenv("JWT_SECRET", "travelmindsecret")


@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.json

    if not data.get("email") or not data.get("password"):
        return jsonify({"error": "Email and password required"}), 400

    # Check for existing user
    if db.users.find_one({"email": data["email"]}):
        return jsonify({"error": "Email already registered"}), 409

    # Hash password
    hashed = bcrypt.hashpw(data["password"].encode("utf-8"), bcrypt.gensalt())

    user = user_schema(
        name=data.get("name", ""),
        email=data["email"],
        password=hashed.decode("utf-8"),
    )

    db.users.insert_one(user)

    return jsonify({"message": "User registered successfully"}), 201


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.json

    if not data.get("email") or not data.get("password"):
        return jsonify({"error": "Email and password required"}), 400

    user = db.users.find_one({"email": data["email"]})

    if not user:
        return jsonify({"error": "Invalid credentials"}), 401

    # Verify password
    if not bcrypt.checkpw(data["password"].encode("utf-8"), user["password"].encode("utf-8")):
        return jsonify({"error": "Invalid credentials"}), 401

    # Generate JWT token
    payload = {
        "user_id": str(user["_id"]),
        "email": user["email"],
        "exp": datetime.now(timezone.utc) + timedelta(hours=24),
    }
    token = jwt.encode(payload, JWT_SECRET, algorithm="HS256")

    return jsonify({"message": "Login successful", "token": token}), 200