"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { postJson } from "../lib";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState("dark");
  const router = useRouter();

  useEffect(() => {
    const t = localStorage.getItem("theme");
    if (t) setTheme(t as any);
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const data = await postJson<any>("/auth/login", { username, password });
      if (!data.token) {
        setError(data.error || data.message || "Error");
        setLoading(false);
        return;
      }
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user || {}));
      router.push("/");
    } catch (err: any) {
      setError(err.message || "Error de conexión");
    } finally {
      setLoading(false);
    }
  }

  const bg = theme === "dark" ? "linear-gradient(135deg, #0f0f1e 0%, #1a1a2e 50%, #0f0f1e 100%)" : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)";
  const cardBg = theme === "dark" ? "#1a1a2e" : "#fff";
  const textColor = theme === "dark" ? "#e2e8f0" : "#1a1a2e";
  const muted = theme === "dark" ? "#888" : "#666";
  const inputBg = theme === "dark" ? "#0f0f1e" : "#f8f9fa";
  const inputBorder = theme === "dark" ? "2px solid #333" : "2px solid #e0e0e0";

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: bg, padding: "20px" }}>
      <div style={{ width: "100%", maxWidth: 420, background: cardBg, borderRadius: 24, padding: "40px 32px", boxShadow: "0 20px 60px rgba(0,0,0,0.3)", textAlign: "center" }}>
        <div style={{ marginBottom: 16 }}>
          <div style={{ width: 80, height: 80, margin: "0 auto", borderRadius: "50%", background: "linear-gradient(135deg, #f97316 0%, #ef4444 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 42, boxShadow: "0 8px 24px rgba(249,115,22,0.3)" }}>
            🦊
          </div>
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: textColor, margin: "12px 0 4px" }}>VIB3 Retail</h1>
        <p style={{ fontSize: 14, color: muted, margin: "0 0 32px" }}>Dashboard comercial inteligente</p>
        <form onSubmit={handleLogin} style={{ textAlign: "left" }}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, fontWeight: 700, color: muted, display: "block", marginBottom: 6 }}>Usuario</label>
            <input value={username} onChange={e => setUsername(e.target.value)} placeholder="Tu usuario"
              style={{ width: "100%", padding: "12px 16px", borderRadius: 12, border: inputBorder, background: inputBg, color: textColor, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={{ fontSize: 13, fontWeight: 700, color: muted, display: "block", marginBottom: 6 }}>Contraseña</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••"
              style={{ width: "100%", padding: "12px 16px", borderRadius: 12, border: inputBorder, background: inputBg, color: textColor, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
          </div>
          {error && <div style={{ padding: "10px 14px", borderRadius: 10, background: "#fef2f2", color: "#dc2626", fontSize: 13, marginBottom: 16, textAlign: "center" }}>{error}</div>}
          <button type="submit" disabled={loading}
            style={{ width: "100%", padding: "14px", borderRadius: 12, border: "none", background: "linear-gradient(135deg, #f97316 0%, #ef4444 100%)", color: "#fff", fontSize: 16, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}>
            {loading ? "Ingresando..." : "Ingresar"}
          </button>
        </form>
        <div style={{ marginTop: 24, fontSize: 12, color: theme === "dark" ? "#555" : "#999" }}>
          <span style={{ opacity: 0.6 }}>Powered by </span><span style={{ fontWeight: 700 }}>VIB3.ia</span>
        </div>
      </div>
    </div>
  );
}
