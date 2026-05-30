import React, { useState, useRef, useEffect, useCallback } from "react";
import { MessageCircle, X, Send, Bot } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";

const PANEL_W = 340;
const PANEL_H = 460;

export default function ChatBot() {
  const { user, isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [greeted, setGreeted] = useState(false);
  const bottomRef = useRef(null);

  const role = user?.role || "rep";
  const userId = user?.rep_id || user?.sub || user?.email || "";
  const name = user?.name || "there";

  // Scroll to bottom whenever messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Fetch greeting when panel opens for the first time
  const fetchGreeting = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.sendChatMessage("__greeting__", role, userId, name);
      setMessages([{ from: "bot", text: data.reply || `Hi ${name}! How can I help?` }]);
    } catch {
      setMessages([{ from: "bot", text: `Hi ${name}! How can I help you today?` }]);
    } finally {
      setLoading(false);
    }
  }, [role, userId, name]);

  function handleToggle() {
    setOpen((o) => {
      if (!o && !greeted) {
        setGreeted(true);
        // Defer so state update commits before async call
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
      const data = await api.sendChatMessage(text, role, userId, name);
      setMessages([...updated, { from: "bot", text: data.reply || "Sorry, I couldn't respond right now." }]);
    } catch {
      setMessages([...updated, { from: "bot", text: "Connection error. Please try again." }]);
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  if (!isAuthenticated) return null;

  const roleBadge = role === "manager" ? "manager" : role === "admin" ? "admin" : "rep";

  return (
    <>
      {/* Floating trigger button */}
      <button
        onClick={handleToggle}
        aria-label={open ? "Close chat" : "Open AI assistant"}
        style={{
          position: "fixed",
          bottom: 90,
          right: 20,
          width: 52,
          height: 52,
          borderRadius: "50%",
          background: open
            ? "rgba(255,255,255,0.15)"
            : "var(--color-primary, #1D9E75)",
          border: "1.5px solid rgba(255,255,255,0.18)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: open
            ? "0 2px 12px rgba(0,0,0,0.3)"
            : "0 4px 20px rgba(29,158,117,0.45)",
          zIndex: 1100,
          transition: "background 0.2s, box-shadow 0.2s",
        }}
      >
        {open
          ? <X size={20} color="var(--text-primary, #fff)" />
          : <MessageCircle size={21} color="#fff" />}
      </button>

      {/* Chat panel */}
      {open && (
        <div
          style={{
            position: "fixed",
            bottom: 152,
            right: 20,
            width: PANEL_W,
            height: PANEL_H,
            display: "flex",
            flexDirection: "column",
            background: "rgba(10, 20, 14, 0.96)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 20,
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            boxShadow: "0 12px 48px rgba(0,0,0,0.55)",
            zIndex: 1099,
            overflow: "hidden",
            fontFamily: "var(--font-body, 'Inter', sans-serif)",
          }}
        >
          {/* Header */}
          <div style={{
            padding: "13px 16px",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexShrink: 0,
          }}>
            <div style={{
              width: 34,
              height: 34,
              borderRadius: "50%",
              background: "rgba(29,158,117,0.18)",
              border: "1px solid rgba(29,158,117,0.35)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}>
              <Bot size={17} color="var(--color-primary, #1D9E75)" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 13,
                fontWeight: 700,
                color: "var(--text-primary, #fff)",
                lineHeight: 1.2,
              }}>
                AgroNav Assistant
              </div>
              <div style={{
                fontSize: 11,
                color: "rgba(255,255,255,0.45)",
                marginTop: 1,
              }}>
                GLM-5.1 &nbsp;&bull;&nbsp; {roleBadge} mode
              </div>
            </div>
            {/* Online indicator */}
            <div style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "#1D9E75",
              boxShadow: "0 0 6px rgba(29,158,117,0.7)",
              flexShrink: 0,
            }} />
          </div>

          {/* Messages */}
          <div style={{
            flex: 1,
            overflowY: "auto",
            padding: "14px 14px 6px",
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}>
            {messages.map((msg, i) => (
              <div key={i} style={{
                display: "flex",
                justifyContent: msg.from === "user" ? "flex-end" : "flex-start",
              }}>
                <div style={{
                  maxWidth: "82%",
                  padding: "9px 13px",
                  borderRadius: msg.from === "user"
                    ? "14px 14px 4px 14px"
                    : "14px 14px 14px 4px",
                  background: msg.from === "user"
                    ? "var(--color-primary, #1D9E75)"
                    : "rgba(255,255,255,0.07)",
                  border: msg.from === "user"
                    ? "none"
                    : "1px solid rgba(255,255,255,0.08)",
                  color: "var(--text-primary, #fff)",
                  fontSize: 13,
                  lineHeight: 1.55,
                  wordBreak: "break-word",
                }}>
                  {msg.text}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {loading && (
              <div style={{ display: "flex", justifyContent: "flex-start" }}>
                <div style={{
                  padding: "9px 14px",
                  borderRadius: "14px 14px 14px 4px",
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  display: "flex",
                  gap: 5,
                  alignItems: "center",
                }}>
                  {[0, 1, 2].map((n) => (
                    <div key={n} style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: "rgba(255,255,255,0.4)",
                      animation: `chatDot 1.2s ease-in-out ${n * 0.2}s infinite`,
                    }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input row */}
          <div style={{
            padding: "10px 12px",
            borderTop: "1px solid rgba(255,255,255,0.07)",
            display: "flex",
            gap: 8,
            alignItems: "flex-end",
            flexShrink: 0,
          }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask anything…"
              disabled={loading}
              style={{
                flex: 1,
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 11,
                padding: "9px 13px",
                color: "var(--text-primary, #fff)",
                fontSize: 13,
                outline: "none",
                resize: "none",
                fontFamily: "inherit",
              }}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              style={{
                width: 38,
                height: 38,
                borderRadius: 11,
                background: input.trim() && !loading
                  ? "var(--color-primary, #1D9E75)"
                  : "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.1)",
                cursor: input.trim() && !loading ? "pointer" : "not-allowed",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                transition: "background 0.18s",
              }}
            >
              <Send
                size={15}
                color={input.trim() && !loading ? "#fff" : "rgba(255,255,255,0.25)"}
              />
            </button>
          </div>
        </div>
      )}

      {/* Dot animation keyframes injected once */}
      <style>{`
        @keyframes chatDot {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.85); }
          40% { opacity: 1; transform: scale(1.15); }
        }
      `}</style>
    </>
  );
}
