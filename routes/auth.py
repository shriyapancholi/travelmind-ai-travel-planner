from flask import Blueprint, request
from pymongo import MongoClient
import os
from dotenv import load_dotenv
import certifi

load_dotenv()

auth_bp = Blueprint("auth", __name__)

client = MongoClient(os.getenv("MONGO_URI"), tlsCAFile=certifi.where())
db = client["travelmind"]

@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.json

    # ✅ Validation
    if not data.get("email") or not data.get("password"):
        return {"error": "Email and password required"}, 400

    user = {
        "name": data.get("name"),
        "email": data.get("email"),
        "password": data.get("password")
    }

    db.users.insert_one(user)

    return {"message": "User registered"}, 201


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.json

    # ✅ Validation
    if not data.get("email") or not data.get("password"):
        return {"error": "Email and password required"}, 400

    user = db.users.find_one({
        "email": data.get("email"),
        "password": data.get("password")
    })

    if user:
        return {"message": "Login successful"}
    else:
        return {"error": "Invalid credentials"}, 401