"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import * as XLSX from "xlsx";
import { UpdatePriceModal } from "../../components/shared/ProductModals";

type Service = {
  id: number; name: string; description: string; price: string;
  is_recurring: boolean; is_active: boolean; sort_order: number; creates_work_order: boolean;
};

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

async function fetchJson<T>(url: string): Promise<T> {
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers["Authorization"] = "Bearer " + token;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function postJson<T>(url: string, body: any): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers["Authorization"] = "Bearer " + token;
  const res = await fetch(url, {
    method: "POST", headers, body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function putJson<T>(url: string, body: any): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers["Authorization"] = "Bearer " + token;
  const res = await fetch(url, {
    method: "PUT", headers, body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

const btnPrimary: React.CSSProperties = {
  padding: "8px 16px", borderRadius: "10px", border: "none", background: "#6c63ff",
  color: "#fff", fontWeight: 600, fontSize: "13px", cursor: "pointer",
};
const btnSecondary: React.CSSProperties = {
  padding: "8px 16px", borderRadius: "10px", border: "1px solid #e0e0e0",
  background: "transparent", fontWeight: 600, fontSize: "13px", cursor: "pointer",
};
const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 12px", borderRadius: "10px", border: "1px solid #e0e0e0",
  fontSize: "14px", background: "#fff", boxSizing: "border-box", marginBottom: "8px",
};

export default function ServiciosPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"cards" | "list">("cards");
  const [showPriceModal, setShowPriceModal] = useState(false);
  // price percent modal replaced by UpdatePriceModal from ProductModals
  const importRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    name: "", description: "", price: "", is_recurring: false, creates_work_order: false, sort_order: 0,
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const s = await fetchJson<Service[]>("/api/services");
      setServices(s);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function save() {
    setSaving(true);
    try {
      const body = {
        ...form, price: Number(form.price), sort_order: Number(form.sort_order),
      };
      if (editId) {
        await putJson("/api/services/" + editId, body);
      } else {
        await postJson("/api/services", body);
      }
      setShowModal(false);
      await load();
    } catch (e) { console.error(e); }
    setSaving(false);
  }

  async function remove(id: number) {
    if (!confirm("Eliminar servicio?")) return;
    try {
      await fetch("/api/services/" + id, { method: "DELETE" });
      await load();
    } catch (e) { console.error(e); }
  }

  function openForm(s?: Service) {
    if (s) {
      setForm({
        name: s.name, description: s.description, price: s.price,
        is_recurring: s.is_recurring, creates_work_order: s.creates_work_order, sort_order: s.sort_order,
      });
      setEditId(s.id);
    } else {
      setForm({ name: "", description: "", price: "", is_recurring: false, creates_work_order: false, sort_order: 0 });
      setEditId(null);
    }
    setShowModal(true);
  }

  function exportExcel() {
    const data = services.map(s => ({
      "ID": s.id,
      "Nombre": s.name,
      "Descripción": s.description,
      "Precio": Number(s.price || 0),
      "Recurrente": s.is_recurring ? "Sí" : "No",
      "Genera OT": s.creates_work_order ? "Sí" : "No",
      "Activo": s.is_active ? "Sí" : "No",
      "Orden": s.sort_order,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Servicios");
    XLSX.writeFile(wb, "Servicios.xlsx");
  }

  async function handleImport(file?: File) {
    if (!file) return;
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows: any[] = XLSX.utils.sheet_to_json(ws);
    for (const r of rows) {
      const name = r.Nombre || r.name || r.Servicio;
      if (!name) continue;
      await postJson("/api/services", {
        name,
        description: r.Descripción || r.Descripcion || r.description || "",
        price: Number(r.Precio || r.price || 0),
        is_recurring: String(r.Recurrente || r.is_recurring || "").toLowerCase().startsWith("s") || r.is_recurring === true,
        creates_work_order: String(r["Genera OT"] || r.creates_work_order || "").toLowerCase().startsWith("s") || r.creates_work_order === true,
        sort_order: Number(r.Orden || r.sort_order || 0),
      });
    }
    if (importRef.current) importRef.current.value = "";
    await load();
  }



  const containerStyle: React.CSSProperties = { padding: "24px", maxWidth: "900px", margin: "0 auto" };
  const cardStyle: React.CSSProperties = {
    background: "#fff", borderRadius: "16px", padding: "20px 24px",
    boxShadow: "0 2px 12px rgba(0,0,0,0.06)", marginBottom: "16px",
  };

  if (loading) return <div style={containerStyle}><p>Cargando...</p></div>;

  return (
    <div style={containerStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", gap: "8px", flexWrap: "wrap" }}>
        <h1 style={{ margin: 0, fontSize: "22px" }}>Servicios</h1>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <button style={{...btnSecondary, padding:"6px 10px", background: viewMode === "list" ? "#1a1a2e" : "transparent", color: viewMode === "list" ? "#fff" : "#333"}} onClick={() => setViewMode("list")} title="Vista lista">☰</button>
          <button style={{...btnSecondary, padding:"6px 10px", background: viewMode === "cards" ? "#1a1a2e" : "transparent", color: viewMode === "cards" ? "#fff" : "#333"}} onClick={() => setViewMode("cards")} title="Vista tarjetas">⊞</button>
          <button style={btnSecondary} onClick={() => importRef.current?.click()}>📥 Importar</button>
          <input ref={importRef} type="file" accept=".xlsx,.xls,.csv" style={{display:"none"}} onChange={e => handleImport(e.target.files?.[0])} />
          <button style={btnSecondary} onClick={exportExcel} disabled={services.length === 0}>⬇ Excel</button>
          <button style={btnSecondary} onClick={() => setShowPriceModal(true)} disabled={services.length === 0}>💵 Cambiar precios</button>
          <button style={btnPrimary} onClick={() => openForm()}>+ Nuevo servicio</button>
        </div>
      </div>

      <div style={cardStyle}>
        {services.length === 0 ? (
          <p style={{ color: "#999" }}>No hay servicios creados.</p>
        ) : viewMode === "list" ? (
          <div>
            {services.map(s => (
              <div key={s.id} style={{ display:"grid", gridTemplateColumns:"1fr 120px 130px 140px", gap:"10px", alignItems:"center", padding:"12px 0", borderBottom:"1px solid #f1f1f1" }}>
                <div>
                  <div style={{fontWeight:700}}>{s.name}</div>
                  <div style={{fontSize:"12px", color:"#666"}}>{s.description}</div>
                </div>
                <div style={{fontWeight:700, color:"#6c63ff"}}>${Number(s.price).toLocaleString("es-AR", {minimumFractionDigits:2})}</div>
                <div style={{fontSize:"12px", color:s.is_recurring ? "#6c63ff" : "#777"}}>{s.is_recurring ? "🔄 Recurrente" : s.creates_work_order ? "🔧 Genera OT" : "🟢 Único"}</div>
                <div style={{display:"flex", gap:"6px", justifyContent:"flex-end"}}>
                  <button style={{ ...btnSecondary, padding: "4px 10px", fontSize: "12px" }} onClick={() => openForm(s)}>✏️</button>
                  <button style={{ ...btnSecondary, padding: "4px 10px", fontSize: "12px", color: "#e74c3c" }} onClick={() => remove(s.id)}>🗑️</button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            {services.map((s) => (
              <div key={s.id} style={{
                flex: "1", minWidth: "240px",
                border: s.is_recurring ? "1px solid #6c63ff" : "1px solid #f0f0f0",
                borderRadius: "14px", padding: "20px", position: "relative",
              }}>
                {s.is_recurring && (
                  <div style={{
                    position: "absolute", top: "10px", right: "10px", fontSize: "10px",
                    background: "#6c63ff", color: "#fff", padding: "2px 8px", borderRadius: "6px",
                  }}>
                    RECURRENTE
                  </div>
                )}
                <div style={{ fontSize: "16px", fontWeight: 700, marginBottom: "4px" }}>{s.name}</div>
                <div style={{ fontSize: "13px", color: "#666", marginBottom: "12px", minHeight: "32px" }}>{s.description}</div>
                <div style={{ fontSize: "24px", fontWeight: 700, color: "#6c63ff" }}>
                  ${Number(s.price).toLocaleString("es-AR", {minimumFractionDigits:2})}
                </div>
                <div style={{ fontSize: "11px", color: s.is_recurring ? "#6c63ff" : "#999", marginTop: "4px" }}>
                  {s.is_recurring ? "🔄 Servicio recurrente" : s.creates_work_order ? "🔧 Genera OT" : "🟢 Servicio único"}
                </div>
                <div style={{ marginTop: "16px", display: "flex", gap: "8px" }}>
                  <button style={{ ...btnSecondary, padding: "4px 12px", fontSize: "12px" }} onClick={() => openForm(s)}>✏️ Editar</button>
                  <button style={{ ...btnSecondary, padding: "4px 12px", fontSize: "12px", color: "#e74c3c" }} onClick={() => remove(s.id)}>🗑️</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>


      {showPriceModal && (
        <UpdatePriceModal products={services} apiEndpoint="/services/update-prices" onClose={() => setShowPriceModal(false)} onDone={() => { load(); setShowPriceModal(false); }} />
      )}

      {/* MODAL */}
      {showModal && (
        <div onClick={() => setShowModal(false)} style={{position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", display:"flex", alignItems:"center", justifyContent:"center", padding:"20px", zIndex:1000}}>
          <div onClick={e => e.stopPropagation()} style={{background:"#fff", borderRadius:"18px", padding:"24px", width:"100%", maxWidth:"420px"}}>
            <h3 style={{margin:"0 0 16px", fontSize:"18px"}}>{editId ? "Editar servicio" : "Nuevo servicio"}</h3>

            <div style={{fontSize:"13px", color:"#666", marginBottom:"6px"}}>Nombre *</div>
            <input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} style={inputStyle} placeholder="Ej: Mantenimiento básico" />

            <div style={{fontSize:"13px", color:"#666", marginBottom:"6px"}}>Descripción</div>
            <textarea value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} style={{...inputStyle, minHeight:"60px", resize:"vertical"}} placeholder="¿Qué incluye?" />

            <div style={{fontSize:"13px", color:"#666", marginBottom:"6px"}}>Precio *</div>
            <input type="number" value={form.price} min="0" step="0.01" onChange={e => setForm(f => ({...f, price: e.target.value}))} style={inputStyle} />

            <label style={{display:"flex", alignItems:"center", gap:"8px", fontSize:"13px", margin:"8px 0", cursor:"pointer"}}>
              <input type="checkbox" checked={form.is_recurring}
                onChange={e => setForm(f => ({...f, is_recurring: e.target.checked}))} />
              Servicio recurrente (genera plan + suscripción)
            </label>
            {form.is_recurring && (
              <div style={{fontSize:"12px", background:"#e8f4fd", color:"#0056b3", padding:"8px 12px", borderRadius:"8px", marginBottom:"8px"}}>
                Se creará un plan automáticamente. Configurá los detalles de recurrencia en la sección Planes.
              </div>
            )}

            {!form.is_recurring && (
              <label style={{display:"flex", alignItems:"center", gap:"8px", fontSize:"13px", margin:"12px 0", cursor:"pointer"}}>
                <input type="checkbox" checked={form.creates_work_order}
                  onChange={e => setForm(f => ({...f, creates_work_order: e.target.checked}))} />
                Genera orden de trabajo al contratar este servicio
              </label>
            )}


            <div style={{display:"flex", gap:"8px", justifyContent:"flex-end", marginTop:"16px"}}>
              <button onClick={() => setShowModal(false)} style={btnSecondary}>Cancelar</button>
              <button onClick={save} disabled={!form.name || !form.price || saving} style={btnPrimary}>
                {saving ? "..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
