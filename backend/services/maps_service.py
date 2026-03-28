"""
Maps / Distance Service — dummy data for now.
Replace with real API (Google Maps, MapBox, etc.) later.
"""

# Approximate distances from major Indian cities (km) — dummy lookup
DISTANCE_TABLE = {
    ("Delhi", "Paris"):       6600,
    ("Delhi", "London"):      6700,
    ("Delhi", "Dubai"):       2200,
    ("Delhi", "New York"):    11800,
    ("Delhi", "Tokyo"):       5850,
    ("Mumbai", "Paris"):      7000,
    ("Mumbai", "London"):     7200,
    ("Mumbai", "Dubai"):      1950,
    ("Mumbai", "New York"):   12550,
    ("Mumbai", "Tokyo"):      6750,
    ("Bangalore", "Paris"):   7980,
    ("Bangalore", "London"):  8000,
    ("Bangalore", "Dubai"):   2900,
    ("Bangalore", "Singapore"): 3900,
}


def calculate_distance(origin, destination):
    """
    Calculate approximate distance between two cities (dummy).
    Returns distance in km.
    """
    key = (origin, destination)
    reverse_key = (destination, origin)

    if key in DISTANCE_TABLE:
        return DISTANCE_TABLE[key]
    elif reverse_key in DISTANCE_TABLE:
        return DISTANCE_TABLE[reverse_key]
    else:
        # Fallback: generate a plausible distance
        import random
        return random.randint(800, 15000)


def get_local_attractions(destination, limit=5):
    """Get popular local attractions for a destination (dummy)."""

    ATTRACTIONS = {
        "Paris": [
            {"name": "Eiffel Tower", "type": "Landmark", "visit_duration": "2 hours"},
            {"name": "Louvre Museum", "type": "Museum", "visit_duration": "3 hours"},
            {"name": "Notre-Dame Cathedral", "type": "Historic", "visit_duration": "1.5 hours"},
            {"name": "Montmartre & Sacré-Cœur", "type": "Neighborhood", "visit_duration": "2 hours"},
            {"name": "Champs-Élysées", "type": "Shopping", "visit_duration": "2 hours"},
        ],
        "Tokyo": [
            {"name": "Shibuya Crossing", "type": "Landmark", "visit_duration": "1 hour"},
            {"name": "Senso-ji Temple", "type": "Historic", "visit_duration": "1.5 hours"},
            {"name": "Akihabara", "type": "Shopping", "visit_duration": "2 hours"},
            {"name": "Meiji Shrine", "type": "Historic", "visit_duration": "1.5 hours"},
            {"name": "Tokyo Skytree", "type": "Landmark", "visit_duration": "2 hours"},
        ],
        "London": [
            {"name": "Big Ben & Parliament", "type": "Landmark", "visit_duration": "1 hour"},
            {"name": "British Museum", "type": "Museum", "visit_duration": "3 hours"},
            {"name": "Tower of London", "type": "Historic", "visit_duration": "2 hours"},
            {"name": "Hyde Park", "type": "Park", "visit_duration": "1.5 hours"},
            {"name": "Camden Market", "type": "Shopping", "visit_duration": "2 hours"},
        ],
        "Dubai": [
            {"name": "Burj Khalifa", "type": "Landmark", "visit_duration": "2 hours"},
            {"name": "Dubai Mall", "type": "Shopping", "visit_duration": "3 hours"},
            {"name": "Palm Jumeirah", "type": "Beach", "visit_duration": "2 hours"},
            {"name": "Dubai Marina", "type": "Waterfront", "visit_duration": "2 hours"},
            {"name": "Gold Souk", "type": "Market", "visit_duration": "1.5 hours"},
        ],
        "New York": [
            {"name": "Statue of Liberty", "type": "Landmark", "visit_duration": "3 hours"},
            {"name": "Central Park", "type": "Park", "visit_duration": "2 hours"},
            {"name": "Times Square", "type": "Landmark", "visit_duration": "1 hour"},
            {"name": "Metropolitan Museum of Art", "type": "Museum", "visit_duration": "3 hours"},
            {"name": "Brooklyn Bridge", "type": "Landmark", "visit_duration": "1 hour"},
        ],
    }

    attractions = ATTRACTIONS.get(destination, [
        {"name": f"{destination} City Center", "type": "Landmark", "visit_duration": "1 hour"},
        {"name": f"{destination} Old Town", "type": "Historic", "visit_duration": "2 hours"},
        {"name": f"{destination} Local Market", "type": "Market", "visit_duration": "1.5 hours"},
    ])

    return attractions[:limit]
