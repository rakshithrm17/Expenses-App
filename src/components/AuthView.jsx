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

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px 16px",
      background: "var(--bg)"
    }}>
      <div style={{
        background: "var(--card)",
        border: "1.5px solid var(--line)",
        borderRadius: "20px",
        padding: "28px 24px",
        width: "100%",
        maxWidth: "400px",
        boxShadow: "0 10px 30px rgba(0,0,0,0.06)"
      }}>
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: "52px",
            height: "52px",
            borderRadius: "14px",
            background: "var(--ink)",
            color: "var(--bg)",
            marginBottom: "12px"
          }}>
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="6" width="18" height="13" rx="3" />
              <path d="M3 10h18" />
            </svg>
          </div>
          <h1 style={{ fontSize: "22px", fontWeight: 700, margin: "0 0 6px", color: "var(--ink)" }}>Where It Goes</h1>
          <p style={{ fontSize: "14px", color: "var(--mute)", margin: 0 }}>
            {isSignUp ? "Create your private ledger account" : "Sign in to access your ledger"}
          </p>
        </div>

        {errorMsg && (
          <div style={{
            padding: "10px 14px",
            borderRadius: "10px",
            background: "rgba(200,69,31,0.1)",
            border: "1px solid rgba(200,69,31,0.3)",
            color: "var(--out)",
            fontSize: "13.5px",
            fontWeight: 500,
            marginBottom: "18px"
          }}>
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <label style={{ display: "block", fontSize: "13.5px", color: "var(--mute)", marginBottom: "4px" }}>
            Username
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="e.g. rakshith"
            autoCapitalize="none"
            autoCorrect="off"
            required
            style={{ marginBottom: "14px" }}
          />

          <label style={{ display: "block", fontSize: "13.5px", color: "var(--mute)", marginBottom: "4px" }}>
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            required
            style={{ marginBottom: "20px" }}
          />

          <button
            type="submit"
            className="btn"
            disabled={loading}
            style={{ width: "100%", padding: "13px" }}
          >
            {loading ? "Checking..." : isSignUp ? "Create account" : "Sign in"}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: "18px" }}>
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setErrorMsg("");
            }}
            style={{
              background: "none",
              border: 0,
              color: "var(--ink)",
              fontSize: "13.5px",
              fontWeight: 500,
              textDecoration: "underline",
              padding: "4px 8px"
            }}
          >
            {isSignUp ? "Already have an account? Sign in" : "New here? Create account"}
          </button>
        </div>

        <div style={{ borderTop: "1px solid var(--line)", marginTop: "22px", paddingTop: "14px", textAlign: "center" }}>
          <button
            type="button"
            onClick={onGuest}
            style={{
              background: "none",
              border: 0,
              color: "var(--mute)",
              fontSize: "12.5px"
            }}
          >
            Use offline as Guest (This device only)
          </button>
        </div>
      </div>
    </div>
  );
}
