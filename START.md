# How to start AgroNav

## Backend (Terminal 1)
cd "D:\Sygenta hackathon\AgroNaV\backend"
venv\Scripts\activate
uvicorn main:app --reload --port 8000

## Frontend (Terminal 2)
cd "D:\Sygenta hackathon\AgroNaV\frontend"
npm start

## Before every demo
GET http://localhost:8000/api/demo/reset

## If database is missing
python db/init_db.py
python db/seed.py
