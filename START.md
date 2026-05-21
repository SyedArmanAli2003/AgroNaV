# How to start AgroNav

## Backend (Terminal 1)
cd "D:\Sygenta hackathon\AgroNaV\backend"
create virtual environment
venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

## Frontend (Terminal 2)
cd "D:\Sygenta hackathon\AgroNaV\frontend"
npm install
npm start

## Before every demo
GET http://localhost:8000/api/demo/reset

## If database is missing
python db/init_db.py
python db/seed.py
