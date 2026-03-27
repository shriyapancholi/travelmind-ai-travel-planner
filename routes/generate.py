from flask import Blueprint, request

generate_bp = Blueprint("generate", __name__)

@generate_bp.route("/", methods=["POST"])
def generate_trip():
    data = request.json

    # ✅ Validation
    if not data.get("destination") or not data.get("days"):
        return {"error": "Destination and days required"}, 400

    destination = data.get("destination")
    days = data.get("days")
    budget = data.get("budget", "medium")

    # ✅ Dynamic pricing
    if budget == "low":
        cost = 20000
    elif budget == "high":
        cost = 80000
    else:
        cost = 50000

    itinerary = [
        "Day 1: Arrival",
        "Day 2: City Tour"
    ]

    return {
        "destination": destination,
        "days": days,
        "flights": [],
        "hotels": [],
        "itinerary": itinerary,
        "total_cost": cost,
        "recommendation": "Best time to visit is Spring"
    }