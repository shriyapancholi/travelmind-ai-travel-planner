from flask import Blueprint, request, jsonify
from openai import OpenAI
import os, jwt
from functools import wraps
from dotenv import load_dotenv

load_dotenv()

api_key    = os.getenv("OPENAI_API_KEY")
JWT_SECRET = os.getenv("JWT_SECRET")
openai_client = OpenAI(api_key=api_key) if api_key else None

chat_bp = Blueprint("chat", __name__)

def token_required(f):
    @wraps(f)
    def inner(*a, **kw):
        auth  = request.headers.get("Authorization", "")
        token = auth.split(" ")[1] if auth.startswith("Bearer ") else None
        if not token: return jsonify({"error": "Token missing"}), 401
        try:
            p = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
            request.user_id = p.get("user_id")
        except: return jsonify({"error": "Invalid token"}), 401
        return f(*a, **kw)
    return inner

SYSTEM_PROMPT = """You are TravelMind AI — an expert Indian travel assistant with deep knowledge of:
- Indian domestic destinations (Goa, Manali, Kerala, Jaipur, Varanasi, Andaman, Ladakh, etc.)
- International travel from India (visa requirements, flight routes, costs in INR)
- Indian airlines (IndiGo, Air India, SpiceJet, Akasa Air)
- Hotel categories and pricing in INR
- Indian travel seasons, festivals, weather patterns
- Budget travel tips for Indian travellers
- Travel documents, insurance, and safety

You give practical, specific advice. Always mention prices in INR (₹).
Keep responses concise but helpful — 3-5 sentences max unless user asks for detail.
If user shares their trip details, use that context to give personalized advice.
Be friendly and conversational. Use occasional emojis to keep it engaging."""

@chat_bp.route("/", methods=["POST"])
@token_required
def chat():
    try:
        data     = request.get_json(force=True)
        messages = data.get("messages", [])
        trip_ctx = data.get("trip_context", None)

        if not messages:
            return jsonify({"error": "No messages provided"}), 400

        if not openai_client:
            return jsonify({"reply": "AI service is not configured. Please add OPENAI_API_KEY to your .env file."}), 200

        system = SYSTEM_PROMPT
        if trip_ctx:
            system += f"\n\nUser's current trip context:\n- Destination: {trip_ctx.get('destination','')}\n- Origin: {trip_ctx.get('origin','')}\n- Dates: {trip_ctx.get('departure_date','')} to {trip_ctx.get('return_date','')}\n- Duration: {trip_ctx.get('days','')} days\n- Budget: ₹{trip_ctx.get('budget','')}\n- Trip Type: {trip_ctx.get('trip_type','')}\nUse this context to give personalized advice when relevant."

        # Keep last 10 messages for context
        recent = messages[-10:]

        response = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "system", "content": system}] + recent,
            temperature=0.7,
            max_tokens=500,
        )

        reply = response.choices[0].message.content
        return jsonify({"reply": reply}), 200

    except Exception as e:
        print(f"Chat error: {e}")
        return jsonify({"error": "Chat service error"}), 500