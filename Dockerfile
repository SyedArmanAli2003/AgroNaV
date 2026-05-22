# Stage 1: Build React frontend
FROM node:18-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
ARG REACT_APP_API_URL=""
ENV REACT_APP_API_URL=$REACT_APP_API_URL
RUN npm run build

# Stage 2: Run Python FastAPI backend
FROM python:3.12-slim
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy ML source and trained models (backend imports from ml.model_1.*)
COPY ml/ /app/ml/

# Copy backend application
COPY backend/ /app/backend/

# Copy Syngenta dataset CSVs (needed for DB seeding on first startup)
# Stored at /app/ so DATASET_DIR in seed_demo.py can find them
COPY ["Syngenta_IITM_Hackathon_2026_dataset (1)/", "/app/Syngenta_IITM_Hackathon_2026_dataset (1)/"]

# Copy React build from Stage 1
COPY --from=frontend-builder /app/frontend/build /app/frontend/build

# Set working directory to backend
WORKDIR /app/backend

EXPOSE 8080
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
