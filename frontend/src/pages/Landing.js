import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Leaf, ArrowRight, Sparkles, MapPin, BookOpen, MessageCircle, Users, Globe, Menu } from 'lucide-react';
import '../css/landing.css';

// --- Sub-Components ---

function LeftPanel({ navigate }) {
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
          <div className="liquid-glass hover-scale" style={{ borderRadius: 'var(--radius-pill)', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-secondary)' }}>
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
            style={{ borderRadius: 'var(--radius-pill)', padding: '14px 28px', display: 'flex', alignItems: 'center', gap: '12px', fontFamily: 'Poppins', fontWeight: 500, fontSize: '15px', color: 'var(--text-primary)' }}
            onClick={() => navigate('/dashboard')}
          >
            Get Started
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ArrowRight size={14} color="white" />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'row', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <div className="liquid-glass hover-scale" style={{ borderRadius: 'var(--radius-pill)', padding: '6px 16px', fontSize: '12px', fontFamily: 'Poppins', color: 'var(--text-secondary)' }}>Priority Routing</div>
            <div className="liquid-glass hover-scale" style={{ borderRadius: 'var(--radius-pill)', padding: '6px 16px', fontSize: '12px', fontFamily: 'Poppins', color: 'var(--text-secondary)' }}>NBA Recommendations</div>
            <div className="liquid-glass hover-scale" style={{ borderRadius: 'var(--radius-pill)', padding: '6px 16px', fontSize: '12px', fontFamily: 'Poppins', color: 'var(--text-secondary)' }}>Offline First</div>
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

function RightPanel() {
  return (
    <div className="panel-right">
      
      {/* TOP BAR */}
      <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'auto' }}>
        <div className="liquid-glass hover-scale" style={{ borderRadius: 'var(--radius-pill)', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="icon-circle"><MessageCircle size={16} color="var(--text-primary)" style={{ transition: 'opacity 0.2s' }} onMouseOver={e => e.currentTarget.style.opacity = 0.7} onMouseOut={e => e.currentTarget.style.opacity = 1} /></div>
          <div className="icon-circle"><Users size={16} color="var(--text-primary)" style={{ transition: 'opacity 0.2s' }} onMouseOver={e => e.currentTarget.style.opacity = 0.7} onMouseOut={e => e.currentTarget.style.opacity = 1} /></div>
          <div className="icon-circle"><Globe size={16} color="var(--text-primary)" style={{ transition: 'opacity 0.2s' }} onMouseOver={e => e.currentTarget.style.opacity = 0.7} onMouseOut={e => e.currentTarget.style.opacity = 1} /></div>
          <div style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.2)' }} />
          <ArrowRight size={16} color="var(--text-muted)" />
        </div>

        <div style={{ display: 'flex', flexDirection: 'row', gap: '8px' }}>
          <div className="liquid-glass hover-scale" style={{ borderRadius: 'var(--radius-pill)', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)' }}>
            <Sparkles size={16} />
            <span style={{ fontSize: '13px', fontFamily: 'Poppins' }}>Account</span>
          </div>
        </div>
      </div>

      {/* COMMUNITY CARD */}
      <div className="liquid-glass" style={{ width: '220px', marginTop: '24px', borderRadius: 'var(--radius-lg)', padding: '16px 18px', alignSelf: 'flex-end' }}>
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
          <div className="liquid-glass-strong hover-scale" style={{ borderRadius: 'var(--radius-lg)', padding: '20px 16px', flex: 1 }}>
            <div className="icon-circle" style={{ marginBottom: '12px' }}><MapPin size={16} color="var(--text-primary)" /></div>
            <div style={{ fontFamily: 'Poppins', fontWeight: 500, fontSize: '14px', color: 'var(--text-primary)' }}>Priority Routing</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', fontFamily: 'Poppins' }}>AI-ranked daily visit plan</div>
          </div>
          
          <div className="liquid-glass-strong hover-scale" style={{ borderRadius: 'var(--radius-lg)', padding: '20px 16px', flex: 1 }}>
            <div className="icon-circle" style={{ marginBottom: '12px' }}><BookOpen size={16} color="var(--text-primary)" /></div>
            <div style={{ fontFamily: 'Poppins', fontWeight: 500, fontSize: '14px', color: 'var(--text-primary)' }}>Visit Archive</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', fontFamily: 'Poppins' }}>Outcome learning loop</div>
          </div>
        </div>

        {/* BOTTOM WIDE CARD */}
        <div className="liquid-glass-strong hover-scale" style={{ borderRadius: 'var(--radius-lg)', padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
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
        <div className="hero-shell">
          <LeftPanel navigate={navigate} />
          <RightPanel />
        </div>
      </div>
    </>
  );
}

export default Landing;
