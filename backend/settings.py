# What it does: Loads environment variables for the application
# Input: .env file in the same directory
# Output: Module-level constants for database, API keys, environment
# Called by: main.py, services/*, and any module needing config

import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///agronav.db")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
JWT_SECRET = os.getenv("JWT_SECRET", "")

ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3002")
