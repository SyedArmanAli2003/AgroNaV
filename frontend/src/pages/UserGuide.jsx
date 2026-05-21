import React from "react";
import { useNavigate } from "react-router-dom";
import { User, Users, BookOpen, CheckCircle, ArrowRight, Brain } from "lucide-react";

function GuideSection({ id, title, children }) {
  return (
    <section id={id} style={{ marginBottom: 56 }}>
      <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(20px,3vw,26px)", fontWeight: 700, color: "var(--text-primary)", borderBottom: "1px solid var(--glass-border)", paddingBottom: 12, marginBottom: 24 }}>{title}</h2>
      {children}
    </section>
  );
}

function StepCard({ n, title, children }) {
  return (
    <div className="glass-card" style={{ marginBottom: 16, borderLeft: "3px solid var(--color-primary)" }}>
      <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
        <div style={{ minWidth: 36, height: 36, borderRadius: "50%", background: "var(--color-primary)", color: "#fff", fontWeight: 700, fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-heading)" }}>{n}</div>
        <div>
          <h3 style={{ margin: "4px 0 10px", fontFamily: "var(--font-heading)", fontSize: 17, fontWeight: 600 }}>{title}</h3>
          {children}
        </div>
      </div>
    </div>
  );
}

function DemoAccount({ role, email, password, access, color }) {
  return (
    <div style={{ flex: 1, minWidth: 220, padding: "16px 20px", background: "var(--glass-bg)", borderRadius: "var(--radius-lg)", border: `1px solid ${color || "var(--glass-border)"}` }}>
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: color || "var(--color-primary)", marginBottom: 10 }}>{role}</div>
      <div style={{ fontSize: 13, marginBottom: 4 }}><b>Email:</b> <code style={{ fontSize: 12 }}>{email}</code></div>
      <div style={{ fontSize: 13, marginBottom: 8 }}><b>Password:</b> <code style={{ fontSize: 12 }}>{password}</code></div>
      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{access}</div>
    </div>
  );
}

function UserGuide() {
  const navigate = useNavigate();

  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  return (
    <div style={{ background: "var(--bg-base)", minHeight: "100vh", color: "var(--text-primary)", fontFamily: "var(--font-body)" }}>
      {/* Hero */}
      <div style={{ background: "radial-gradient(ellipse at 60% 0%, rgba(29,158,117,0.15) 0%, transparent 60%)", padding: "60px 24px 40px", textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <BookOpen size={28} color="var(--color-primary)" />
          <h1 style={{ margin: 0, fontFamily: "var(--font-heading)", fontSize: "clamp(28px,5vw,48px)", fontWeight: 700 }}>How to Use AgroNav</h1>
        </div>
        <p style={{ color: "var(--text-secondary)", fontSize: "clamp(15px,2vw,18px)", maxWidth: 600, margin: "0 auto 28px" }}>
          Your AI field intelligence guide — from morning to evening
        </p>
        {/* Nav pills */}
        <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
          {[["for-reps","For Reps"],["for-managers","For Managers"],["understanding-the-ai","Understanding the AI"],["demo-accounts","Try It Now"]].map(([id,label]) => (
            <button key={id} onClick={() => scrollTo(id)} style={{ padding: "8px 18px", borderRadius: 99, border: "1px solid var(--glass-border)", background: "var(--glass-bg)", color: "var(--text-secondary)", cursor: "pointer", fontSize: 13, fontWeight: 500, fontFamily: "var(--font-body)" }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 860, margin: "0 auto", padding: "0 20px 80px" }}>

        {/* Who uses AgroNav */}
        <GuideSection id="who" title="Who Uses AgroNav">
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <div className="glass-card" style={{ flex: 1, minWidth: 240 }}>
              <User size={28} color="var(--color-primary)" style={{ marginBottom: 10 }} />
              <div style={{ display: "inline-block", background: "rgba(29,158,117,0.15)", color: "var(--color-primary)", fontSize: 10, fontWeight: 700, borderRadius: 4, padding: "2px 8px", marginBottom: 10 }}>REP</div>
              <h3 style={{ margin: "0 0 10px", fontFamily: "var(--font-heading)" }}>Field Representative</h3>
              <p style={{ color: "var(--text-secondary)", fontSize: 14, margin: 0 }}>You are a Syngenta field rep. Every morning AgroNav tells you which retailers to visit, in what order, and exactly what to say.</p>
            </div>
            <div className="glass-card" style={{ flex: 1, minWidth: 240 }}>
              <Users size={28} color="#3b82f6" style={{ marginBottom: 10 }} />
              <div style={{ display: "inline-block", background: "rgba(59,130,246,0.15)", color: "#3b82f6", fontSize: 10, fontWeight: 700, borderRadius: 4, padding: "2px 8px", marginBottom: 10 }}>MANAGER</div>
              <h3 style={{ margin: "0 0 10px", fontFamily: "var(--font-heading)" }}>Area Manager</h3>
              <p style={{ color: "var(--text-secondary)", fontSize: 14, margin: 0 }}>You set up your territory, add retailers, manage your rep team, and track performance across the region.</p>
            </div>
          </div>
        </GuideSection>

        {/* Rep daily workflow */}
        <GuideSection id="for-reps" title="A Rep's Day With AgroNav">
          <StepCard n="1" title="Morning: Get Your Plan (7–8 AM)">
            <p style={{ color: "var(--text-secondary)", fontSize: 14, margin: "0 0 10px" }}>AgroNav ran overnight and ranked every retailer in your territory by conversion probability using a CatBoost model trained on 23,862 Syngenta field visits.</p>
            <ul style={{ color: "var(--text-secondary)", fontSize: 14, margin: 0, paddingLeft: 18, lineHeight: 1.9 }}>
              <li>Ranked list of 5–10 retailers (your daily plan)</li>
              <li>Priority score for each (0–100%)</li>
              <li>AI reason for each ranking (3 SHAP explanations)</li>
            </ul>
          </StepCard>
          <StepCard n="2" title="At Each Retailer: Get Your AI Brief">
            <p style={{ color: "var(--text-secondary)", fontSize: 14, margin: "0 0 10px" }}>Tap any retailer card to see a full briefing prepared by AI before you walk in.</p>
            <ul style={{ color: "var(--text-secondary)", fontSize: 14, margin: 0, paddingLeft: 18, lineHeight: 1.9 }}>
              <li>WHY this retailer was prioritized (3 SHAP reasons)</li>
              <li>WHAT product to recommend (and why now)</li>
              <li>3 talking points to start the conversation</li>
              <li>Agronomic advice tailored to the crop stage</li>
            </ul>
          </StepCard>
          <StepCard n="3" title="During the Visit: Use the Talking Points">
            <div className="glass-card" style={{ background: "rgba(29,158,117,0.06)", marginTop: 8, fontSize: 13 }}>
              <div style={{ fontWeight: 700, marginBottom: 8, color: "var(--color-primary)" }}>Example AI Brief</div>
              <div><b>Product:</b> Tilt 250 EC</div>
              <div style={{ marginTop: 6 }}><b>Talking Point 1:</b> Fungal pressure is high this week based on weather data.</div>
              <div style={{ marginTop: 4 }}><b>Talking Point 2:</b> This retailer hasn't stocked Tilt in 3 weeks — stock is critically low.</div>
              <div style={{ marginTop: 4 }}><b>Talking Point 3:</b> Kharif crop at critical stage — recommend preventive spray within 72 hours.</div>
            </div>
          </StepCard>
          <StepCard n="4" title="After the Visit: Log the Outcome (30 seconds)">
            <div className="glass-card" style={{ background: "rgba(29,158,117,0.06)", border: "1px solid var(--color-primary-dim)", marginTop: 8 }}>
              <div style={{ fontWeight: 700, marginBottom: 8, color: "var(--color-primary)", display: "flex", alignItems: "center", gap: 6 }}><CheckCircle size={14} /> Why this matters</div>
              <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0 }}>Every outcome you log = one training example for the AI. The model retrains every Sunday using your logs. After 4 weeks, your recommendations will be measurably more accurate.</p>
            </div>
            <ol style={{ color: "var(--text-secondary)", fontSize: 14, marginTop: 12, paddingLeft: 20, lineHeight: 2 }}>
              <li>Tap "Mark as Visited" on the retailer card</li>
              <li>Select the retailer from the dropdown</li>
              <li>Choose visit type and product</li>
              <li>Select outcome: Order Placed / Interested / Rejected</li>
              <li>Tap Submit — done in 30 seconds</li>
            </ol>
          </StepCard>
          <StepCard n="5" title="Working Without Internet">
            <p style={{ color: "var(--text-secondary)", fontSize: 14, margin: 0 }}>Download your plan once in the morning (needs 30 seconds). Then work all day offline — view all retailer details, log outcomes (saved locally), see alerts. Everything syncs automatically when you reconnect.</p>
          </StepCard>
        </GuideSection>

        {/* Manager setup */}
        <GuideSection id="for-managers" title="Manager Setup: Before Your Reps Can Use The App">
          <p style={{ color: "var(--color-urgent, #ef4444)", fontWeight: 600, marginBottom: 16, fontSize: 14 }}>Managers must complete setup before reps see any data</p>
          <div className="glass-card" style={{ marginBottom: 20 }}>
            {[
              "Create your manager account at /signup",
              "Add retailers to your territory (Manager Portal → Retailers → Add Retailer)",
              "Add reps to your team (Manager Portal → My Team → Add Rep)",
              "Assign territory to each rep",
              "Verify reps see their daily plan"
            ].map((step, i) => (
              <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "10px 0", borderBottom: i < 4 ? "1px solid var(--glass-border)" : "none" }}>
                <div style={{ width: 22, height: 22, borderRadius: "50%", background: "var(--color-primary)", color: "#fff", fontWeight: 700, fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{i + 1}</div>
                <span style={{ fontSize: 14, color: "var(--text-secondary)" }}>{step}</span>
              </div>
            ))}
          </div>
          <div className="glass-card" style={{ borderLeft: "3px solid var(--color-urgent, #ef4444)" }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Without retailers added, reps see an empty app</div>
            <p style={{ fontSize: 14, color: "var(--text-secondary)", margin: 0 }}>Go to Manager Portal → Retailers → Add Retailer. Add every retailer in your territory (typically 8–15 shops). You only do this once.</p>
          </div>
        </GuideSection>

        {/* Understanding the AI */}
        <GuideSection id="understanding-the-ai" title="How AgroNav's AI Works">
          <div className="glass-card" style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <Brain size={20} color="var(--color-primary)" />
              <h3 style={{ margin: 0, fontFamily: "var(--font-heading)" }}>The Model</h3>
            </div>
            <p style={{ fontSize: 14, color: "var(--text-secondary)", margin: "0 0 16px" }}>AgroNav uses a CatBoost binary classifier that predicts the probability a visit will result in a sale within 7 days.</p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {[["AUC","0.7869"],["Training visits","23,862"],["Features","28"]].map(([k,v]) => (
                <div key={k} style={{ padding: "10px 18px", background: "var(--glass-bg)", borderRadius: "var(--radius-md)", border: "1px solid var(--glass-border)", textAlign: "center" }}>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase" }}>{k}</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: "var(--color-primary)", fontFamily: "var(--font-heading)" }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="glass-card" style={{ marginBottom: 14 }}>
            <h3 style={{ fontFamily: "var(--font-heading)", marginTop: 0 }}>What SHAP Means</h3>
            <p style={{ fontSize: 14, color: "var(--text-secondary)", margin: 0 }}>SHAP (SHapley Additive exPlanations) converts the model's math into plain English. Instead of just "score: 0.87", SHAP explains: "Stock critically low (+0.6), Peak crop season (+0.4), No visit in 21 days (+0.3)." Every reason in AgroNav comes from real SHAP values.</p>
          </div>
          <div className="glass-card">
            <h3 style={{ fontFamily: "var(--font-heading)", marginTop: 0 }}>The Learning Loop</h3>
            <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 6, fontSize: 13 }}>
              {["Morning: AI ranks retailers", "Rep visits + logs outcome", "Sunday: Model retrains", "Monday: Better recommendations"].map((step, i, arr) => (
                <React.Fragment key={step}>
                  <div style={{ padding: "8px 14px", background: "var(--glass-bg)", borderRadius: 99, border: "1px solid var(--glass-border)", color: "var(--text-secondary)" }}>{step}</div>
                  {i < arr.length - 1 && <ArrowRight size={14} color="var(--color-primary)" />}
                </React.Fragment>
              ))}
            </div>
            <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 14, marginBottom: 0, fontStyle: "italic" }}>A rep who logs every visit gets measurably better recommendations after 2–3 weeks.</p>
          </div>
        </GuideSection>

        {/* Demo accounts */}
        <GuideSection id="demo-accounts" title="Try AgroNav Right Now">
          <div className="glass-card" style={{ borderLeft: "3px solid var(--color-primary)", marginBottom: 20 }}>
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
              <DemoAccount role="Admin" email="admin@agronav.com" password="Admin1234!" access="Full system access" color="#7c3aed" />
              <DemoAccount role="Manager" email="manager@agronav.com" password="Manager1234!" access="Add retailers, manage reps" color="#3b82f6" />
              <DemoAccount role="Rep" email="rep@agronav.com" password="Rep1234!" access="Daily plan, visit briefs, log outcomes" color="var(--color-primary)" />
            </div>
          </div>
          <button className="btn-primary" style={{ display: "flex", alignItems: "center", gap: 8, width: "auto", padding: "13px 24px" }} onClick={() => navigate("/signin")}>
            Go to Sign In <ArrowRight size={16} />
          </button>
        </GuideSection>
      </div>
    </div>
  );
}

export default UserGuide;
