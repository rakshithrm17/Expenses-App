import React, { useState } from "react";
import { loginWithUsername, registerWithUsername } from "../services/storageService";

export default function AuthView({ onLoginSuccess, onGuest }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (!username.trim() || !password) {
      setErrorMsg("Please enter both username and password.");
      return;
    }

    try {
      setLoading(true);
      let session;
      if (isSignUp) {
        session = await registerWithUsername(username, password);
      } else {
        session = await loginWithUsername(username, password);
      }
      onLoginSuccess(session);
    } catch (err) {
      setErrorMsg(err?.message || "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const autofill = (u, p) => {
    setUsername(u);
    setPassword(p);
    setErrorMsg("");
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px 16px",
      background: "var(--bg)"
    }}>
      <div style={{
        background: "var(--card)",
        border: "1px solid var(--line)",
        borderRadius: "var(--radius-lg)",
        padding: "32px 26px 26px",
        width: "100%",
        maxWidth: "400px",
        boxShadow: "var(--shadow-lg)"
      }}>
        {/* Logo and App Title */}
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: "56px",
            height: "56px",
            borderRadius: "16px",
            background: "linear-gradient(135deg, #0F172A 0%, #059669 100%)",
            color: "#fff",
            marginBottom: "14px",
            boxShadow: "0 8px 20px rgba(5, 150, 105, 0.25)"
          }}>
            <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="6" width="18" height="13" rx="3" />
              <path d="M3 10h18" />
            </svg>
          </div>
          <h1 style={{ fontSize: "24px", fontWeight: 800, margin: "0 0 6px", letterSpacing: "-0.02em", color: "var(--ink)" }}>
            Where It Goes
          </h1>
          <p style={{ fontSize: "14px", color: "var(--mute)", margin: 0 }}>
            {isSignUp ? "Create your private cloud ledger" : "Sign in to access your ledger"}
          </p>
        </div>

        {/* Tab Toggle: Sign In vs Create Account */}
        <div className="seg" style={{ marginBottom: "20px" }}>
          <button
            type="button"
            className={!isSignUp ? "on" : ""}
            onClick={() => { setIsSignUp(false); setErrorMsg(""); }}
          >
            Sign In
          </button>
          <button
            type="button"
            className={isSignUp ? "on" : ""}
            onClick={() => { setIsSignUp(true); setErrorMsg(""); }}
          >
            Create Account
          </button>
        </div>

        {errorMsg && (
          <div style={{
            padding: "10px 14px",
            borderRadius: "var(--radius-sm)",
            background: "var(--out-bg)",
            border: "1px solid var(--out-border)",
            color: "var(--out)",
            fontSize: "13px",
            fontWeight: 500,
            marginBottom: "18px"
          }}>
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <label>Username</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="e.g. test or rakshith"
            autoCapitalize="none"
            autoCorrect="off"
            required
            style={{ marginBottom: "6px" }}
          />

          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={isSignUp ? "Create a password (e.g. 123)" : "e.g. 123"}
            required
            style={{ marginBottom: "20px" }}
          />

          <button
            type="submit"
            className="btn"
            disabled={loading}
            style={{ width: "100%", padding: "13px", fontSize: "15px" }}
          >
            {loading ? "Verifying..." : isSignUp ? "Create Account" : "Sign In"}
          </button>
        </form>

        {/* Quick autofill helper chips */}
        <div style={{
          marginTop: "16px",
          padding: "12px",
          background: "var(--card-subtle)",
          border: "1px solid var(--line)",
          borderRadius: "var(--radius-md)"
        }}>
          <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--mute)", marginBottom: "8px", textAlign: "center" }}>
            1-Tap Demo / Master Logins
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              type="button"
              onClick={() => autofill("test", "123")}
              style={{
                flex: 1,
                padding: "8px",
                background: "var(--card)",
                border: "1px solid var(--line)",
                borderRadius: "var(--radius-sm)",
                fontSize: "12px",
                textAlign: "center"
              }}
            >
              <div style={{ fontWeight: 700, color: "var(--in)" }}>⚡ test</div>
              <div style={{ fontSize: "10.5px", color: "var(--mute)" }}>Cards &amp; Topology</div>
            </button>
            <button
              type="button"
              onClick={() => autofill("rakshith", "123")}
              style={{
                flex: 1,
                padding: "8px",
                background: "var(--card)",
                border: "1px solid var(--line)",
                borderRadius: "var(--radius-sm)",
                fontSize: "12px",
                textAlign: "center"
              }}
            >
              <div style={{ fontWeight: 700, color: "var(--ink)" }}>rakshith</div>
              <div style={{ fontSize: "10.5px", color: "var(--mute)" }}>Master Account</div>
            </button>
          </div>
        </div>

        {/* Offline Guest Mode link */}
        <div style={{ textAlign: "center", marginTop: "16px" }}>
          <button
            type="button"
            onClick={onGuest}
            style={{
              background: "none",
              border: 0,
              color: "var(--mute)",
              fontSize: "13px",
              padding: "6px 12px"
            }}
          >
            Use offline as Guest (This device only)
          </button>
        </div>
      </div>
    </div>
  );
}
