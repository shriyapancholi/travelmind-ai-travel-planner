from flask import Blueprint, request, jsonify
from db.mongo import db
from models.trip import trip_schema
from bson import ObjectId
import jwt
import os
from functools import wraps

trips_bp = Blueprint("trips", __name__)

JWT_SECRET = os.getenv("JWT_SECRET")
if not JWT_SECRET:
    raise RuntimeError("JWT_SECRET environment variable is not set.")


def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
        if not token:
            return jsonify({"error": "Token is missing"}), 401
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
            request.user_id = payload.get("user_id")
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token expired"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Invalid token"}), 401
        return f(*args, **kwargs)
    return decorated


@trips_bp.route("/save", methods=["POST"])
@token_required
def save_trip():
    data = request.json

    if not data.get("destination"):
        return jsonify({"error": "Destination is required"}), 400

    trip = trip_schema(data)
    trip["user_id"] = request.user_id  # attach owner

    db.trips.insert_one(trip)
    return jsonify({"message": "Trip saved successfully"}), 201


@trips_bp.route("/", methods=["GET"])
@token_required
def get_trips():
    # Only return trips belonging to the authenticated user
    trips = list(db.trips.find({"user_id": request.user_id}))
    for trip in trips:
        trip["_id"] = str(trip["_id"])
    return jsonify(trips), 200


@trips_bp.route("/<trip_id>", methods=["DELETE"])
@token_required
def delete_trip(trip_id):
    result = db.trips.delete_one({
        "_id": ObjectId(trip_id),
        "user_id": request.user_id  # can only delete own trips
    })
    if result.deleted_count == 0:
        return jsonify({"error": "Trip not found or unauthorized"}), 404
    return jsonify({"message": "Trip deleted"}), 200