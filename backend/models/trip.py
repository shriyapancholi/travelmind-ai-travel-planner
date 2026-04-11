from datetime import datetime

def trip_schema(data):
    return {
        "user_id":        data.get("user_id"),        # set by route after auth
        "destination":    data.get("destination"),
        "origin":         data.get("origin", "Delhi"),
        "days":           data.get("days"),
        "budget":         data.get("budget"),
        "departure_date": data.get("departure_date"),
        "return_date":    data.get("return_date"),
        "flights":        data.get("flights", []),
        "return_flights": data.get("return_flights", []),
        "hotels":         data.get("hotels", []),
        "budget_split":   data.get("budget_split", {}),
        "itinerary":      data.get("itinerary", []),
        "tips":           data.get("tips", []),
        "recommendation": data.get("recommendation", ""),
        "total_cost":     data.get("total_cost"),
        "created_at":     datetime.utcnow()
    }