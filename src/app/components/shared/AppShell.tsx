"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "./Sidebar";
import { useCashSession } from "./CashStatusBar";
import { useTheme } from "./ThemeContext";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);
  const {
    session, openSessions, showOpen, setShowOpen, showClose, setShowClose,
    closeForm, setCloseForm, closing, opening, handleOpen, handleJoin,
    handleOpenOwn, handleClose, handleLeave
  } = useCashSession();

  function handleLogout() {
    router.push("/logout");
  }

  return (
    <div data-theme={theme} className="page-content app-shell" style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Open session modal */}
      {showOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }} onClick={e => e.target === e.currentTarget && setShowOpen(false)}>
          <div style={{ background: "#fff", borderRadius: "16px", padding: "24px", width: "100%", maxWidth: "420px" }}>
            <h3 style={{ margin: "0 0 16px", fontSize: "18px", fontWeight: 800 }}>💰 Abrir Caja</h3>
            {openSessions.length > 0 && (
              <>
                <p style={{ fontSize: "13px", color: "#666", margin: "0 0 12px" }}>Cajas abiertas de otros usuarios:</p>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px" }}>
                  {openSessions.map(s => (
                    <div key={s.id} onClick={() => handleJoin(s.id)}
                      style={{ padding: "12px", borderRadius: "10px", border: "2px solid #27ae60", background: "#f0fff4", cursor: "pointer" }}>
                      <div style={{ fontWeight: 700, fontSize: "14px" }}>@{s.user_name}</div>
                      <div style={{ fontSize: "11px", color: "#888" }}>Desde {new Date(s.opened_at).toLocaleString("es-AR")}</div>
                    </div>
                  ))}
                </div>
                <div style={{ borderTop: "1px solid #eee", paddingTop: "12px" }}>
                  <p style={{ fontSize: "13px", color: "#888", margin: "0 0 8px" }}>¿O abrís tu propia caja?</p>
                  <button onClick={handleOpenOwn} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "none", background: "#27ae60", color: "#fff", cursor: "pointer", fontSize: "14px", fontWeight: 700 }}>➕ Abrir mi propia caja</button>
                </div>
              </>
            )}
            {openSessions.length === 0 && (
              <>
                <p style={{ fontSize: "13px", color: "#666", margin: "0 0 16px" }}>No hay cajas abiertas. ¿Abrís la tuya?</p>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button onClick={() => setShowOpen(false)} style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "1px solid #ddd", background: "#fff", cursor: "pointer" }}>Cancelar</button>
                  <button onClick={handleOpenOwn} style={{ flex: 2, padding: "10px", borderRadius: "8px", border: "none", background: "#27ae60", color: "#fff", cursor: "pointer", fontWeight: 700 }}>➕ Abrir caja</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Close session modal */}
      {showClose && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }} onClick={e => e.target === e.currentTarget && setShowClose(false)}>
          <div style={{ background: "#fff", borderRadius: "16px", padding: "24px", width: "100%", maxWidth: "400px" }}>
            <h3 style={{ margin: "0 0 16px", fontSize: "18px", fontWeight: 800 }}>🔒 Cerrar Caja</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div>
                <label style={{ fontSize: "12px", fontWeight: 700, color: "#666" }}>Total efectivo</label>
                <input type="number" value={closeForm.total_cash} onChange={e => setCloseForm(prev => ({ ...prev, total_cash: e.target.value }))} placeholder="0.00" style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "13px" }} />
              </div>
              <div>
                <label style={{ fontSize: "12px", fontWeight: 700, color: "#666" }}>Total digital</label>
                <input type="number" value={closeForm.total_digital} onChange={e => setCloseForm(prev => ({ ...prev, total_digital: e.target.value }))} placeholder="0.00" style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "13px" }} />
              </div>
              <div>
                <label style={{ fontSize: "12px", fontWeight: 700, color: "#666" }}>Total otros</label>
                <input type="number" value={closeForm.total_other} onChange={e => setCloseForm(prev => ({ ...prev, total_other: e.target.value }))} placeholder="0.00" style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "13px" }} />
              </div>
              <div>
                <label style={{ fontSize: "12px", fontWeight: 700, color: "#666" }}>Notas</label>
                <textarea value={closeForm.notes} onChange={e => setCloseForm(prev => ({ ...prev, notes: e.target.value }))} placeholder="Observaciones..." style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "13px", minHeight: "60px", resize: "vertical" }} />
              </div>
            </div>
            <div style={{ display: "flex", gap: "8px", marginTop: "16px" }}>
              <button onClick={() => setShowClose(false)} style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "1px solid #ddd", background: "#fff", cursor: "pointer" }}>Cancelar</button>
              <button onClick={handleClose} disabled={closing} style={{ flex: 2, padding: "10px", borderRadius: "8px", border: "none", background: "#e74c3c", color: "#fff", cursor: "pointer", fontWeight: 700, opacity: closing ? 0.7 : 1 }}>{closing ? "Cerrando..." : "🔒 Cerrar"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="app-main" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <header className="app-header" style={{ background: "#fff", borderBottom: "1px solid #e0e0e0", padding: "8px 16px", display: "flex", alignItems: "center", gap: "12px" }}>
          <button onClick={() => setSidebarOpen(true)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "20px", padding: "4px" }}>☰</button>
          <div style={{ flex: 1 }} />
          {!session ? (
            <button onClick={handleOpen} disabled={opening} style={{ background: "#27ae60", border: "none", borderRadius: "8px", padding: "6px 12px", color: "#fff", cursor: "pointer", fontSize: "13px", fontWeight: 700, opacity: opening ? 0.7 : 1 }}>💰 Abrir</button>
          ) : session.user_id !== session.my_user_id ? (
            <button onClick={handleLeave} style={{ background: "#f39c12", border: "none", borderRadius: "8px", padding: "6px 12px", color: "#fff", cursor: "pointer", fontSize: "13px", fontWeight: 700 }}>🚪 Salir</button>
          ) : (
            <button onClick={() => setShowClose(true)} style={{ background: "#e74c3c", border: "none", borderRadius: "8px", padding: "6px 12px", color: "#fff", cursor: "pointer", fontSize: "13px", fontWeight: 700 }}>🔒 Cerrar</button>
          )}
          <button onClick={toggleTheme} title="Cambiar tema" style={{ background: "none", border: "1px solid #eee", borderRadius: "8px", padding: "6px 10px", cursor: "pointer", fontSize: "14px" }}>{theme === "dark" ? "☀️" : "🌙"}</button>
          <button onClick={handleLogout} title="Salir" style={{ background: "none", border: "1px solid #eee", borderRadius: "8px", padding: "6px 10px", cursor: "pointer", fontSize: "14px" }}>🔓</button>
        </header>

        <div className="app-content" style={{ padding: "16px 20px" }}>{children}</div>
      </div>
    </div>
  );
}