# Stage 1: Build React frontend
FROM node:18-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
ENV REACT_APP_API_URL=""
RUN npm run build

# Stage 2: Run Python FastAPI backend
FROM python:3.12-slim
WORKDIR /app

# Install system dependencies if any
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source
COPY src/ /app/src/
COPY models/ /app/models/
COPY backend/ /app/backend/
# Copy build files from Stage 1
COPY --from=frontend-builder /app/frontend/build /app/frontend/build

# Set working directory to backend
WORKDIR /app/backend

# Expose port
EXPOSE 8080

# Run with uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
