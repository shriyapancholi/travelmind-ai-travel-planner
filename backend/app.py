from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import os

load_dotenv()

ALLOWED_ORIGINS = [
    "http://localhost:5500",
    "http://127.0.0.1:5500",
    "http://[::1]:5500",
]

def create_app():
    app = Flask(__name__)

    CORS(app,
         resources={r"/api/*": {"origins": ALLOWED_ORIGINS}},
         supports_credentials=True,
         allow_headers=["Content-Type", "Authorization"],
         methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"])

    try:
        from flask_limiter import Limiter
        from flask_limiter.util import get_remote_address
        limiter = Limiter(get_remote_address, app=app, default_limits=["200 per day", "50 per hour"])
        app.limiter = limiter
    except ImportError:
        print("⚠️  flask-limiter not installed")
        limiter = None

    from routes.auth     import auth_bp
    from routes.trips    import trips_bp
    from routes.generate import generate_bp
    from routes.chat     import chat_bp

    app.register_blueprint(auth_bp,     url_prefix="/api/auth")
    app.register_blueprint(trips_bp,    url_prefix="/api/trips")
    app.register_blueprint(generate_bp, url_prefix="/api/generate")
    app.register_blueprint(chat_bp,     url_prefix="/api/chat")

    if limiter:
        limiter.limit("10 per minute")(generate_bp)

    @app.route("/")
    def home():
        return jsonify({"message": "TravelMind API v2.0", "status": "running"})

    @app.route("/health")
    def health():
        try:
            from db.mongo import client
            client.admin.command("ping")
            db_status = "connected"
        except Exception as e:
            db_status = f"error: {e}"
        return jsonify({"status": "OK", "db": db_status})

    return app

app = create_app()

if __name__ == "__main__":
    print("🚀 TravelMind Backend v2.0 — http://localhost:5001")
    try:
        from db.mongo import client
        client.admin.command("ping")
        print("✅ MongoDB connected")
    except Exception as e:
        print(f"⚠️  MongoDB: {e}")
    app.run(host="0.0.0.0", port=5001, debug=True)