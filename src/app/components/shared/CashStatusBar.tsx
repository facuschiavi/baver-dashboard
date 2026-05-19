"use client";

import { useEffect, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "/api";

type Session = {
  id: number; user_name: string; status: string; user_id?: number; my_user_id?: number;
  total_in: number; total_out: number; net: number; opened_at: string;
} | null;

type OpenSession = {
  id: number; user_name: string; user_id: number; opened_at: string;
  total_in: number; total_out: number; session_type: string;
};

export function useCashSession() {
  const [session, setSession] = useState<Session>(null);
  const [openSessions, setOpenSessions] = useState<OpenSession[]>([]);
  const [showOpen, setShowOpen] = useState(false);
  const [showClose, setShowClose] = useState(false);
  const [closeForm, setCloseForm] = useState({ total_cash: "", total_digital: "", total_other: "", notes: "" });
  const [closing, setClosing] = useState(false);
  const [opening, setOpening] = useState(false);

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

function authHeaders() {
  const token = getToken();
  return token ? { "Authorization": "Bearer " + token } : {};
}

async function kickJoinedUsers(sessionId: number) {
  const r = await fetch(`${API}/cash-sessions/${sessionId}/kick-joined`, {
    method: 'POST',
    headers: Object.assign({ 'Content-Type': 'application/json' }, authHeaders()),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || 'No se pudo sacar a los usuarios de la caja');
  return data;
}

  function load() {
    fetch(`${API}/cash-sessions/current`, { headers: authHeaders() })
      .then(r => { if (!r.ok) return null; return r.json(); })
      .then(d => setSession(d && d.id ? d : null))
      .catch(() => setSession(null));
  }


  async function handleLeave() {
    try {
      await fetch(`${API}/cash-sessions/leave`, {
        method: 'POST',
        headers: Object.assign({ 'Content-Type': 'application/json' }, authHeaders()),
      });
      load();
    } catch (e) {
      alert("Error al salir de caja");
    }
  }

  useEffect(() => { load(); }, []);

  async function handleOpen() {
    setOpening(true);
    try {
      // Check for other open sessions
      const r = await fetch(`${API}/cash-sessions/open`, { headers: authHeaders() });
      const others = await r.json();
      if (others.length > 0) {
        setOpenSessions(others);
        setShowOpen(true);
        setOpening(false);
      } else {
        // Open own session
        const r2 = await fetch(`${API}/cash-sessions`, {
          method: 'POST',
          headers: Object.assign({ 'Content-Type': 'application/json' }, authHeaders()),
          body: JSON.stringify({ initial_amount: 0 }),
        });
        if (r2.ok) {
          load();
        } else {
          const err = await r2.json();
          alert(err.error || 'Error al abrir caja');
        }
        setOpening(false);
      }
    } catch (e) {
      alert("Error al abrir caja");
      setOpening(false);
    }
  }

  async function handleJoin(id: number) {
    await fetch(`${API}/cash-sessions/${id}/join`, { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, authHeaders()) });
    setShowOpen(false);
    load();
  }

  async function handleOpenOwn() {
    setOpening(true);
    try {
      const r = await fetch(`${API}/cash-sessions`, {
        method: 'POST',
        headers: Object.assign({ 'Content-Type': 'application/json' }, authHeaders()),
        body: JSON.stringify({ initial_amount: 0 }),
      });
      if (r.ok) {
        setShowOpen(false);
        load();
      } else {
        const err = await r.json();
        alert(err.error || 'Error al abrir caja');
      }
    } catch (e) { alert("Error al abrir caja"); }
    finally { setOpening(false); }
  }

  async function handleClose() {
    if (!session) return;
    setClosing(true);
    try {
      const r = await fetch(`${API}/cash-sessions/${session.id}/close`, {
        method: 'POST',
        headers: Object.assign({ 'Content-Type': 'application/json' }, authHeaders()),
        body: JSON.stringify({
          final_amount: Number(closeForm.total_cash) + Number(closeForm.total_digital) + Number(closeForm.total_other),
          total_cash: Number(closeForm.total_cash) || 0,
          total_digital: Number(closeForm.total_digital) || 0,
          total_other: Number(closeForm.total_other) || 0,
          notes: closeForm.notes || '',
        }),
      });
      if (!r.ok) {
        const err = await r.json();
        const msg = err.error || 'Error al cerrar caja';
        if (msg.toLowerCase().includes('otros usuarios')) {
          const ok = confirm(msg + '\n\n¿Querés sacarlos de tu caja y volver a intentar cerrarla?');
          if (ok) {
            await kickJoinedUsers(session.id);
            setClosing(false);
            return handleClose();
          }
        }
        alert(msg);
        setClosing(false);
        return;
      }
      setShowClose(false);
      setCloseForm({ total_cash: "", total_digital: "", total_other: "", notes: "" });
      load();
    } catch (e) { alert("Error al cerrar caja"); }
    finally { setClosing(false); }
  }

  return { session, openSessions, showOpen, setShowOpen, showClose, setShowClose, closeForm, setCloseForm, closing, opening, handleOpen, handleJoin, handleOpenOwn, handleClose, handleLeave };
}

// StatusBar - just shows stats when open
export default function CashStatusBar() {
  const [session, setSession] = useState<Session>(null);
  function statusAuthHeaders() {
    const token = typeof window === "undefined" ? null : localStorage.getItem("token");
    return token ? { "Authorization": "Bearer " + token } : {};
  }

  useEffect(() => {
    fetch(`${API}/cash-sessions/current`, { headers: statusAuthHeaders() })
      .then(r => { if (!r.ok) return null; return r.json(); })
      .then(d => setSession(d && d.id ? d : null))
      .catch(() => setSession(null));
  }, []);

  if (!session) return null;

  const net = Number(session.total_in || 0) - Number(session.total_out || 0);

  return (
    <div style={{ background: "#1a1a2e", borderBottom: "1px solid #e0e0e0", padding: "6px 16px", display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        <span style={{ fontSize: "14px" }}>💰</span>
        <span style={{ fontSize: "12px", fontWeight: 700, color: "#27ae60" }}>CAJA ABIERTA</span>
      </div>
      <div style={{ display: "flex", gap: "16px", fontSize: "12px", color: "#ccc" }}>
        <span>📥 ${Number(session.total_in || 0).toLocaleString("es-AR")}</span>
        <span>📤 ${Number(session.total_out || 0).toLocaleString("es-AR")}</span>
        <span style={{ color: net >= 0 ? "#27ae60" : "#e74c3c", fontWeight: 700 }}>
          Neto: {net >= 0 ? "+" : ""}${net.toLocaleString("es-AR")}
        </span>
      </div>
      <div style={{ flex: 1 }} />
    </div>
  );
}
