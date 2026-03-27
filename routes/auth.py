from flask import Blueprint, request, jsonify
from models.user import user_schema
from pymongo import MongoClient
import os
from dotenv import load_dotenv
import certifi

load_dotenv()

auth_bp = Blueprint("auth", __name__)

client = MongoClient(
    os.getenv("MONGO_URI"),
    tlsCAFile=certifi.where()
)
db = client["travelmind"]

@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.json

    user = user_schema(
        data["name"],
        data["email"],
        data["password"]
    )

    db.users.insert_one(user)
    return jsonify({"message": "User registered"}), 201

@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.json

    user = db.users.find_one({"email": data["email"]})

    if not user or user["password"] != data["password"]:
        return jsonify({"message": "Invalid credentials"}), 401

    return jsonify({"message": "Login successful"}), 200