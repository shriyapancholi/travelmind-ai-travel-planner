from flask import Blueprint, request, jsonify
from db.mongo import db
from models.trip import trip_schema
from bson import json_util
import json

trips_bp = Blueprint("trips", __name__)


@trips_bp.route("/save", methods=["POST"])
def save_trip():
    data = request.json

    if not data.get("destination"):
        return jsonify({"error": "Destination is required"}), 400

    trip = trip_schema(data)
    db.trips.insert_one(trip)

    return jsonify({"message": "Trip saved successfully"}), 201


@trips_bp.route("/", methods=["GET"])
def get_trips():
    trips = list(db.trips.find())
    # Convert ObjectId and other BSON types to JSON-serializable format
    return json.loads(json_util.dumps(trips)), 200