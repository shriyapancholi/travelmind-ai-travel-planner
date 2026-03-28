from flask import Blueprint, request, jsonify
from services.flight_service import search_flights
from services.hotel_service import search_hotels
from services.maps_service import calculate_distance, get_local_attractions
from services.llm_service import generate_itinerary
from datetime import datetime, timedelta

generate_bp = Blueprint("generate", __name__)


@generate_bp.route("/", methods=["POST"])
def generate_trip():
    data = request.json

    # Validation
    if not data.get("destination") or not data.get("days"):
        return jsonify({"error": "Destination and days are required"}), 400

    destination = data["destination"]
    days = int(data["days"])
    budget = data.get("budget", "medium")
    origin = data.get("origin", "Delhi")
    passengers = int(data.get("passengers", 1))

    # Dates (default: starts tomorrow)
    departure_date = data.get("departure_date",
        (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d"))
    return_date = data.get("return_date",
        (datetime.now() + timedelta(days=7 + days)).strftime("%Y-%m-%d"))

    # === Call all services ===

    # 1. Flights
    flights = search_flights(
        origin=origin,
        destination=destination,
        departure_date=departure_date,
        return_date=return_date,
        passengers=passengers,
    )

    # 2. Hotels
    hotels = search_hotels(
        destination=destination,
        check_in=departure_date,
        check_out=return_date,
        days=days,
        budget=budget,
        guests=passengers,
    )

    # 3. Distance & Attractions
    distance_km = calculate_distance(origin, destination)
    attractions = get_local_attractions(destination)

    # 4. LLM Itinerary
    llm_result = generate_itinerary(
        destination=destination,
        days=days,
        budget=budget,
        origin=origin,
    )

    # === Calculate total cost ===
    # Pick cheapest outbound flight
    outbound_flights = [f for f in flights if f["direction"] == "outbound"]
    return_flights = [f for f in flights if f["direction"] == "return"]

    cheapest_outbound = min(outbound_flights, key=lambda f: f["total_price"]) if outbound_flights else None
    cheapest_return = min(return_flights, key=lambda f: f["total_price"]) if return_flights else None

    flight_cost = 0
    if cheapest_outbound:
        flight_cost += cheapest_outbound["total_price"]
    if cheapest_return:
        flight_cost += cheapest_return["total_price"]

    # Pick cheapest hotel
    cheapest_hotel = hotels[0] if hotels else None
    hotel_cost = cheapest_hotel["total_price"] if cheapest_hotel else 0

    total_cost = flight_cost + hotel_cost

    # === Build tour package ===
    tour_package = {
        "destination": destination,
        "origin": origin,
        "days": days,
        "budget": budget,
        "passengers": passengers,
        "departure_date": departure_date,
        "return_date": return_date,
        "distance_km": distance_km,
        "flights": flights,
        "hotels": hotels,
        "attractions": attractions,
        "itinerary": llm_result["itinerary"],
        "tips": llm_result["tips"],
        "recommendation": llm_result["recommendation"],
        "cost_breakdown": {
            "flights": flight_cost,
            "hotel": hotel_cost,
            "total_estimated": total_cost,
        },
        "total_cost": total_cost,
    }

    return jsonify(tour_package), 200