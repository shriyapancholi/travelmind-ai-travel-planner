"""
Flight Service — dummy data for now.
Replace with real API (Amadeus, Skyscanner, etc.) later.
"""
import random


def search_flights(origin, destination, departure_date, return_date=None, passengers=1):
    """Search flights between origin and destination (dummy data)."""

    airlines = ["Air India", "IndiGo", "Emirates", "Lufthansa", "British Airways", "Air France"]
    
    def _generate_flight(dep_city, arr_city, date, direction):
        airline = random.choice(airlines)
        flight_no = f"{airline[:2].upper()}{random.randint(100, 999)}"
        dep_hour = random.randint(5, 22)
        duration_hrs = random.randint(2, 14)
        arr_hour = (dep_hour + duration_hrs) % 24
        base_price = random.randint(3000, 25000)

        return {
            "flight_number": flight_no,
            "airline": airline,
            "departure": {
                "city": dep_city,
                "time": f"{date} {dep_hour:02d}:00",
            },
            "arrival": {
                "city": arr_city,
                "time": f"{date} {arr_hour:02d}:00",
            },
            "duration_hours": duration_hrs,
            "price_per_person": base_price,
            "total_price": base_price * passengers,
            "class": random.choice(["Economy", "Premium Economy", "Business"]),
            "direction": direction,
        }

    flights = []

    # Outbound flights (2-3 options)
    for _ in range(random.randint(2, 3)):
        flights.append(_generate_flight(origin, destination, departure_date, "outbound"))

    # Return flights if round trip
    if return_date:
        for _ in range(random.randint(2, 3)):
            flights.append(_generate_flight(destination, origin, return_date, "return"))

    return flights
