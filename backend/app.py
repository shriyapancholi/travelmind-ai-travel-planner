from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

from routes.auth import auth_bp
from routes.trips import trips_bp
from routes.generate import generate_bp


def create_app():
    app = Flask(__name__)
    app.url_map.strict_slashes = False
    CORS(app)

    # Register blueprints
    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(trips_bp, url_prefix="/api/trips")
    app.register_blueprint(generate_bp, url_prefix="/api/generate")

    @app.route("/")
    def home():
        return jsonify({"message": "TravelMind Backend Running"})

    @app.route("/health")
    def health():
        return jsonify({"status": "OK"})

    @app.route("/test-db")
    def test_db():
        try:
            from db.mongo import db, client
            # Verify connection is alive
            client.admin.command("ping")
            # Insert a test document
            result = db.test.insert_one({"msg": "MongoDB Connected", "status": "ok"})
            return jsonify({
                "message": "MongoDB Connected Successfully",
                "inserted_id": str(result.inserted_id),
            })
        except Exception as e:
            return jsonify({"error": f"MongoDB connection failed: {str(e)}"}), 500

    return app


app = create_app()

if __name__ == "__main__":
    print("🚀 TravelMind Backend starting on http://localhost:5001")
    try:
        from db.mongo import client
        client.admin.command("ping")
        print("✅ MongoDB connected successfully")
    except Exception as e:
        print(f"⚠️  MongoDB connection warning: {e}")
    app.run(host="0.0.0.0", port=5001, debug=True)