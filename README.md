# AgroNav 🚀 — Intelligent Field Sales Assistant

**AgroNav** is a premium, offline-first Progressive Web App (PWA) designed for Syngenta field sales representatives. It transforms data into actionable intelligence, guiding reps to the right outlets at the right time with AI-driven guidance.

---

## 🌟 Key Features

### 1. **Intelligent Prioritization**
*   **Dynamic Ranking:** Outlets are ranked daily based on stock levels, pest outbreaks, and historical sales spikes.
*   **Learning Boost:** The system re-calibrates rankings based on the rep's historical conversion success.
*   **Recalibrate Button:** Real-time priority updates as new data arrives.

### 2. **AI-Driven Guidance (NBA)**
*   **Next Best Action (NBA):** Every visit comes with a tailored "Product + Pitch + Agronomic Tip" card.
*   **Rationale:** Clear "Why Now" explanations (e.g., "Active pest alert + stock running low").

### 3. **Offline-First Architecture**
*   **Morning Sync:** Downloads the entire daily plan for use in zero-connectivity areas.
*   **Outcome Queuing:** Log sales and orders while offline; the app auto-syncs when the network returns.

### 4. **Outcome Scoring & Analytics**
*   **Quality Scoring:** Every visit is scored (0-100) based on results and rejection reasons.
*   **Performance Tracking:** Interactive charts showing acceptance rates over time.

### 5. **Premium Dark UI**
*   Modern **Glassmorphism** design system.
*   Custom **Capsule Navigation** for mobile-friendly use.
*   Visual cues for high-priority actions.

---

## 🛠️ Tech Stack

### **Frontend**
*   **React 18** (Modern functional components & Hooks)
*   **PWA** (Service Workers & Manifest)
*   **React Router 7** (SPA Navigation)
*   **Bootstrap 5** + **Vanilla CSS** (Custom Design System)
*   **React Google Charts** (Data Visualization)

### **Backend**
*   **FastAPI** (Python 3.x)
*   **Uvicorn** (Asynchronous Server)
*   **SQLite (aiosqlite)** (Asynchronous DB)
*   **Pydantic** (Schema Validation)

### **AI / ML Layer**
*   **Google Gemini API Integration** (Personalized pitches)
*   **Custom Scoring Engine** (Python-based outcome calculation)
*   **Recalibration Logic** (Learning-based re-ranking)

---

## 🚀 Getting Started

### 1. Prerequisites
*   Python 3.10+
*   Node.js 18+

### 2. Backend Setup
```bash
cd backend
pip install -r requirements.txt
python main.py
```
*Backend runs on `http://localhost:8000`*

### 3. Frontend Setup
```bash
cd frontend
npm install
npm start
```
*Frontend runs on `http://localhost:3002`*

### 4. API Keys
To enable full AI and Map functionality, add your keys:
*   **Backend:** Add `GEMINI_API_KEY` to `backend/.env`
*   **Frontend:** Add `REACT_APP_GOOGLE_MAPS_API_KEY` to `frontend/.env`

---

## 📂 Project Structure
*   `/backend`: FastAPI app, database schemas, and AI services.
*   `/frontend`: React PWA codebase and modern design system.
*   `/ml`: Placeholder for advanced ranking and anomaly detection models.
*   `/mobile`: Prepared React Native source for mobile delivery.

---

## 🏆 Hackathon Context
This project was developed for the **Syngenta Hackathon** to solve the challenge of field force efficiency in varying network conditions.

**Developer:** Syed Arman Ali (2003)
**GitHub:** [SyedArmanAli2003/AgroNaV](https://github.com/SyedArmanAli2003/AgroNaV)
