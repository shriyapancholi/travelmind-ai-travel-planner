from flask import Blueprint, request, jsonify
from datetime import datetime, timedelta
import os, json, jwt
from functools import wraps
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

api_key    = os.getenv("OPENAI_API_KEY")
JWT_SECRET = os.getenv("JWT_SECRET")
if not JWT_SECRET:
    raise RuntimeError("JWT_SECRET is not set in .env — refusing to start.")

openai_client = OpenAI(api_key=api_key) if api_key else None
generate_bp   = Blueprint("generate", __name__)


def _int(v, d=0):
    try: return int(v)
    except: return d


def token_required(f):
    @wraps(f)
    def inner(*a, **kw):
        auth  = request.headers.get("Authorization", "")
        token = auth.split(" ")[1] if auth.startswith("Bearer ") else None
        if not token: return jsonify({"error": "Token missing"}), 401
        try:
            p = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
            request.user_id    = p.get("user_id")
            request.user_email = p.get("email")
        except jwt.ExpiredSignatureError: return jsonify({"error": "Token expired"}), 401
        except jwt.InvalidTokenError:     return jsonify({"error": "Invalid token"}), 401
        return f(*a, **kw)
    return inner


@generate_bp.route("/", methods=["POST"])
@token_required
def generate_trip():
    try:
        data        = request.get_json(force=True)
        destination = (data.get("destination") or "").strip()
        origin      = (data.get("origin")      or "Delhi").strip()
        days        = max(1,  _int(data.get("days"),     3))
        budget      = max(0,  _int(data.get("budget"),   0))
        travelers   = max(1,  _int(data.get("travelers"),1))
        trip_type   = data.get("trip_type", "leisure")

        today = datetime.now()
        try:    dep = datetime.strptime(data["departure_date"], "%Y-%m-%d").strftime("%Y-%m-%d")
        except: dep = (today + timedelta(days=3)).strftime("%Y-%m-%d")

        try:    ret = datetime.strptime(data["return_date"], "%Y-%m-%d").strftime("%Y-%m-%d")
        except: ret = (datetime.strptime(dep, "%Y-%m-%d") + timedelta(days=days)).strftime("%Y-%m-%d")

        if not destination:
            return jsonify({"error": "Destination is required"}), 400

        # ── Fallback data (always has 3 hotels + 3 flights) ──
        fb_pn = max(1500, _int(budget * 0.06))
        fallback = {
            "flights": [
                {"airline":"IndiGo",    "flight_number":"6E-201", "departure_time":f"{dep} 06:00", "arrival_time":f"{dep} 08:30", "duration":"2h 30m", "price":max(2500,_int(budget*.08)), "class":"Economy",  "stops":"Non-stop"},
                {"airline":"Air India", "flight_number":"AI-635", "departure_time":f"{dep} 11:15", "arrival_time":f"{dep} 13:45", "duration":"2h 30m", "price":max(3200,_int(budget*.10)), "class":"Economy",  "stops":"Non-stop"},
                {"airline":"Vistara",   "flight_number":"UK-865", "departure_time":f"{dep} 18:30", "arrival_time":f"{dep} 21:00", "duration":"2h 30m", "price":max(5800,_int(budget*.15)), "class":"Business", "stops":"Non-stop"},
            ],
            "return_flights": [
                {"airline":"IndiGo",    "flight_number":"6E-202", "departure_time":f"{ret} 07:00", "arrival_time":f"{ret} 09:30", "duration":"2h 30m", "price":max(2800,_int(budget*.09)), "class":"Economy", "stops":"Non-stop"},
                {"airline":"Air India", "flight_number":"AI-636", "departure_time":f"{ret} 16:00", "arrival_time":f"{ret} 18:30", "duration":"2h 30m", "price":max(3600,_int(budget*.11)), "class":"Economy", "stops":"Non-stop"},
            ],
            "hotels": [
                {"name":f"{destination} Budget Inn",    "area":"City Centre",  "stars":3,"price_per_night":fb_pn,    "total_price":fb_pn*days,    "rating":4.0,"reason":"Best value, near public transport","amenities":["Free WiFi","AC","Hot Water","24hr Reception"],                                  "tag":"Budget Pick"},
                {"name":f"{destination} Grand Hotel",   "area":"Central Area", "stars":4,"price_per_night":fb_pn*2,  "total_price":fb_pn*2*days,  "rating":4.4,"reason":"Top-rated, excellent location and amenities","amenities":["Free WiFi","Pool","Breakfast","Gym","Room Service","Parking"],    "tag":"Most Popular"},
                {"name":f"{destination} Luxury Resort", "area":"Prime Zone",   "stars":5,"price_per_night":fb_pn*4,  "total_price":fb_pn*4*days,  "rating":4.8,"reason":"World-class 5-star, iconic property","amenities":["Free WiFi","Pool","Spa","Fine Dining","Airport Transfer","Concierge","Gym"],"tag":"Luxury"},
            ],
            "budget_split": {"flights":_int(budget*.35),"hotels":_int(budget*.35),"food_and_local":_int(budget*.20),"miscellaneous":_int(budget*.10)},
            "itinerary": [{"day":i+1,"title":f"Day {i+1}: {'Arrival & Explore' if i==0 else ('Departure Day' if i==days-1 else f'Discover {destination}')}", "morning":"Arrive and check in" if i==0 else "Breakfast and morning activity","afternoon":f"Visit top attractions in {destination}","evening":"Dinner at a recommended local restaurant"} for i in range(days)],
            "tips": [f"Carry valid photo ID at all times",f"Keep some cash (INR) for local vendors",f"Book major attractions online in advance","Use Uber/Ola for safe travel","Save emergency numbers offline"],
            "recommendation": f"{destination} is a wonderful destination with something for every traveller. Plan at least {days} full days to experience its best offerings.",
            "weather": {"temp_high":"32°C","temp_low":"22°C","condition":"Varies by season","best_time_note":"Check local seasonal calendar before booking"},
            "local_transport": ["Metro / Local Train","Auto-rickshaw (₹30–80/km)","Uber / Ola Cab","City Bus"],
            "emergency_contacts": {"police":"100","ambulance":"108","tourist_helpline":"1800-11-1363","local_emergency":"112"},
        }

        parsed = fallback

        if openai_client:
            try:
                system = (
                    "You are India's premier AI travel planner, used by the Ministry of Tourism for official travel planning. "
                    "You create highly accurate, detailed, realistic travel packages for Indian travellers. "
                    "You know real hotel names, airline routes, and realistic INR prices. "
                    "CRITICAL: NEVER use GoAir (shut down 2022), Jet Airways (shut down 2019), or Air Asia India (merged). "
                    "Active Indian airlines 2026: IndiGo, Air India, SpiceJet, Akasa Air. "
                    "For international routes also use: Emirates, Singapore Airlines, Thai, ANA, JAL, Etihad, Qatar, Lufthansa, British Airways. "
                    "Respond with valid JSON ONLY — no markdown, no explanation."
                )

                prompt = f"""Create a COMPLETE, PREMIUM travel package:

FROM: {origin}, India  →  TO: {destination}
Dates: {dep} to {ret} ({days} days) | Travelers: {travelers} | Type: {trip_type} | Budget: ₹{budget}

MANDATORY RULES — strictly enforced:
• EXACTLY 3 outbound flights (morning/afternoon/evening spread)
• EXACTLY 2 return flights
• EXACTLY 3 hotels: one 3-star (Budget Pick), one 4-star (Most Popular), one 5-star (Luxury)
• ALL hotel names must be REAL, existing hotels in {destination}
• Airlines must actually fly {origin}→{destination}
• ALL {days} itinerary days required, with specific place/restaurant names
• Realistic 2025–2026 INR pricing

IMPORTANT FOR FLIGHTS:
- Calculate REAL flight duration from {origin} to {destination} (e.g. Delhi→Tokyo = ~7h, Delhi→Dubai = ~3h, Delhi→Mumbai = ~2h)
- Use REAL airlines that operate this route (e.g. for international: Air India, IndiGo, Emirates, Singapore Airlines, Thai Airways etc.)
- Use realistic flight numbers and prices for this specific route
- departure_time and arrival_time must reflect the REAL duration (not always 2h 30m!)

Return this exact JSON structure with ALL fields filled with REAL, accurate data:
{{
  "flights": [
    {{"airline":"<real airline for {origin}→{destination}>","flight_number":"<real flight number>","departure_time":"{dep} HH:MM","arrival_time":"{dep} HH:MM","duration":"<real duration>","price":<realistic INR price>,"class":"Economy","stops":"<Non-stop or 1 stop>"}},
    {{"airline":"<different airline>","flight_number":"<number>","departure_time":"{dep} HH:MM","arrival_time":"{dep} HH:MM","duration":"<real duration>","price":<price>,"class":"Economy","stops":"<stops>"}},
    {{"airline":"<third airline>","flight_number":"<number>","departure_time":"{dep} HH:MM","arrival_time":"{dep} HH:MM","duration":"<real duration>","price":<higher price>,"class":"Business","stops":"<stops>"}}
  ],
  "return_flights": [
    {{"airline":"<airline>","flight_number":"<number>","departure_time":"{ret} HH:MM","arrival_time":"{ret} HH:MM","duration":"<real duration>","price":<price>,"class":"Economy","stops":"<stops>"}},
    {{"airline":"<airline>","flight_number":"<number>","departure_time":"{ret} HH:MM","arrival_time":"{ret} HH:MM","duration":"<real duration>","price":<price>,"class":"Economy","stops":"<stops>"}}
  ],
  "hotels": [
    {{"name":"<REAL 3-star hotel name in {destination}>","area":"<neighbourhood>","stars":3,"price_per_night":<price>,"total_price":<price*{days}>,"rating":<4.0-4.3>,"reason":"<why best budget>","amenities":["Free WiFi","AC","Hot Water","24hr Reception"],"tag":"Budget Pick"}},
    {{"name":"<REAL 4-star hotel name in {destination}>","area":"<neighbourhood>","stars":4,"price_per_night":<price>,"total_price":<price*{days}>,"rating":<4.3-4.6>,"reason":"<why most popular>","amenities":["Free WiFi","Pool","Breakfast","Gym","Room Service"],"tag":"Most Popular"}},
    {{"name":"<REAL 5-star hotel name in {destination}>","area":"<neighbourhood>","stars":5,"price_per_night":<price>,"total_price":<price*{days}>,"rating":<4.7-5.0>,"reason":"<why luxury>","amenities":["Free WiFi","Pool","Spa","Fine Dining","Airport Transfer","Concierge","Gym"],"tag":"Luxury"}}
  ],
  "budget_split": {{"flights":<total flight cost>,"hotels":<total hotel cost>,"food_and_local":<amount>,"miscellaneous":<amount>}},
  "itinerary": [{{"day":1,"title":"Day 1: Arrival & First Impressions","morning":"<specific activity>","afternoon":"<specific landmark in {destination}>","evening":"<specific restaurant name>"}}],
  "weather": {{"temp_high":"<temp>","temp_low":"<temp>","condition":"<condition>","best_time_note":"<advice>"}},
  "local_transport": ["<transport 1>","<transport 2>","<transport 3>","<transport 4>"],
  "emergency_contacts": {{"police":"<local number>","ambulance":"<local number>","tourist_helpline":"<number>","local_emergency":"<number>"}},
  "tips": ["<specific tip 1>","<specific tip 2>","<specific tip 3>","<specific tip 4>","<specific tip 5>"],
  "recommendation": "<2-3 sentences specific to {destination}>"
}}"""

                resp = openai_client.chat.completions.create(
                    model="gpt-4o-mini",
                    response_format={"type": "json_object"},
                    messages=[{"role":"system","content":system},{"role":"user","content":prompt}],
                    temperature=0.7,
                    max_tokens=4000,
                )
                ai = json.loads(resp.choices[0].message.content or "{}")
                if ai:
                    parsed = {k: ai.get(k, fallback[k]) for k in fallback}
                    if len(parsed.get("flights",  [])) < 2: parsed["flights"]  = fallback["flights"]
                    if len(parsed.get("hotels",   [])) < 2: parsed["hotels"]   = fallback["hotels"]
                    if len(parsed.get("itinerary",[])) < 1: parsed["itinerary"]= fallback["itinerary"]

            except Exception as e:
                print(f"⚠️  AI error: {e}")

        result = {
            "destination":destination,"origin":origin,"days":days,"budget":budget,
            "travelers":travelers,"trip_type":trip_type,
            "departure_date":dep,"return_date":ret,
            **{k: parsed[k] for k in ["flights","return_flights","hotels","budget_split","itinerary","tips","recommendation","weather","local_transport","emergency_contacts"]},
        }

        # Auto-save
        try:
            from db.mongo import db
            db.trips.insert_one({**result,"user_id":request.user_id,"created_at":datetime.utcnow(),"pinned":False})
            print(f"✅ Trip auto-saved for {request.user_id}")
        except Exception as e:
            print(f"⚠️  Auto-save skipped: {e}")

        return jsonify({"data": result}), 200

    except Exception as e:
        print(f"🔥 {e}")
        return jsonify({"error": "Internal server error"}), 500