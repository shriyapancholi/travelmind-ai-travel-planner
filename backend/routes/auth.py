from flask import Blueprint, request, jsonify
from db.mongo import db
from models.user import user_schema
import bcrypt
import jwt
import os
import re
from datetime import datetime, timedelta, timezone
from functools import wraps

auth_bp    = Blueprint("auth", __name__)
JWT_SECRET = os.getenv("JWT_SECRET")

if not JWT_SECRET:
    raise RuntimeError("JWT_SECRET is not set in .env. Refusing to start.")


def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth  = request.headers.get("Authorization", "")
        token = auth.split(" ")[1] if auth.startswith("Bearer ") else None
        if not token:
            return jsonify({"error": "Token is missing"}), 401
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
            request.user_id    = payload.get("user_id")
            request.user_email = payload.get("email")
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token has expired"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Invalid token"}), 401
        return f(*args, **kwargs)
    return decorated


def _valid_email(email):
    return re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email) is not None


@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.json or {}

    name     = (data.get("name") or "").strip()
    email    = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400
    if not _valid_email(email):
        return jsonify({"error": "Invalid email address"}), 400
    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400

    if db.users.find_one({"email": email}):
        return jsonify({"error": "An account with this email already exists"}), 409

    hashed = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt())
    user   = user_schema(name=name, email=email, password=hashed.decode("utf-8"))
    db.users.insert_one(user)

    return jsonify({"message": "Account created successfully"}), 201


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.json or {}

    email    = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    user = db.users.find_one({"email": email})
    if not user:
        return jsonify({"error": "Invalid email or password"}), 401

    if not bcrypt.checkpw(password.encode("utf-8"), user["password"].encode("utf-8")):
        return jsonify({"error": "Invalid email or password"}), 401

    payload = {
        "user_id": str(user["_id"]),
        "email":   user["email"],
        "name":    user.get("name", ""),
        "exp":     datetime.now(timezone.utc) + timedelta(hours=24),
    }
    token = jwt.encode(payload, JWT_SECRET, algorithm="HS256")

    return jsonify({
        "message": "Login successful",
        "token":   token,
        "name":    user.get("name", ""),
        "email":   user["email"],
    }), 200


@auth_bp.route("/me", methods=["GET"])
@token_required
def me():
    """Return current user info — used by frontend to show username."""
    user = db.users.find_one({"_id": __import__("bson").ObjectId(request.user_id)})
    if not user:
        return jsonify({"error": "User not found"}), 404
    return jsonify({
        "name":       user.get("name", ""),
        "email":      user["email"],
        "created_at": str(user.get("created_at", "")),
    }), 200