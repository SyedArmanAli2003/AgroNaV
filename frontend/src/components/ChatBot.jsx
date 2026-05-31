import React, { useState, useRef, useEffect, useCallback } from "react";
import { MessageCircle, X, Send, Bot, ChevronDown } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";

const PANEL_W = 360;
const PANEL_H = 480;

const MODELS = [
  { id: "gemini-flash", label: "Gemini Flash", provider: "Google" },
  { id: "llama-3.3",    label: "Llama 3.3",    provider: "NVIDIA NIM" },
  { id: "glm-5.1",      label: "GLM-5.1",       provider: "NVIDIA NIM" },
];

export default function ChatBot() {
  const { user, isAuthenticated } = useAuth();
  const [open, setOpen]           = useState(false);
  const [messages, setMessages]   = useState([]);
  const [input, setInput]         = useState("");
  const [loading, setLoading]     = useState(false);
  const [greeted, setGreeted]     = useState(false);
  const [model, setModel]         = useState("gemini-flash");
  const [modelUsed, setModelUsed] = useState("gemini-flash");  // actual model that responded
  const [modelOpen, setModelOpen] = useState(false);
  const bottomRef = useRef(null);

  const role   = user?.role || "rep";
  const userId = user?.rep_id || user?.sub || user?.email || "";
  const name   = user?.name || "there";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const fetchGreeting = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.sendChatMessage("__greeting__", role, userId, name, model);
      setMessages([{ from: "bot", text: data.reply || `Hi ${name}! How can I help?` }]);
      if (data.model_used) setModelUsed(data.model_used);
    } catch {
      setMessages([{ from: "bot", text: `Hi ${name}! How can I help you today?` }]);
    } finally {
      setLoading(false);
    }
  }, [role, userId, name, model]);

  function handleToggle() {
    setOpen(o => {
      if (!o && !greeted) {
        setGreeted(true);
        setTimeout(fetchGreeting, 0);
      }
      return !o;
    });
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    const updated = [...messages, { from: "user", text }];
    setMessages(updated);
    setLoading(true);
    try {
      const data = await api.sendChatMessage(text, role, userId, name, model);
      if (data.model_used) setModelUsed(data.model_used);
      setMessages([...updated, { from: "bot", text: data.reply || "Sorry, I couldn't respond right now." }]);
    } catch {
      setMessages([...updated, { from: "bot", text: "Connection error. Please try again." }]);
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  function switchModel(id) {
    setModel(id);
    setModelUsed(id);
    setModelOpen(false);
    // Reset chat so greeting re-fires with new model context
    setMessages([]);
    setGreeted(false);
    setTimeout(() => {
      setGreeted(true);
      fetchGreeting();
    }, 80);
  }

  if (!isAuthenticated) return null;

  const roleBadge = role === "manager" ? "manager" : role === "admin" ? "admin" : "rep";
  const currentModel = MODELS.find(m => m.id === model) || MODELS[0];

  return (
    <>
      {/* Floating trigger */}
      <button
        onClick={handleToggle}
        aria-label={open ? "Close chat" : "Open AI assistant"}
        style={{
          position: "fixed", bottom: 90, right: 20,
          width: 52, height: 52, borderRadius: "50%",
          background: open ? "rgba(255,255,255,0.15)" : "var(--color-primary, #1D9E75)",
          border: "1.5px solid rgba(255,255,255,0.18)",
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: open ? "0 2px 12px rgba(0,0,0,0.3)" : "0 4px 20px rgba(29,158,117,0.45)",
          zIndex: 1100, transition: "background 0.2s, box-shadow 0.2s",
        }}
      >
        {open ? <X size={20} color="var(--text-primary, #fff)" /> : <MessageCircle size={21} color="#fff" />}
      </button>

      {/* Chat panel */}
      {open && (
        <div style={{
          position: "fixed", bottom: 152, right: 20,
          width: PANEL_W, height: PANEL_H,
          display: "flex", flexDirection: "column",
          background: "rgba(10, 20, 14, 0.97)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 20, backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          boxShadow: "0 12px 48px rgba(0,0,0,0.55)",
          zIndex: 1099, overflow: "hidden",
          fontFamily: "var(--font-body, 'Inter', sans-serif)",
        }}>
          {/* Header */}
          <div style={{
            padding: "12px 14px", borderBottom: "1px solid rgba(255,255,255,0.08)",
            display: "flex", alignItems: "center", gap: 10, flexShrink: 0,
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: "50%",
              background: "rgba(29,158,117,0.18)", border: "1px solid rgba(29,158,117,0.35)",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <Bot size={16} color="var(--color-primary, #1D9E75)" />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary, #fff)", lineHeight: 1.2 }}>
                AgroNav Assistant
              </div>
              {/* Model selector */}
              <div style={{ position: "relative", display: "inline-block" }}>
                <button
                  onClick={() => setModelOpen(o => !o)}
                  style={{
                    display: "flex", alignItems: "center", gap: 4,
                    background: "none", border: "none", cursor: "pointer",
                    padding: 0, marginTop: 2,
                    fontSize: 11, color: "rgba(255,255,255,0.45)",
                    fontFamily: "inherit",
                  }}
                >
                  <span style={{ color: "var(--color-primary, #1D9E75)", fontWeight: 600 }}>
                    {currentModel.label}
                  </span>
                  {modelUsed !== model && modelUsed !== "fallback" && (
                    <span style={{ color: "rgba(245,158,11,0.85)", fontSize: 10 }}>
                      ↩ via {MODELS.find(m => m.id === modelUsed)?.label || modelUsed}
                    </span>
                  )}
                  <span style={{ opacity: 0.5 }}>· {roleBadge} mode</span>
                  <ChevronDown size={10} style={{ opacity: 0.5 }} />
                </button>

                {modelOpen && (
                  <div style={{
                    position: "absolute", top: "calc(100% + 6px)", left: 0,
                    background: "rgba(10,20,14,0.98)", border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 10, overflow: "hidden", zIndex: 10,
                    minWidth: 180, boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
                  }}>
                    {MODELS.map(m => (
                      <button
                        key={m.id}
                        onClick={() => switchModel(m.id)}
                        style={{
                          display: "flex", flexDirection: "column", width: "100%",
                          padding: "9px 14px", background: m.id === model ? "rgba(29,158,117,0.12)" : "none",
                          border: "none", borderBottom: "1px solid rgba(255,255,255,0.05)",
                          cursor: "pointer", textAlign: "left", fontFamily: "inherit",
                        }}
                      >
                        <span style={{ fontSize: 13, fontWeight: 600, color: m.id === model ? "var(--color-primary, #1D9E75)" : "#fff" }}>{m.label}</span>
                        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginTop: 1 }}>{m.provider}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Online dot */}
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#1D9E75", boxShadow: "0 0 6px rgba(29,158,117,0.7)", flexShrink: 0 }} />
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "14px 14px 6px", display: "flex", flexDirection: "column", gap: 10 }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ display: "flex", justifyContent: msg.from === "user" ? "flex-end" : "flex-start" }}>
                <div style={{
                  maxWidth: "82%", padding: "9px 13px",
                  borderRadius: msg.from === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                  background: msg.from === "user" ? "var(--color-primary, #1D9E75)" : "rgba(255,255,255,0.07)",
                  border: msg.from === "user" ? "none" : "1px solid rgba(255,255,255,0.08)",
                  color: "var(--text-primary, #fff)", fontSize: 13, lineHeight: 1.55, wordBreak: "break-word",
                }}>
                  {msg.text}
                </div>
              </div>
            ))}

            {loading && (
              <div style={{ display: "flex", justifyContent: "flex-start" }}>
                <div style={{ padding: "9px 14px", borderRadius: "14px 14px 14px 4px", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.08)", display: "flex", gap: 5, alignItems: "center" }}>
                  {[0, 1, 2].map(n => (
                    <div key={n} style={{ width: 6, height: 6, borderRadius: "50%", background: "rgba(255,255,255,0.4)", animation: `chatDot 1.2s ease-in-out ${n * 0.2}s infinite` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ padding: "10px 12px", borderTop: "1px solid rgba(255,255,255,0.07)", display: "flex", gap: 8, alignItems: "flex-end", flexShrink: 0 }}>
            <input
              value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey}
              placeholder="Ask anything…" disabled={loading}
              style={{ flex: 1, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 11, padding: "9px 13px", color: "var(--text-primary, #fff)", fontSize: 13, outline: "none", resize: "none", fontFamily: "inherit" }}
            />
            <button
              onClick={sendMessage} disabled={!input.trim() || loading}
              style={{ width: 38, height: 38, borderRadius: 11, background: input.trim() && !loading ? "var(--color-primary, #1D9E75)" : "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", cursor: input.trim() && !loading ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "background 0.18s" }}
            >
              <Send size={15} color={input.trim() && !loading ? "#fff" : "rgba(255,255,255,0.25)"} />
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes chatDot {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.85); }
          40% { opacity: 1; transform: scale(1.15); }
        }
      `}</style>
    </>
  );
}
