import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Leaf, ArrowLeft, ShieldAlert, Cpu, Sparkles } from "lucide-react";
import Footer from "../components/Footer";
import "../css/landing.css";

function About() {
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <>
      <video
        className="video-bg"
        src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260315_073750_51473149-4350-4920-ae24-c8214286f323.mp4"
        autoPlay
        loop
        muted
        playsInline
      />
      <div className="content-layer" style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        
        {/* Main Content Area */}
        <div style={{ flex: 1, padding: "40px 20px", maxWidth: "900px", margin: "0 auto", width: "100%", fontFamily: "'Poppins', sans-serif" }}>
          
          {/* Back button */}
          <button
            onClick={() => navigate("/")}
            className="liquid-glass hover-scale"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 20px",
              borderRadius: "var(--radius-pill)",
              color: "var(--text-primary)",
              border: "none",
              cursor: "pointer",
              marginBottom: "32px"
            }}
          >
            <ArrowLeft size={16} /> Back to Home
          </button>

          {/* 1. Hero Section */}
          <div 
            className="liquid-glass-strong"
            style={{
              borderRadius: "var(--radius-lg)",
              padding: "48px 32px",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "16px",
              marginBottom: "32px"
            }}
          >
            <Leaf size={48} color="#1D9E75" />
            <h1 style={{ fontWeight: 600, fontSize: "clamp(28px, 4vw, 42px)", margin: 0, color: "var(--text-primary)" }}>
              AgroNav — AI Field Intelligence for Syngenta
            </h1>
            <p style={{ fontSize: "16px", color: "var(--text-secondary)", maxWidth: "600px", margin: 0 }}>
              Empowering sales representatives in rural India with offline-first, closed-loop visit routing and next best actions.
            </p>
          </div>

          {/* 2. The Problem */}
          <div 
            className="liquid-glass"
            style={{
              borderRadius: "var(--radius-lg)",
              padding: "32px",
              marginBottom: "32px"
            }}
          >
            <h2 style={{ fontWeight: 600, fontSize: "22px", color: "var(--text-primary)", marginBottom: "12px", display: "flex", alignItems: "center", gap: "10px" }}>
              <ShieldAlert size={20} color="#FF6B7A" /> The Problem
            </h2>
            <p style={{ fontSize: "15px", color: "var(--text-secondary)", lineHeight: 1.6, margin: 0 }}>
              Fixed rotation schedules fail when pest, weather, inventory, and competitor conditions change every day. Field reps have no data, no guidance, and no feedback loop.
            </p>
          </div>

          {/* 3. Our Solution */}
          <div style={{ marginBottom: "32px" }}>
            <h2 style={{ fontWeight: 600, fontSize: "22px", color: "var(--text-primary)", marginBottom: "16px", display: "flex", alignItems: "center", gap: "10px" }}>
              <Sparkles size={20} color="#FFD166" /> Our Solution
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
              
              <div className="liquid-glass-strong" style={{ borderRadius: "var(--radius-md)", padding: "20px" }}>
                <h3 style={{ fontWeight: 600, fontSize: "16px", color: "var(--text-primary)", marginTop: 0, marginBottom: "8px" }}>
                  Priority Scoring
                </h3>
                <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.5, margin: 0 }}>
                  Ranks daily visits dynamically using conversion probability so reps hit the highest-value shops first.
                </p>
              </div>

              <div className="liquid-glass-strong" style={{ borderRadius: "var(--radius-md)", padding: "20px" }}>
                <h3 style={{ fontWeight: 600, fontSize: "16px", color: "var(--text-primary)", marginTop: 0, marginBottom: "8px" }}>
                  Next Best Action
                </h3>
                <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.5, margin: 0 }}>
                  Delivers real-time agronomic coaching, tailored product pitches, and active promotions per shop.
                </p>
              </div>

              <div className="liquid-glass-strong" style={{ borderRadius: "var(--radius-md)", padding: "20px" }}>
                <h3 style={{ fontWeight: 600, fontSize: "16px", color: "var(--text-primary)", marginTop: 0, marginBottom: "8px" }}>
                  Anomaly Detection
                </h3>
                <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.5, margin: 0 }}>
                  Flags unusual sales spikes or sudden inventory drops instantly to prevent critical stockouts.
                </p>
              </div>

              <div className="liquid-glass-strong" style={{ borderRadius: "var(--radius-md)", padding: "20px" }}>
                <h3 style={{ fontWeight: 600, fontSize: "16px", color: "var(--text-primary)", marginTop: 0, marginBottom: "8px" }}>
                  Offline PWA
                </h3>
                <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.5, margin: 0 }}>
                  Guarantees full operability on the field with offline plan caching and automatic log queuing.
                </p>
              </div>

            </div>
          </div>

          {/* 4. The Model */}
          <div 
            className="liquid-glass"
            style={{
              borderRadius: "var(--radius-lg)",
              padding: "32px",
              marginBottom: "32px"
            }}
          >
            <h2 style={{ fontWeight: 600, fontSize: "22px", color: "var(--text-primary)", marginBottom: "12px", display: "flex", alignItems: "center", gap: "10px" }}>
              <Cpu size={20} color="#1D9E75" /> The Model
            </h2>
            <p style={{ fontSize: "14px", color: "var(--text-secondary)", lineHeight: 1.6, margin: 0 }}>
              The ranking model is a CatBoost binary classifier with a test AUC of 0.7869, trained on 23,862 real field visit records. It takes 28 inputs — covering inventory, crop calendar, visit history, pest alerts, and sales velocity — and outputs the probability that a visit will result in a sale within 7 days. Top-3 SHAP values generate plain-language reasons for each recommendation. Model training and maintenance is owned by the ML team.
            </p>
          </div>

          {/* 5. Team */}
          <div 
            className="liquid-glass-strong"
            style={{
              borderRadius: "var(--radius-lg)",
              padding: "24px",
              textAlign: "center",
              marginBottom: "32px"
            }}
          >
            <div style={{ fontSize: "15px", color: "var(--text-primary)", fontWeight: 500 }}>
              Built for IITM Syngenta Hackathon 2026 by the AgroNav team.
            </div>
          </div>

        </div>

        {/* 6. Shared Footer */}
        <Footer />
      </div>
    </>
  );
}

export default About;
