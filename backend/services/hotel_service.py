"""
Hotel Service — dummy data for now.
Replace with real API (Booking.com, Hotels.com, etc.) later.
"""
import random


HOTEL_DATA = {
    "Paris": [
        {"name": "Hôtel Le Marais", "stars": 4, "area": "Le Marais"},
        {"name": "Pullman Paris Tour Eiffel", "stars": 5, "area": "Trocadéro"},
        {"name": "Ibis Styles Bastille", "stars": 3, "area": "Bastille"},
    ],
    "Tokyo": [
        {"name": "Shinjuku Granbell Hotel", "stars": 4, "area": "Shinjuku"},
        {"name": "The Peninsula Tokyo", "stars": 5, "area": "Marunouchi"},
        {"name": "Hotel Gracery Shinjuku", "stars": 3, "area": "Kabukicho"},
    ],
    "New York": [
        {"name": "The Standard High Line", "stars": 4, "area": "Meatpacking"},
        {"name": "The Plaza Hotel", "stars": 5, "area": "Midtown"},
        {"name": "Pod 51 Hotel", "stars": 3, "area": "Midtown East"},
    ],
    "London": [
        {"name": "The Hoxton Shoreditch", "stars": 4, "area": "Shoreditch"},
        {"name": "The Savoy", "stars": 5, "area": "Strand"},
        {"name": "Hub by Premier Inn Westminster", "stars": 3, "area": "Westminster"},
    ],
    "Dubai": [
        {"name": "Atlantis The Palm", "stars": 5, "area": "Palm Jumeirah"},
        {"name": "Rove Downtown", "stars": 3, "area": "Downtown"},
        {"name": "JW Marriott Marquis", "stars": 5, "area": "Business Bay"},
    ],
}

# Pricing tiers per night (INR)
PRICE_BY_BUDGET = {
    "low":    {"min": 2000, "max": 5000},
    "medium": {"min": 5000, "max": 12000},
    "high":   {"min": 12000, "max": 35000},
}


def search_hotels(destination, check_in, check_out, days=1, budget="medium", guests=1):
    """Search hotels at destination (dummy data)."""

    price_range = PRICE_BY_BUDGET.get(budget, PRICE_BY_BUDGET["medium"])

    # Use known hotels if available, otherwise generate generic ones
    known = HOTEL_DATA.get(destination, None)
    if not known:
        known = [
            {"name": f"{destination} Grand Hotel", "stars": 4, "area": "City Center"},
            {"name": f"{destination} Budget Inn", "stars": 3, "area": "Old Town"},
            {"name": f"{destination} Luxury Resort", "stars": 5, "area": "Waterfront"},
        ]

    hotels = []
    for hotel in known:
        price_per_night = random.randint(price_range["min"], price_range["max"])
        # Adjust price by star rating
        price_per_night = int(price_per_night * (hotel["stars"] / 4))

        hotels.append({
            "name": hotel["name"],
            "stars": hotel["stars"],
            "area": hotel["area"],
            "check_in": check_in,
            "check_out": check_out,
            "price_per_night": price_per_night,
            "total_price": price_per_night * max(days, 1),
            "amenities": _get_amenities(hotel["stars"]),
            "rating": round(random.uniform(3.5, 5.0), 1),
        })

    return sorted(hotels, key=lambda h: h["total_price"])


def _get_amenities(stars):
    base = ["Free WiFi", "Air Conditioning"]
    if stars >= 3:
        base += ["Breakfast Included", "Room Service"]
    if stars >= 4:
        base += ["Swimming Pool", "Gym", "Spa"]
    if stars >= 5:
        base += ["Airport Transfer", "Concierge", "Rooftop Bar"]
    return base
