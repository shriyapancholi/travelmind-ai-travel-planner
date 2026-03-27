from flask import Blueprint, request, jsonify
from pymongo import MongoClient
import os
from dotenv import load_dotenv
import certifi

load_dotenv()

trips_bp = Blueprint("trips", __name__)

client = MongoClient(
    os.getenv("MONGO_URI"),
    tlsCAFile=certifi.where()
)
db = client["travelmind"]

@trips_bp.route("/", methods=["GET"])
def get_trips():
    trips = list(db.trips.find({}, {"_id": 0}))
    return jsonify(trips)

@trips_bp.route("/save", methods=["POST"])
def save_trip():
    data = request.json
    db.trips.insert_one(data)
    return jsonify({"message": "Trip saved"}), 201