from flask import Flask
from flask_cors import CORS
from pymongo import MongoClient
import os
from dotenv import load_dotenv
import certifi

# import routes
from routes.auth import auth_bp
from routes.trips import trips_bp
from routes.generate import generate_bp

load_dotenv()

app = Flask(__name__)
CORS(app)

# MongoDB connection
client = MongoClient(
    os.getenv("MONGO_URI"),
    tlsCAFile=certifi.where()
)

db = client["travelmind"]

# register blueprints
app.register_blueprint(auth_bp, url_prefix="/api/auth")
app.register_blueprint(trips_bp, url_prefix="/api/trips")
app.register_blueprint(generate_bp, url_prefix="/api/generate")

@app.route("/")
def home():
    return {"message": "TravelMind Backend Running"}

@app.route("/test-db")
def test_db():
    db.test.insert_one({"msg": "DB Connected"})
    return {"message": "MongoDB Connected"}

if __name__ == "__main__":
    app.run(debug=True)