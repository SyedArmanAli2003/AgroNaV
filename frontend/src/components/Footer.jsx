import React from "react";
import { useNavigate } from "react-router-dom";
import { Leaf } from "lucide-react";

function Footer() {
  const navigate = useNavigate();

  const handleNav = (path) => {
    if (path.startsWith("#")) {
      if (window.location.pathname !== "/") {
        navigate("/");
        setTimeout(() => {
          document.getElementById(path.substring(1))?.scrollIntoView({ behavior: "smooth" });
        }, 100);
      } else {
        document.getElementById(path.substring(1))?.scrollIntoView({ behavior: "smooth" });
      }
    } else {
      navigate(path);
    }
  };

  return (
    <footer
      style={{
        background: "rgba(10, 11, 15, 0.95)",
        borderTop: "1px solid var(--border-subtle, rgba(255,255,255,0.08))",
        padding: "48px 24px 24px 24px",
        marginTop: "auto",
        fontFamily: "'Poppins', sans-serif"
      }}
    >
      <div
        className="footer-cols"
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "40px",
          maxWidth: "1200px",
          margin: "0 auto 40px auto",
          flexWrap: "wrap"
        }}
      >
        {/* LEFT */}
        <div style={{ flex: "1 1 250px", display: "flex", flexDirection: "column", gap: "12px" }}>
          <div
            style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}
            onClick={() => handleNav("/")}
          >
            <Leaf size={24} color="#1D9E75" />
            <span style={{ fontWeight: 600, fontSize: "20px", color: "var(--text-primary)" }}>
              AgroNav
            </span>
          </div>
          <div style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
            AI-guided field intelligence
          </div>
          <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
            Built for IITM Syngenta Hackathon 2026
          </div>
        </div>

        {/* CENTER */}
        <div style={{ flex: "1 1 200px", display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "1px", color: "var(--text-muted)", fontWeight: 700 }}>
            Navigation
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <span onClick={() => handleNav("/")} style={{ fontSize: "14px", color: "var(--text-secondary)", cursor: "pointer", transition: "color 0.2s" }} onMouseEnter={e => e.currentTarget.style.color = "white"} onMouseLeave={e => e.currentTarget.style.color = "var(--text-secondary)"}>Home</span>
            <span onClick={() => handleNav("/dashboard")} style={{ fontSize: "14px", color: "var(--text-secondary)", cursor: "pointer", transition: "color 0.2s" }} onMouseEnter={e => e.currentTarget.style.color = "white"} onMouseLeave={e => e.currentTarget.style.color = "var(--text-secondary)"}>Dashboard</span>
            <span onClick={() => handleNav("/alerts")} style={{ fontSize: "14px", color: "var(--text-secondary)", cursor: "pointer", transition: "color 0.2s" }} onMouseEnter={e => e.currentTarget.style.color = "white"} onMouseLeave={e => e.currentTarget.style.color = "var(--text-secondary)"}>Alert Feed</span>
            <span onClick={() => handleNav("/about")} style={{ fontSize: "14px", color: "var(--text-secondary)", cursor: "pointer", transition: "color 0.2s" }} onMouseEnter={e => e.currentTarget.style.color = "white"} onMouseLeave={e => e.currentTarget.style.color = "var(--text-secondary)"}>About</span>
            <span onClick={() => handleNav("/signin")} style={{ fontSize: "14px", color: "var(--text-secondary)", cursor: "pointer", transition: "color 0.2s" }} onMouseEnter={e => e.currentTarget.style.color = "white"} onMouseLeave={e => e.currentTarget.style.color = "var(--text-secondary)"}>Sign In</span>
          </div>
        </div>

        {/* RIGHT */}
        <div style={{ flex: "1 1 200px", display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "1px", color: "var(--text-muted)", fontWeight: 700 }}>
            Powered By
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "14px", color: "var(--text-secondary)" }}>
            <div>Gemini AI</div>
            <div>CatBoost</div>
            <div>FastAPI</div>
          </div>
        </div>
      </div>

      {/* BOTTOM ROW */}
      <div
        style={{
          borderTop: "1px solid rgba(255,255,255,0.05)",
          paddingTop: "20px",
          textAlign: "center",
          fontSize: "12px",
          color: "var(--text-muted)",
          maxWidth: "1200px",
          margin: "0 auto"
        }}
      >
        © 2026 AgroNav Team · IITM Hackathon · Built with care for Indian farmers
      </div>
    </footer>
  );
}

export default Footer;
