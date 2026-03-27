from flask import Blueprint, request
from pymongo import MongoClient
import os
from dotenv import load_dotenv
import certifi
from datetime import datetime

load_dotenv()

trips_bp = Blueprint("trips", __name__)

client = MongoClient(os.getenv("MONGO_URI"), tlsCAFile=certifi.where())
db = client["travelmind"]

@trips_bp.route("/save", methods=["POST"])
def save_trip():
    trip = request.json

    # ✅ Add timestamp
    trip["created_at"] = datetime.utcnow()

    db.trips.insert_one(trip)

    return {"message": "Trip saved"}, 201


@trips_bp.route("/", methods=["GET"])
def get_trips():
    trips = list(db.trips.find({}, {"_id": 0}))
    return trips