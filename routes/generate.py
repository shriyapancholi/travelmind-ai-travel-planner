from flask import Blueprint, jsonify

generate_bp = Blueprint("generate", __name__)

@generate_bp.route("/", methods=["POST"])
def generate_trip():
    return jsonify({
        "destination": "Paris",
        "flights": [],
        "hotels": [],
        "itinerary": ["Day 1: Arrival", "Day 2: City Tour"],
        "total_cost": 50000,
        "distance": 10
    })