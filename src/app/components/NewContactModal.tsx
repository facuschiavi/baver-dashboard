"use client";

import { useState } from "react";
import { postJson } from "../lib";

type Props = {
  onClose: () => void;
  onCreated: (contact: { id: number; name: string }) => void;
};

export default function NewContactModal({ onClose, onCreated }: Props) {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }));
  }

  async function handleSave() {
    if (!form.name.trim()) { setError("Nombre requerido"); return; }
    setSaving(true);
    setError("");
    try {
      const result = await postJson<{ id: number; name: string }>("/contacts", {
        name: form.name.trim(),
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
        address: form.address.trim() || undefined,
        city: form.city.trim() || undefined,
        notes: form.notes.trim() || undefined,
      });
      onCreated({ id: result.id, name: result.name });
      onClose();
    } catch (e: any) {
      setError(e?.message || "No se pudo crear el cliente");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "#fff", borderRadius: "16px", padding: "24px", width: "100%", maxWidth: "420px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800 }}>➕ Nuevo Cliente</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: "18px", cursor: "pointer" }}>✕</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <div>
            <label style={{ fontSize: "12px", fontWeight: 700, color: "#666", display: "block", marginBottom: "4px" }}>Nombre *</label>
            <input value={form.name} onChange={e => set("name", e.target.value)} placeholder="Nombre completo"
              style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "13px" }} />
          </div>
          <div>
            <label style={{ fontSize: "12px", fontWeight: 700, color: "#666", display: "block", marginBottom: "4px" }}>Teléfono</label>
            <input value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="+54..."
              style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "13px" }} />
          </div>
          <div>
            <label style={{ fontSize: "12px", fontWeight: 700, color: "#666", display: "block", marginBottom: "4px" }}>Email</label>
            <input value={form.email} onChange={e => set("email", e.target.value)} placeholder="email@ejemplo.com"
              style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "13px" }} />
          </div>
          <div>
            <label style={{ fontSize: "12px", fontWeight: 700, color: "#666", display: "block", marginBottom: "4px" }}>Dirección</label>
            <input value={form.address} onChange={e => set("address", e.target.value)} placeholder="Dirección"
              style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "13px" }} />
          </div>
          <div>
            <label style={{ fontSize: "12px", fontWeight: 700, color: "#666", display: "block", marginBottom: "4px" }}>Ciudad</label>
            <input value={form.city} onChange={e => set("city", e.target.value)} placeholder="Ciudad"
              style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "13px" }} />
          </div>
          <div>
            <label style={{ fontSize: "12px", fontWeight: 700, color: "#666", display: "block", marginBottom: "4px" }}>Notas</label>
            <textarea value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="Notas..."
              style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "13px", minHeight: "60px", resize: "vertical" }} />
          </div>
        </div>

        {error && <div style={{ marginTop: "8px", color: "#e74c3c", fontSize: "13px" }}>{error}</div>}

        <div style={{ display: "flex", gap: "8px", marginTop: "16px" }}>
          <button onClick={onClose} style={{ flex: 1, padding: "9px", borderRadius: "8px", border: "1px solid #ddd", background: "#fff", cursor: "pointer", fontSize: "13px" }}>Cancelar</button>
          <button onClick={handleSave} disabled={saving}
            style={{ flex: 1, padding: "9px", borderRadius: "8px", border: "none", background: "#27ae60", color: "#fff", cursor: saving ? "not-allowed" : "pointer", fontSize: "13px", fontWeight: 700, opacity: saving ? 0.7 : 1 }}>
            {saving ? "Guardando..." : "✅ Crear Cliente"}
          </button>
        </div>
      </div>
    </div>
  );
}
