"use client";
import { useState, useCallback, useEffect, useRef } from "react";

type Props = { open: boolean; onClose: () => void };

export default function WhatsAppQRModal({ open, onClose }: Props) {
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [connected, setConnected] = useState(false);
  const activeRef = useRef(false);

  const startLogin = useCallback(async (force = false) => {
    setLoading(true); setError(""); setMessage("Generando QR...");
    setConnected(false); setQrUrl(null); activeRef.current = true;
    try {
      const res = await fetch("/api/whatsapp/qr", { method: "POST",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify({ force }) });
      const data = await res.json();
      if (data.connected) { setConnected(true); setMessage("WhatsApp vinculado"); }
      else if (data.qrDataUrl) { setQrUrl(data.qrDataUrl); setMessage(data.message || "Escanea el QR"); }
      else if (data.error) { setError(data.error); }
      else { setMessage(data.message || "QR generado"); }
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  }, []);

  const waitLogin = useCallback(async () => {
    if (!activeRef.current || !qrUrl) return;
    setLoading(true); setMessage("Esperando escaneo...");
    try {
      const res = await fetch("/api/whatsapp/wait", { method: "POST",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify({ currentQrDataUrl: qrUrl }) });
      const data = await res.json();
      if (data.connected) { setConnected(true); setMessage("WhatsApp vinculado"); setQrUrl(null); }
      else if (data.qrDataUrl && data.qrDataUrl !== qrUrl) { setQrUrl(data.qrDataUrl); setMessage(data.message || "QR actualizado"); }
      else { setMessage(data.message || "Esperando..."); }
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  }, [qrUrl]);

  useEffect(() => { if (!qrUrl || connected || loading) return; const t = setInterval(waitLogin, 5000); return () => clearInterval(t); }, [qrUrl, connected, loading, waitLogin]);

  useEffect(() => { if (open && !qrUrl && !loading) startLogin(false); }, [open]);

  if (!open) return null;

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
      backdropFilter: "blur(4px)", zIndex: 9999, display: "flex",
      alignItems: "center", justifyContent: "center", padding: "24px",
    }} onClick={onClose}>
      <div style={{
        width: "min(520px, 95vw)", background: "#0f0f1e", borderRadius: "12px",
        border: "1px solid rgba(255,255,255,0.1)", padding: "24px",
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h2 style={{ margin: 0, fontSize: "18px" }}>📱 Conectar WhatsApp</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#94a3b8", fontSize: "20px", cursor: "pointer" }}>✕</button>
        </div>

        {loading && <p style={{ color: "#bbf7d0", fontSize: "14px" }}>⏳ {message}</p>}
        {!loading && error && <div style={{ color: "#fca5a5", fontSize: "13px", marginBottom: "12px" }}>❌ {error}</div>}

        {!qrUrl && !connected && !loading && !error && (
          <div>
            <p style={{ color: "#94a3b8", fontSize: "13px", lineHeight: 1.5, marginBottom: "16px" }}>
              Hacé clic en Generar QR y escanealo desde WhatsApp {'>'} Dispositivos vinculados {'>'} Vincular dispositivo
            </p>
            <button onClick={() => startLogin(false)}
              style={{ padding: "10px 20px", fontSize: "14px", borderRadius: "8px",
                border: "1px solid rgba(34,197,94,0.4)", background: "rgba(34,197,94,0.1)",
                color: "#4ade80", cursor: "pointer" }}>
              🔗 Generar QR
            </button>
          </div>
        )}

        {qrUrl && !connected && (
          <div>
            <p style={{ color: "#cbd5e1", fontSize: "13px", marginBottom: "12px" }}>⏳ {message}</p>
            <div style={{ display: "flex", justifyContent: "center", padding: "14px",
              background: "#fff", borderRadius: "12px", marginBottom: "14px" }}>
              <img src={qrUrl} alt="WhatsApp QR" style={{ width: "280px", height: "280px" }} />
            </div>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <button onClick={waitLogin} disabled={loading}
                style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.2)",
                  background: "rgba(255,255,255,0.05)", color: "#e2e8f0", cursor: "pointer", fontSize: "13px" }}>
                🔄 Actualizar
              </button>
              <button onClick={() => startLogin(true)} disabled={loading}
                style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.2)",
                  background: "rgba(255,255,255,0.05)", color: "#e2e8f0", cursor: "pointer", fontSize: "13px" }}>
                ♻️ Regenerar
              </button>
              <a href={qrUrl} download="whatsapp-qr.png"
                style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.2)",
                  background: "rgba(255,255,255,0.05)", color: "#e2e8f0", textDecoration: "none", fontSize: "13px",
                  display: "inline-block" }}>
                ⬇ Descargar
              </a>
            </div>
          </div>
        )}

        {connected && (
          <div>
            <p style={{ color: "#bbf7d0", fontSize: "16px", fontWeight: "bold" }}>✅ WhatsApp vinculado correctamente</p>
          </div>
        )}

        <p style={{ color: "#64748b", fontSize: "11px", marginTop: "14px", lineHeight: 1.4 }}>
          El QR se actualiza automáticamente cada 5s. Si expira, usá Regenerar.
        </p>
      </div>
    </div>
  );
}
