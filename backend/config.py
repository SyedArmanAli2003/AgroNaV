# What it does: Loads environment variables for the application
# Input: .env file in the same directory
# Output: Module-level constants for database, API keys, environment
# Called by: main.py, services/gemini.py, and any module needing config

import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///agronav.db")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GOOGLE_MAPS_KEY = os.getenv("GOOGLE_MAPS_KEY", "")
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
