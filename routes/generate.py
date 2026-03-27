from flask import Blueprint, jsonify

generate_bp = Blueprint("generate", __name__)

@generate_bp.route("/", methods=["POST"])
def generate_trip():
   return {
    "destination": destination,
    "days": days,
    "itinerary": itinerary,
    "total_cost": total_cost,
    "recommendation": "Best time to visit is Spring"
}