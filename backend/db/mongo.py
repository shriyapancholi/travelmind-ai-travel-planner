from pymongo import MongoClient
import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from backend/ first, then fallback to project root
load_dotenv()
load_dotenv(dotenv_path=Path(__file__).resolve().parent.parent.parent / ".env")

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/travelmind")

client = MongoClient(
    MONGO_URI,
    tls=False,
    serverSelectionTimeoutMS=5000,
    connectTimeoutMS=5000,
)

db = client["travelmind"]