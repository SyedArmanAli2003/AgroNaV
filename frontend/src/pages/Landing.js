import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Leaf, ArrowRight, Sparkles, MapPin, BookOpen, MessageCircle, Users, Globe, Menu } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Footer from '../components/Footer';
import '../css/landing.css';

// --- Sub-Components ---

function LeftPanel({ navigate, onOpenMenu, onScrollTo }) {
  return (
    <div className="panel-left">
      <div className="liquid-glass-strong panel-left-glass" style={{ display: 'flex', flexDirection: 'column' }}>
        
        {/* NAV BAR */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px' }}>
          <div style={{ display: 'flex', flexDirection: 'row', gap: '10px', alignItems: 'center' }}>
            <Leaf size={24} color="white" />
            <span style={{ fontFamily: 'Poppins', fontWeight: 600, fontSize: '22px', letterSpacing: '-0.03em', color: 'var(--text-primary)' }}>
              AgroNav
            </span>
          </div>
          <div 
            className="liquid-glass hover-scale" 
            style={{ borderRadius: 'var(--radius-pill)', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-secondary)', cursor: 'pointer' }}
            onClick={onOpenMenu}
          >
            Menu <Menu size={16} />
          </div>
        </div>

        {/* HERO CENTER */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '40px 32px', gap: '24px' }}>
          <Leaf size={64} color="white" style={{ opacity: 0.9 }} />
          
          <h1 style={{ fontFamily: 'Poppins', fontWeight: 500, fontSize: 'clamp(42px, 6vw, 72px)', letterSpacing: '-0.05em', lineHeight: 1.05, color: 'var(--text-primary)', margin: 0 }}>
            Smarter visits,<br />
            better harvests<br />
            <em style={{ fontFamily: "'Source Serif 4', serif", fontStyle: 'italic', color: 'rgba(255,255,255,0.80)', fontSize: '85%' }}>
              AI-guided field intelligence
            </em>
          </h1>

          <div 
            className="liquid-glass-strong hover-scale" 
            style={{ borderRadius: 'var(--radius-pill)', padding: '14px 28px', display: 'flex', alignItems: 'center', gap: '12px', fontFamily: 'Poppins', fontWeight: 500, fontSize: '15px', color: 'var(--text-primary)', cursor: 'pointer' }}
            onClick={() => navigate('/dashboard')}
          >
            Get Started
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ArrowRight size={14} color="white" />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'row', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <div 
              className="liquid-glass hover-scale" 
              style={{ borderRadius: 'var(--radius-pill)', padding: '6px 16px', fontSize: '12px', fontFamily: 'Poppins', color: 'var(--text-secondary)', cursor: 'pointer' }}
              onClick={() => onScrollTo('features')}
            >
              Priority Routing
            </div>
            <div 
              className="liquid-glass hover-scale" 
              style={{ borderRadius: 'var(--radius-pill)', padding: '6px 16px', fontSize: '12px', fontFamily: 'Poppins', color: 'var(--text-secondary)', cursor: 'pointer' }}
              onClick={() => onScrollTo('nba-section')}
            >
              NBA Recommendations
            </div>
            <div 
              className="liquid-glass hover-scale" 
              style={{ borderRadius: 'var(--radius-pill)', padding: '6px 16px', fontSize: '12px', fontFamily: 'Poppins', color: 'var(--text-secondary)', cursor: 'pointer' }}
              onClick={() => onScrollTo('offline-section')}
            >
              Offline First
            </div>
          </div>
        </div>

        {/* BOTTOM QUOTE */}
        <div style={{ padding: '20px 32px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ fontSize: '10px', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: '8px', fontFamily: 'Poppins' }}>
            AI-GUIDED FIELD INTELLIGENCE
          </div>
          <div style={{ fontSize: '14px', color: 'var(--text-secondary)', fontFamily: 'Poppins' }}>
            <span>We bring intelligence to </span>
            <span style={{ fontFamily: "'Source Serif 4', serif", fontStyle: 'italic', color: 'var(--text-primary)' }}>every field visit.</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '12px', marginTop: '10px' }}>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.2)' }} />
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'Poppins' }}>Arjun Kumar, Nalgonda</div>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.2)' }} />
          </div>
        </div>

      </div>
    </div>
  );
}

function RightPanel({ navigate, isAuthenticated, user, logout, showAccountDropdown, setShowAccountDropdown }) {
  const handleAccountClick = () => {
    if (isAuthenticated) {
      setShowAccountDropdown(!showAccountDropdown);
    } else {
      navigate('/signin');
    }
  };

  const handleSignOut = () => {
    logout();
    setShowAccountDropdown(false);
    navigate('/');
  };

  return (
    <div className="panel-right">
      
      {/* TOP BAR */}
      <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'auto', position: 'relative' }}>
        <div className="liquid-glass hover-scale" style={{ borderRadius: 'var(--radius-pill)', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="icon-circle" style={{ cursor: 'pointer' }} onClick={() => navigate('/alerts')}>
            <MessageCircle size={16} color="var(--text-primary)" />
          </div>
          <div className="icon-circle" style={{ cursor: 'pointer' }} onClick={() => navigate('/manager')}>
            <Users size={16} color="var(--text-primary)" />
          </div>
          <div className="icon-circle" style={{ cursor: 'pointer' }} onClick={() => navigate('/dashboard')}>
            <Globe size={16} color="var(--text-primary)" />
          </div>
          <div style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.2)' }} />
          <ArrowRight size={16} color="var(--text-muted)" style={{ cursor: 'pointer' }} onClick={() => navigate('/dashboard')} />
        </div>

        <div style={{ position: 'relative' }}>
          <div 
            className="liquid-glass hover-scale" 
            style={{ borderRadius: 'var(--radius-pill)', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)', cursor: 'pointer' }}
            onClick={handleAccountClick}
          >
            <Sparkles size={16} />
            <span style={{ fontSize: '13px', fontFamily: 'Poppins' }}>
              {isAuthenticated ? (user?.name || "Account") : "Account"}
            </span>
          </div>
          {showAccountDropdown && isAuthenticated && (
            <div 
              className="liquid-glass-strong" 
              style={{ 
                position: 'absolute', top: '100%', right: 0, marginTop: '8px', zIndex: 100, 
                borderRadius: 'var(--radius-md)', padding: '8px 0', minWidth: '150px', 
                display: 'flex', flexDirection: 'column', gap: '4px',
                border: '1px solid rgba(255,255,255,0.08)'
              }}
            >
              <span style={{ padding: '4px 16px', fontSize: '11px', color: 'var(--text-muted)' }}>Hello, {user?.name}</span>
              <div 
                style={{ padding: '8px 16px', fontSize: '13px', color: 'var(--text-secondary)', cursor: 'pointer' }}
                onClick={() => { navigate('/dashboard'); setShowAccountDropdown(false); }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
              >
                Dashboard
              </div>
              <div 
                style={{ padding: '8px 16px', fontSize: '13px', color: 'var(--text-secondary)', cursor: 'pointer' }}
                onClick={() => { navigate('/manager'); setShowAccountDropdown(false); }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
              >
                Manager KPIs
              </div>
              <div 
                style={{ padding: '8px 16px', fontSize: '13px', color: '#ef4444', cursor: 'pointer' }}
                onClick={handleSignOut}
                onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1.2)'}
                onMouseLeave={e => e.currentTarget.style.filter = 'none'}
              >
                Sign Out
              </div>
            </div>
          )}
        </div>
      </div>

      {/* COMMUNITY CARD */}
      <div 
        className="liquid-glass interactive-card" 
        style={{ width: '220px', marginTop: '24px', borderRadius: 'var(--radius-lg)', padding: '16px 18px', alignSelf: 'flex-end', cursor: 'pointer' }}
        onClick={() => navigate('/signin')}
      >
        <div style={{ fontFamily: 'Poppins', fontWeight: 500, fontSize: '14px', color: 'var(--text-primary)', marginBottom: '6px' }}>
          Enter our ecosystem
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'Poppins', lineHeight: 1.5 }}>
          Connect with Syngenta reps across India. Share territory insights and outcomes.
        </div>
      </div>

      {/* BOTTOM FEATURE SECTION */}
      <div className="liquid-glass" style={{ marginTop: 'auto', borderRadius: 'var(--radius-xl)', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        
        {/* TWO SIDE-BY-SIDE CARDS */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <div 
            className="liquid-glass-strong interactive-card hover-scale" 
            style={{ borderRadius: 'var(--radius-lg)', padding: '20px 16px', flex: 1, cursor: 'pointer' }}
            onClick={() => navigate('/dashboard')}
          >
            <div className="icon-circle" style={{ marginBottom: '12px' }}><MapPin size={16} color="var(--text-primary)" /></div>
            <div style={{ fontFamily: 'Poppins', fontWeight: 500, fontSize: '14px', color: 'var(--text-primary)' }}>Priority Routing</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', fontFamily: 'Poppins' }}>AI-ranked daily visit plan</div>
          </div>
          
          <div 
            className="liquid-glass-strong interactive-card hover-scale" 
            style={{ borderRadius: 'var(--radius-lg)', padding: '20px 16px', flex: 1, cursor: 'pointer' }}
            onClick={() => navigate('/outcomes')}
          >
            <div className="icon-circle" style={{ marginBottom: '12px' }}><BookOpen size={16} color="var(--text-primary)" /></div>
            <div style={{ fontFamily: 'Poppins', fontWeight: 500, fontSize: '14px', color: 'var(--text-primary)' }}>Visit Archive</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', fontFamily: 'Poppins' }}>Outcome learning loop</div>
          </div>
        </div>

        {/* BOTTOM WIDE CARD */}
        <div 
          className="liquid-glass-strong interactive-card hover-scale" 
          style={{ borderRadius: 'var(--radius-lg)', padding: '16px', display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer' }}
          onClick={() => navigate('/dashboard')}
        >
          <div style={{ width: '80px', height: '56px', borderRadius: 'var(--radius-sm)', background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Leaf size={24} color="rgba(255,255,255,0.4)" />
          </div>
          <div>
            <div style={{ fontFamily: 'Poppins', fontWeight: 500, fontSize: '13px', color: 'var(--text-primary)', marginBottom: '4px' }}>Field Intelligence Engine</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'Poppins' }}>Gemini-powered next best action for every visit.</div>
          </div>
          <div className="hover-scale" style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(255,255,255,0.12)', fontSize: '18px', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: 'auto', flexShrink: 0 }}>
            +
          </div>
        </div>

      </div>

    </div>
  );
}

// --- Main Page Component ---

function Landing() {
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();
  
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showAccountDropdown, setShowAccountDropdown] = useState(false);

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
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
      <div className="content-layer">
        
        {/* Hero Section */}
        <div className="hero-shell">
          <LeftPanel navigate={navigate} onOpenMenu={() => setDrawerOpen(true)} onScrollTo={scrollTo} />
          <RightPanel 
            navigate={navigate} 
            isAuthenticated={isAuthenticated} 
            user={user} 
            logout={logout}
            showAccountDropdown={showAccountDropdown}
            setShowAccountDropdown={setShowAccountDropdown}
          />
        </div>

        {/* New sections wrapper */}
        <div style={{ maxWidth: '1200px', margin: '80px auto 40px auto', padding: '0 24px', display: 'flex', flexDirection: 'column', gap: '96px', fontFamily: "'Poppins', sans-serif" }}>
          
          {/* Section A: Features */}
          <section id="features" style={{ scrollMarginTop: '40px' }}>
            <div style={{ textAlign: 'center', marginBottom: '48px' }}>
              <span style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--color-primary, #1D9E75)', fontWeight: 600 }}>Features</span>
              <h2 style={{ fontSize: 'clamp(28px, 4vw, 38px)', fontWeight: 600, color: 'var(--text-primary)', marginTop: '8px', marginBottom: '8px' }}>Everything a field rep needs</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>Three AI layers working together in the field</p>
            </div>
            
            <div className="features-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
              {/* Card 1 */}
              <div id="features-card" className="liquid-glass-strong" style={{ borderRadius: 'var(--radius-lg)', padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ fontSize: '32px' }}>📍</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Priority Routing</h3>
                  <span style={{ fontSize: '11px', background: 'rgba(29, 158, 117, 0.15)', color: 'var(--color-primary, #1D9E75)', padding: '4px 10px', borderRadius: '99px', fontWeight: 600 }}>AI-Ranked Daily Plan</span>
                </div>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
                  Every morning, AgroNav ranks your territory's outlets by conversion probability — powered by a CatBoost model trained on 30,000 real field visits. Visit the right shops, in the right order, before 8 AM.
                </p>
              </div>

              {/* Card 2 */}
              <div id="nba-section" className="liquid-glass-strong" style={{ borderRadius: 'var(--radius-lg)', padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ fontSize: '32px' }}>💡</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Next Best Action</h3>
                  <span style={{ fontSize: '11px', background: 'rgba(255, 209, 102, 0.15)', color: '#FFD166', padding: '4px 10px', borderRadius: '99px', fontWeight: 600 }}>Gemini-Powered</span>
                </div>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
                  At every outlet, the app tells you what product to recommend, what to say, and why — generated by Gemini AI from live inventory, crop stage, and pest alerts in your district.
                </p>
              </div>

              {/* Card 3 */}
              <div id="offline-section" className="liquid-glass-strong" style={{ borderRadius: 'var(--radius-lg)', padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ fontSize: '32px' }}>📶✕</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Offline First</h3>
                  <span style={{ fontSize: '11px', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', padding: '4px 10px', borderRadius: '99px', fontWeight: 600 }}>Works Without Internet</span>
                </div>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
                  Rural India has no guarantee of internet. AgroNav downloads your full day plan at 7 AM. Log visits, outcomes, and orders without connectivity. Everything syncs when you're back in range.
                </p>
              </div>
            </div>
          </section>

          {/* Section B: How It Works */}
          <section id="how-it-works" style={{ scrollMarginTop: '40px' }}>
            <div style={{ textAlign: 'center', marginBottom: '48px' }}>
              <span style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--color-primary, #1D9E75)', fontWeight: 600 }}>Process</span>
              <h2 style={{ fontSize: 'clamp(28px, 4vw, 38px)', fontWeight: 600, color: 'var(--text-primary)', marginTop: '8px', marginBottom: '8px' }}>How AgroNav works</h2>
            </div>
            
            <div className="steps-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px' }}>
              {/* Step 1 */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontSize: '12px', color: 'var(--color-primary, #1D9E75)', fontWeight: 700 }}>STEP 1</div>
                <h4 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Morning Sync</h4>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                  At 7 AM the system scores every outlet in your territory using 28 field signals — stock levels, pest alerts, crop stage, visit history, and more.
                </p>
              </div>

              <div className="step-arrow" style={{ fontSize: '24px', color: 'var(--text-muted)', userSelect: 'none' }}>→</div>

              {/* Step 2 */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontSize: '12px', color: 'var(--color-primary, #1D9E75)', fontWeight: 700 }}>STEP 2</div>
                <h4 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Field Visit</h4>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                  Open the app. See your ranked list. Tap any outlet for the full AI recommendation: product, advice, and talking points. Works with zero internet.
                </p>
              </div>

              <div className="step-arrow" style={{ fontSize: '24px', color: 'var(--text-muted)', userSelect: 'none' }}>→</div>

              {/* Step 3 */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontSize: '12px', color: 'var(--color-primary, #1D9E75)', fontWeight: 700 }}>STEP 3</div>
                <h4 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Log & Learn</h4>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                  After each visit, tap Sale / Interested / Rejected. That outcome feeds into next week's model — the system gets smarter every week.
                </p>
              </div>
            </div>
          </section>

          {/* Section C: About */}
          <section id="about" style={{ scrollMarginTop: '40px' }}>
            <div className="about-cols" style={{ display: 'flex', gap: '48px', alignItems: 'center' }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h2 style={{ fontSize: 'clamp(28px, 4vw, 38px)', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>About AgroNav</h2>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
                  AgroNav was built for the IITM Syngenta Hackathon 2026 to solve a real problem: Syngenta's field reps in rural India make dozens of visit decisions every day with no data, no connectivity, and no guidance. We built a closed-loop AI system that turns visit outcomes into better recommendations — every single week.
                </p>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
                  The system combines a CatBoost classifier (AUC 0.79) trained on real visit history, SHAP-powered explanations, Gemini-generated coaching advice, and a fully offline React PWA — all working together so reps can make smarter visits even in areas with no signal.
                </p>
                <div style={{ fontSize: '12px', color: 'var(--color-primary, #1D9E75)', fontWeight: 600, marginTop: '8px' }}>
                  Built by the AgroNav team — IITM Hackathon 2026
                </div>
              </div>

              {/* Stats 2x2 grid */}
              <div className="stats-grid" style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="liquid-glass-strong" style={{ borderRadius: 'var(--radius-md)', padding: '24px', textAlign: 'center' }}>
                  <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--color-primary, #1D9E75)' }}>0.79</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Test AUC</div>
                </div>
                <div className="liquid-glass-strong" style={{ borderRadius: 'var(--radius-md)', padding: '24px', textAlign: 'center' }}>
                  <div style={{ fontSize: '28px', fontWeight: 700, color: '#FFD166' }}>28</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Model Features</div>
                </div>
                <div className="liquid-glass-strong" style={{ borderRadius: 'var(--radius-md)', padding: '24px', textAlign: 'center' }}>
                  <div style={{ fontSize: '28px', fontWeight: 700, color: '#FF6B7A' }}>Offline</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>First Design</div>
                </div>
                <div className="liquid-glass-strong" style={{ borderRadius: 'var(--radius-md)', padding: '24px', textAlign: 'center' }}>
                  <div style={{ fontSize: '28px', fontWeight: 700, color: '#4ECDC4' }}>Gemini</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>AI NBA Engine</div>
                </div>
              </div>
            </div>
          </section>

        </div>

        {/* Footer */}
        <Footer />
      </div>

      {/* Drawer Overlay */}
      {drawerOpen && (
        <div 
          style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', 
            backgroundColor: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(8px)', zIndex: 1000,
            display: 'flex'
          }}
          onClick={() => setDrawerOpen(false)}
        >
          {/* Drawer Content */}
          <div 
            className="liquid-glass-strong"
            style={{
              width: '300px', height: '100%', padding: '40px 24px', 
              boxSizing: 'border-box', borderRight: '1px solid rgba(255,255,255,0.08)',
              display: 'flex', flexDirection: 'column', gap: '24px',
              animation: 'slideIn 0.25s ease-out'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <Leaf size={28} color="#1D9E75" />
              <span style={{ fontFamily: 'Poppins', fontWeight: 600, fontSize: '24px', color: 'var(--text-primary)' }}>
                AgroNav
              </span>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', flex: 1 }}>
              <div onClick={() => { navigate('/'); setDrawerOpen(false); }} className="drawer-link" style={{ fontSize: '16px', color: 'var(--text-secondary)', cursor: 'pointer', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = '#fff'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}>Home</div>
              <div onClick={() => { navigate('/dashboard'); setDrawerOpen(false); }} className="drawer-link" style={{ fontSize: '16px', color: 'var(--text-secondary)', cursor: 'pointer', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = '#fff'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}>Dashboard</div>
              <div onClick={() => { navigate('/alerts'); setDrawerOpen(false); }} className="drawer-link" style={{ fontSize: '16px', color: 'var(--text-secondary)', cursor: 'pointer', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = '#fff'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}>Alerts Feed</div>
              <div onClick={() => { navigate('/outcomes'); setDrawerOpen(false); }} className="drawer-link" style={{ fontSize: '16px', color: 'var(--text-secondary)', cursor: 'pointer', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = '#fff'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}>Visit Log</div>
              <div onClick={() => { navigate('/about'); setDrawerOpen(false); }} className="drawer-link" style={{ fontSize: '16px', color: 'var(--text-secondary)', cursor: 'pointer', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = '#fff'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}>About</div>
              
              <div style={{ width: '100%', height: '1px', background: 'rgba(255,255,255,0.08)', margin: '8px 0' }} />

              {isAuthenticated ? (
                <>
                  <div onClick={() => { navigate('/manager'); setDrawerOpen(false); }} className="drawer-link" style={{ fontSize: '16px', color: 'var(--text-secondary)', cursor: 'pointer', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = '#fff'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}>Manager Portal</div>
                  <div onClick={() => { logout(); setDrawerOpen(false); navigate('/'); }} className="drawer-link" style={{ fontSize: '16px', color: '#ef4444', cursor: 'pointer', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1.2)'} onMouseLeave={e => e.currentTarget.style.filter = 'none'}>Sign Out</div>
                </>
              ) : (
                <div onClick={() => { navigate('/signin'); setDrawerOpen(false); }} className="drawer-link" style={{ fontSize: '16px', color: 'var(--text-secondary)', cursor: 'pointer', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = '#fff'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}>Sign In</div>
              )}
            </div>
            
            <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
              IITM Syngenta Hackathon 2026
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Landing;
