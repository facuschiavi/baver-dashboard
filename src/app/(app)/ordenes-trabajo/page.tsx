"use client";

import { useState, useEffect, useCallback } from "react";
import * as XLSX from "xlsx";

type WorkOrder = {
  id: number; contact_id: number; service_id: number; title: string;
  description: string; status: string; assigned_to: number; scheduled_date: string;
  completed_at: string; notes: string; contact_name: string; contact_phone: string;
  assigned_name: string; service_name: string; order_id?: number; order_number?: string;
};

type Contact = { id: number; name: string; phone?: string; email?: string; address?: string; location?: string };
type User = { id: number; name: string };
type Service = { id: number; name: string; creates_work_order?: boolean };

const STATUS_OPTIONS = ["pendiente", "en_curso", "realizada", "cancelada"];

const STATUS_COLORS: Record<string, string> = {
  pendiente: "#f39c12", en_curso: "#3498db", realizada: "#27ae60", cancelada: "#e74c3c",
};

const STATUS_LABELS: Record<string, string> = {
  pendiente: "Pendiente", en_curso: "En curso", realizada: "Realizada", cancelada: "Cancelada",
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
  const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function putJson<T>(url: string, body: any): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers["Authorization"] = "Bearer " + token;
  const res = await fetch(url, { method: "PUT", headers, body: JSON.stringify(body) });
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

export default function OrdenesTrabajoPage() {
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const woServices = services.filter(s => s.creates_work_order);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("");
  const [viewMode, setViewMode] = useState<"cards" | "list">("cards");
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [contactSearch, setContactSearch] = useState("");
  const [serviceSearch, setServiceSearch] = useState("");
  const [showQuickClient, setShowQuickClient] = useState(false);
  const [quickClient, setQuickClient] = useState({ name: "", phone: "", email: "", address: "", location: "" });
  const [form, setForm] = useState({
    contact_id: "", service_id: "", title: "", description: "",
    assigned_to: "", scheduled_date: "", notes: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [o, c, s] = await Promise.all([
        fetchJson<WorkOrder[]>("/api/work-orders"),
        fetchJson<Contact[]>("/api/contacts?limit=200"),
        fetchJson<Service[]>("/api/services"),
      ]);
      setOrders(o);
      setContacts(c);
      setServices(s);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function save() {
    setSaving(true);
    try {
      const body = {
        ...form,
        contact_id: form.contact_id ? Number(form.contact_id) : null,
        service_id: form.service_id ? Number(form.service_id) : null,
        assigned_to: form.assigned_to ? Number(form.assigned_to) : null,
      };
      if (editId) {
        await putJson("/api/work-orders/" + editId, body);
      } else {
        await postJson("/api/work-orders", body);
      }
      setShowModal(false);
      await load();
    } catch (e) { console.error(e); }
    setSaving(false);
  }

  async function changeStatus(id: number, newStatus: string) {
    try {
      await putJson("/api/work-orders/" + id, { status: newStatus });
      await load();
    } catch (e) { console.error(e); }
  }

  function exportExcel() {
    const data = filtered.map(wo => ({
      "ID": wo.id,
      "Título": wo.title,
      "Estado": STATUS_LABELS[wo.status] || wo.status,
      "Cliente": wo.contact_name || "-",
      "Teléfono": wo.contact_phone || "-",
      "Servicio": wo.service_name || "-",
      "NV": wo.order_number || "-",
      "Descripción": wo.description || "-",
      "Fecha programada": wo.scheduled_date || "-",
      "Realizada": wo.completed_at ? new Date(wo.completed_at).toLocaleString("es-AR") : "-",
      "Notas": wo.notes || "-",
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Ordenes de trabajo");
    const filterName = filter ? filter : "todas";
    XLSX.writeFile(wb, `Ordenes_Trabajo_${filterName}.xlsx`);
  }

  async function createQuickClient() {
    if (!quickClient.name && !quickClient.phone) return;
    setSaving(true);
    try {
      const created = await postJson<Contact>("/api/contacts", quickClient);
      setContacts(prev => [created, ...prev]);
      setForm(f => ({ ...f, contact_id: String(created.id) }));
      setContactSearch(created.name || quickClient.name || quickClient.phone);
      setQuickClient({ name: "", phone: "", email: "", address: "", location: "" });
      setShowQuickClient(false);
    } catch (e) { console.error(e); }
    setSaving(false);
  }

  function openForm(wo?: WorkOrder) {
    if (wo) {
      setForm({
        contact_id: String(wo.contact_id || ""),
        service_id: String(wo.service_id || ""),
        title: wo.title, description: wo.description,
        assigned_to: String(wo.assigned_to || ""),
        scheduled_date: wo.scheduled_date ? wo.scheduled_date.split("T")[0] : "",
        notes: wo.notes,
      });
      setContactSearch(wo.contact_name || "");
      setServiceSearch(wo.service_name || "");
      setShowQuickClient(false);
      setEditId(wo.id);
    } else {
      setForm({ contact_id: "", service_id: "", title: "", description: "", assigned_to: "", scheduled_date: "", notes: "" });
      setContactSearch("");
      setServiceSearch("");
      setShowQuickClient(false);
      setQuickClient({ name: "", phone: "", email: "", address: "", location: "" });
      setEditId(null);
    }
    setShowModal(true);
  }

  const filtered = filter ? orders.filter(o => o.status === filter) : orders;
  const filteredContacts = contacts.filter(c => {
    const q = contactSearch.trim().toLowerCase();
    if (!q) return true;
    return (c.name || "").toLowerCase().includes(q) ||
      (c.phone || "").toLowerCase().includes(q) ||
      (c.email || "").toLowerCase().includes(q) ||
      (c.location || "").toLowerCase().includes(q);
  }).slice(0, 8);
  const filteredServices = woServices.filter(s => {
    const q = serviceSearch.trim().toLowerCase();
    if (!q) return true;
    return (s.name || "").toLowerCase().includes(q);
  }).slice(0, 8);

  const containerStyle: React.CSSProperties = { padding: "24px", maxWidth: "900px", margin: "0 auto" };
  const cardStyle: React.CSSProperties = {
    background: "#fff", borderRadius: "16px", padding: "20px 24px",
    boxShadow: "0 2px 12px rgba(0,0,0,0.06)", marginBottom: "16px",
  };

  if (loading) return <div style={containerStyle}><p>Cargando...</p></div>;

  return (
    <div style={containerStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "8px" }}>
        <h1 style={{ margin: 0, fontSize: "22px" }}>Órdenes de Trabajo</h1>
        <div style={{display:"flex", alignItems:"center", gap:"8px", flexWrap:"wrap"}}>
          <button style={{...btnSecondary, padding:"6px 10px", background: viewMode === "list" ? "#1a1a2e" : "transparent", color: viewMode === "list" ? "#fff" : "#333"}} onClick={() => setViewMode("list")} title="Vista lista">☰</button>
          <button style={{...btnSecondary, padding:"6px 10px", background: viewMode === "cards" ? "#1a1a2e" : "transparent", color: viewMode === "cards" ? "#fff" : "#333"}} onClick={() => setViewMode("cards")} title="Vista tarjetas">⊞</button>
          <button style={btnSecondary} onClick={exportExcel} disabled={filtered.length === 0}>⬇ Excel</button>
          <button style={btnPrimary} onClick={() => openForm()}>+ Nueva OT</button>
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
        <button onClick={() => setFilter("")} style={{
          ...btnSecondary, background: !filter ? "#6c63ff" : "transparent",
          color: !filter ? "#fff" : "#333",
        }}>Todas ({orders.length})</button>
        {STATUS_OPTIONS.map(s => (
          <button key={s} onClick={() => setFilter(s)} style={{
            ...btnSecondary,
            background: filter === s ? STATUS_COLORS[s] : "transparent",
            color: filter === s ? "#fff" : "#333",
          }}>
            {STATUS_LABELS[s]} ({orders.filter(o => o.status === s).length})
          </button>
        ))}
      </div>

      <div style={cardStyle}>
        {filtered.length === 0 ? (
          <p style={{ color: "#999" }}>No hay órdenes de trabajo.</p>
        ) : viewMode === "list" ? (
          <div>
            {filtered.map((wo) => (
              <div key={wo.id} style={{display:"grid", gridTemplateColumns:"1fr 130px 120px 160px", gap:"10px", alignItems:"center", padding:"12px 0", borderBottom:"1px solid #f1f1f1"}}>
                <div>
                  <div style={{fontWeight:700}}>{wo.title}</div>
                  <div style={{fontSize:"12px", color:"#666"}}>{wo.contact_name || "Sin cliente"}{wo.service_name ? " · " + wo.service_name : ""}{wo.order_number ? " · NV: " + wo.order_number : ""}</div>
                </div>
                <div style={{fontSize:"12px", color:"#777"}}>{wo.scheduled_date || "Sin fecha"}</div>
                <div style={{fontSize:"11px", fontWeight:700, color: STATUS_COLORS[wo.status]}}>{STATUS_LABELS[wo.status] || wo.status}</div>
                <div style={{display:"flex", gap:"4px", justifyContent:"flex-end"}}>
                  <select value={wo.status} onChange={e => changeStatus(wo.id, e.target.value)} style={{ fontSize: "11px", padding: "3px 6px", borderRadius: "6px", border: "1px solid #e0e0e0" }}>
                    {STATUS_OPTIONS.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                  </select>
                  {(wo.status === "en_curso" || wo.status === "pendiente") && (
                    <button style={{ ...btnPrimary, padding: "3px 8px", fontSize: "11px", background: "#27ae60" }} onClick={() => changeStatus(wo.id, "realizada")}>✅</button>
                  )}
                  <button style={{ ...btnSecondary, padding: "3px 8px", fontSize: "11px" }} onClick={() => openForm(wo)}>✏️</button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div>
            {filtered.map((wo) => (
              <div key={wo.id} style={{
                border: "1px solid #f0f0f0", borderRadius: "14px",
                padding: "16px 20px", marginBottom: "10px",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "8px" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "15px", fontWeight: 700 }}>{wo.title}</div>
                    <div style={{ fontSize: "12px", color: "#666", marginTop: "2px" }}>
                      {wo.contact_name && <>Cliente: {wo.contact_name} &middot; </>}
                      {wo.service_name && <>Servicio: {wo.service_name} &middot; </>}
                      {wo.order_number && <>NV: <b>{wo.order_number}</b> &middot; </>}
                      {wo.assigned_name && <>Asignado a: {wo.assigned_name}</>}
                    </div>
                    {wo.description && <div style={{ fontSize: "13px", color: "#888", marginTop: "6px" }}>{wo.description}</div>}
                    <div style={{ display: "flex", gap: "12px", marginTop: "8px", fontSize: "12px", color: "#999" }}>
                      {wo.scheduled_date && <span>📅 {wo.scheduled_date}</span>}
                      {wo.completed_at && <span>✅ {new Date(wo.completed_at).toLocaleDateString("es-AR")}</span>}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{
                      padding: "3px 10px", borderRadius: "6px", fontSize: "11px", fontWeight: 600,
                      background: STATUS_COLORS[wo.status] + "22", color: STATUS_COLORS[wo.status],
                      display: "inline-block", marginBottom: "6px",
                    }}>
                      {STATUS_LABELS[wo.status] || wo.status}
                    </div>
                    <div style={{ display: "flex", gap: "4px" }}>
                      <select value={wo.status} onChange={e => changeStatus(wo.id, e.target.value)}
                        style={{ fontSize: "11px", padding: "3px 6px", borderRadius: "6px", border: "1px solid #e0e0e0" }}>
                        {STATUS_OPTIONS.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                      </select>
                      {(wo.status === "en_curso" || wo.status === "pendiente") && (
                        <button style={{ ...btnPrimary, padding: "3px 8px", fontSize: "11px", background: "#27ae60" }} onClick={() => changeStatus(wo.id, "realizada")}>✅</button>
                      )}
                      <button style={{ ...btnSecondary, padding: "3px 8px", fontSize: "11px" }} onClick={() => openForm(wo)}>✏️</button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div onClick={() => setShowModal(false)} style={{position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", display:"flex", alignItems:"center", justifyContent:"center", padding:"20px", zIndex:1000}}>
          <div onClick={e => e.stopPropagation()} style={{background:"#fff", borderRadius:"18px", padding:"24px", width:"100%", maxWidth:"460px", maxHeight:"90vh", overflowY:"auto"}}>
            <h3 style={{margin:"0 0 16px", fontSize:"18px"}}>{editId ? "Editar OT" : "Nueva Orden de Trabajo"}</h3>

            <div style={{fontSize:"13px", color:"#666", marginBottom:"6px"}}>Título *</div>
            <input value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))} style={inputStyle} placeholder="Ej: Instalación de equipo" />

            <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", gap:"8px", marginBottom:"6px"}}>
              <div style={{fontSize:"13px", color:"#666"}}>Cliente (opcional)</div>
              <button type="button" onClick={() => setShowQuickClient(v => !v)} style={{...btnSecondary, padding:"5px 10px", fontSize:"12px"}}>+ Nuevo cliente</button>
            </div>
            <input
              value={contactSearch}
              onChange={e => { setContactSearch(e.target.value); setForm(f => ({...f, contact_id: ""})); }}
              style={inputStyle}
              placeholder="Buscar por nombre, teléfono, email o localidad"
            />
            {contactSearch && !form.contact_id && filteredContacts.length > 0 && (
              <div style={{border:"1px solid #eee", borderRadius:"10px", marginTop:"-4px", marginBottom:"8px", maxHeight:"150px", overflowY:"auto"}}>
                {filteredContacts.map(c => (
                  <button key={c.id} type="button" onClick={() => { setForm(f => ({...f, contact_id: String(c.id)})); setContactSearch(c.name || c.phone || ""); }}
                    style={{display:"block", width:"100%", textAlign:"left", padding:"8px 10px", border:"none", borderBottom:"1px solid #f2f2f2", background:"#fff", cursor:"pointer"}}>
                    <b>{c.name || "Sin nombre"}</b>{c.phone ? <span style={{color:"#777"}}> · {c.phone}</span> : null}
                  </button>
                ))}
              </div>
            )}

            {showQuickClient && (
              <div style={{border:"1px solid #eee", borderRadius:"12px", padding:"12px", marginBottom:"10px", background:"#fafafa"}}>
                <div style={{fontSize:"13px", fontWeight:700, marginBottom:"8px"}}>Carga rápida de cliente</div>
                <input value={quickClient.name} onChange={e => setQuickClient(f => ({...f, name: e.target.value}))} style={inputStyle} placeholder="Nombre" />
                <input value={quickClient.phone} onChange={e => setQuickClient(f => ({...f, phone: e.target.value}))} style={inputStyle} placeholder="Teléfono / WhatsApp" />
                <input value={quickClient.email} onChange={e => setQuickClient(f => ({...f, email: e.target.value}))} style={inputStyle} placeholder="Email (opcional)" />
                <input value={quickClient.address} onChange={e => setQuickClient(f => ({...f, address: e.target.value}))} style={inputStyle} placeholder="Dirección (opcional)" />
                <input value={quickClient.location} onChange={e => setQuickClient(f => ({...f, location: e.target.value}))} style={inputStyle} placeholder="Localidad (opcional)" />
                <div style={{display:"flex", justifyContent:"flex-end", gap:"8px"}}>
                  <button type="button" style={{...btnSecondary, padding:"6px 10px"}} onClick={() => setShowQuickClient(false)}>Cancelar</button>
                  <button type="button" style={{...btnPrimary, padding:"6px 10px"}} onClick={createQuickClient} disabled={saving || (!quickClient.name && !quickClient.phone)}>Crear y usar</button>
                </div>
              </div>
            )}

            <div style={{fontSize:"13px", color:"#666", marginBottom:"6px"}}>Servicio (opcional)</div>
            <input
              value={serviceSearch}
              onChange={e => { setServiceSearch(e.target.value); setForm(f => ({...f, service_id: ""})); }}
              style={inputStyle}
              placeholder="Buscar servicio que genera OT"
            />
            {serviceSearch && !form.service_id && filteredServices.length > 0 && (
              <div style={{border:"1px solid #eee", borderRadius:"10px", marginTop:"-4px", marginBottom:"8px", maxHeight:"150px", overflowY:"auto"}}>
                {filteredServices.map(s => (
                  <button key={s.id} type="button" onClick={() => { setForm(f => ({...f, service_id: String(s.id), title: f.title || s.name})); setServiceSearch(s.name); }}
                    style={{display:"block", width:"100%", textAlign:"left", padding:"8px 10px", border:"none", borderBottom:"1px solid #f2f2f2", background:"#fff", cursor:"pointer"}}>
                    {s.name}
                  </button>
                ))}
              </div>
            )}

            <div style={{fontSize:"13px", color:"#666", marginBottom:"6px"}}>Descripción</div>
            <textarea value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} style={{...inputStyle, minHeight:"60px", resize:"vertical"}} />

            <div style={{fontSize:"13px", color:"#666", marginBottom:"6px"}}>Fecha programada</div>
            <input type="date" value={form.scheduled_date} onChange={e => setForm(f => ({...f, scheduled_date: e.target.value}))} style={inputStyle} />

            <div style={{fontSize:"13px", color:"#666", marginBottom:"6px"}}>Notas</div>
            <textarea value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} style={{...inputStyle, minHeight:"40px", resize:"vertical"}} />

            <div style={{display:"flex", gap:"8px", justifyContent:"flex-end", marginTop:"16px"}}>
              <button onClick={() => setShowModal(false)} style={btnSecondary}>Cancelar</button>
              <button onClick={save} disabled={!form.title || saving} style={btnPrimary}>
                {saving ? "..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
