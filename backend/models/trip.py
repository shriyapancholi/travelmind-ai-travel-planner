from datetime import datetime

def trip_schema(data):
    return {
        "destination": data.get("destination"),
        "days": data.get("days"),
        "budget": data.get("budget"),
        "flights": data.get("flights", []),
        "hotels": data.get("hotels", []),
        "itinerary": data.get("itinerary", []),
        "total_cost": data.get("total_cost"),
        "created_at": datetime.utcnow()
    }