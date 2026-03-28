"""
LLM Itinerary Service — dummy text for now.
Replace with real LLM API (OpenAI, Gemini, etc.) later.
"""

ITINERARY_TEMPLATES = {
    "Paris": {
        "activities": [
            "Visit the Eiffel Tower and enjoy panoramic city views",
            "Explore the Louvre Museum — see the Mona Lisa",
            "Stroll through Montmartre and visit Sacré-Cœur Basilica",
            "Cruise along the Seine River at sunset",
            "Shop along the Champs-Élysées",
            "Visit Notre-Dame Cathedral area and the Latin Quarter",
            "Day trip to Palace of Versailles",
            "Explore Le Marais district — cafés, galleries, and falafel",
            "Visit Musée d'Orsay for Impressionist art",
            "Evening at Moulin Rouge cabaret show",
        ],
        "food": ["Croissants at a local boulangerie", "French onion soup", "Crêpes near the Seine"],
        "tips": ["Buy a Paris Museum Pass for skip-the-line access", "Metro is the fastest way to travel"],
    },
    "Tokyo": {
        "activities": [
            "Explore Shibuya Crossing and Hachiko statue",
            "Visit Senso-ji Temple in Asakusa",
            "Shop in Akihabara — anime and electronics district",
            "Visit Meiji Shrine and walk through Harajuku",
            "Day trip to Mount Fuji (Hakone or Kawaguchiko)",
            "Explore Tsukiji Outer Market for street food",
            "Visit Tokyo Skytree for city views",
            "Evening in Shinjuku Golden Gai — tiny bars alley",
            "Visit teamLab digital art museum",
            "Take the bullet train experience (Shinkansen)",
        ],
        "food": ["Fresh sushi at Tsukiji", "Ramen at a local shop", "Matcha desserts in Uji"],
        "tips": ["Get a Suica card for transit", "Bow slightly when greeting locals"],
    },
    "London": {
        "activities": [
            "Visit Big Ben and Houses of Parliament",
            "Explore the British Museum (free entry)",
            "Walk across Tower Bridge and visit Tower of London",
            "Stroll through Hyde Park and Kensington Gardens",
            "Explore Camden Market for street food and vintage shopping",
            "Visit Buckingham Palace for the Changing of the Guard",
            "Ride the London Eye for Thames views",
            "Explore the South Bank — Tate Modern and Borough Market",
            "Day trip to Stonehenge or Windsor Castle",
            "Catch a West End theatre show",
        ],
        "food": ["Fish and chips", "Full English breakfast", "Afternoon tea at a classic hotel"],
        "tips": ["Get an Oyster card for the Tube", "Most museums are free"],
    },
}


def generate_itinerary(destination, days, budget="medium", origin="Delhi"):
    """
    Generate a day-by-day travel itinerary (dummy).
    Returns a structured itinerary with daily plans.
    """
    template = ITINERARY_TEMPLATES.get(destination, None)

    if not template:
        # Generic itinerary for unknown destinations
        template = {
            "activities": [
                f"Arrive in {destination} — check into hotel and explore nearby area",
                f"Visit {destination}'s most popular landmark",
                f"Explore local markets and try street food",
                f"Visit a museum or cultural heritage site",
                f"Day trip to nearby attraction",
                f"Shopping at {destination}'s main shopping district",
                f"Visit a local park or waterfront area",
                f"Explore the old town or historical quarter",
                f"Try a local cooking class or cultural workshop",
                f"Departure day — last-minute shopping and airport transfer",
            ],
            "food": [f"Try local cuisine at a popular {destination} restaurant"],
            "tips": [f"Research local customs before visiting {destination}"],
        }

    itinerary = []

    for day in range(1, days + 1):
        if day == 1:
            title = f"Day {day}: Arrival in {destination}"
            morning = f"Arrive from {origin}, check into hotel"
        elif day == days:
            title = f"Day {day}: Departure"
            morning = "Pack up, checkout, last-minute sightseeing"
        else:
            title = f"Day {day}: Explore {destination}"
            morning = template["activities"][(day * 2 - 2) % len(template["activities"])]

        afternoon = template["activities"][(day * 2 - 1) % len(template["activities"])]
        evening = f"Dinner — {template['food'][(day - 1) % len(template['food'])]}"

        itinerary.append({
            "day": day,
            "title": title,
            "morning": morning,
            "afternoon": afternoon,
            "evening": evening,
        })

    # Budget-based recommendations
    if budget == "low":
        recommendation = f"Best budget tip: Use public transport and eat at local {destination} street vendors."
    elif budget == "high":
        recommendation = f"Luxury tip: Book private tours and fine dining experiences in {destination}."
    else:
        recommendation = f"Great balance: Mix popular attractions with hidden gems in {destination}."

    return {
        "itinerary": itinerary,
        "total_days": days,
        "tips": template["tips"],
        "recommendation": recommendation,
    }
