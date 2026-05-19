"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchJson, postJson, putJson, deleteJson } from "../../lib";
import { Card, IconButton, Input, PageTitle, Loading, Empty } from "../../components/shared/UI";
import StatsCards from "../../components/shared/StatsCards";

type CondicionIva = { value: string; label: string };

type Contact = {
  id: number;
  name: string;
  phone: string;
  email: string;
  address: string;
  location: string;
  notes: string;
  whatsapp: string;
  instagram: string;
  tiktok: string;
  condicion_iva: string;
  cuit: string;
  condicion_iibb: string;
  calificacion: number;
  deleted_at: string | null;
  entity_id: number | null;
  entity_name?: string;
};


export default function ContactosPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [period, setPeriod] = useState<"today"|"week"|"month">("today");
  const [editing, setEditing] = useState<Contact | null>(null);
  const [condicionesIva, setCondicionesIva] = useState<CondicionIva[]>([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    name: "", phone: "", email: "", address: "", location: "", notes: "",
    whatsapp: "", instagram: "", tiktok: "",
    condicion_iva: "", cuit: "", condicion_iibb: "", calificacion: 5,
    entity_id: 0 as number,
  });
  const [isMobile, setIsMobile] = useState(false);
  const [isTiny, setIsTiny] = useState(false);
  const [copied, setCopied] = useState(false);
  const [entities, setEntities] = useState<{id: number; name: string}[]>([]);

  useEffect(() => {
    const onResize = () => {
      setIsMobile(window.innerWidth < 900);
      setIsTiny(window.innerWidth < 500);
    };
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  function loadContacts() {
    fetchJson<Contact[]>("/contacts").then(setContacts).catch(console.error);
  }

  useEffect(() => {
    Promise.all([
      fetchJson<Contact[]>("/contacts"),
      fetchJson<CondicionIva[]>("/condiciones-iva"),
      fetchJson<{id: number; name: string}[]>("/entities"),
    ]).then(([c, iva, ents]) => {
      setContacts(c);
      setCondicionesIva(iva);
      setEntities(ents || []);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  function openNew() {
    setEditing(null);
    setForm({
      name: "", phone: "", email: "", address: "", location: "", notes: "",
      whatsapp: "", instagram: "", tiktok: "", condicion_iva: "", cuit: "", condicion_iibb: "", calificacion: 5,
      entity_id: 0,
    });
    setShowForm(true);
  }

  function openEdit(c: Contact) {
    setEditing(c);
    setForm({
      name: c.name || "", phone: c.phone || "", email: c.email || "", address: c.address || "", location: c.location || "",
      notes: c.notes || "", whatsapp: c.whatsapp || "", instagram: c.instagram || "", tiktok: c.tiktok || "",
      condicion_iva: c.condicion_iva || "", cuit: c.cuit || "", condicion_iibb: c.condicion_iibb || "", calificacion: c.calificacion || 5,
      entity_id: c.entity_id || 0,
    });
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.name && !form.phone) return;
    try {
      if (editing) {
        await putJson(`/contacts/${editing.id}`, form);
      } else {
        await postJson("/contacts", form);
      }
      setShowForm(false);
      loadContacts();
    } catch (e) { console.error(e); }
  }

  async function handleDelete(id: number) {
    if (!confirm("Eliminar contacto?")) return;
    try {
      await deleteJson(`/contacts/${id}`);
      loadContacts();
    } catch (e) { console.error(e); }
  }

  const isConsumidorFinal = form.condicion_iva === "consumidor_final";

  const filteredContacts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter((c) => (
      (c.name||"").toLowerCase().includes(q)||
      (c.phone||"").toLowerCase().includes(q)||
      (c.whatsapp||"").toLowerCase().includes(q)||
      (c.email||"").toLowerCase().includes(q)||
      (c.location||"").toLowerCase().includes(q)||
      (c.address||"").toLowerCase().includes(q)||
      (c.instagram||"").toLowerCase().includes(q)||
      (c.tiktok||"").toLowerCase().includes(q)||
      (c.cuit||"").toLowerCase().includes(q)||
      (c.condicion_iibb||"").toLowerCase().includes(q)||
      (condicionesIva.find(x=>x.value===c.condicion_iva)?.label||c.condicion_iva||"").toLowerCase().includes(q)
    ));
  }, [contacts, search, condicionesIva]);


  function copyTable() {
    const h = ["Nombre","Telefono","WhatsApp","Email","Direccion","Localidad","IG","TT","Notas","IVA","CUIT","IIBB","Score","Entidad"];
    const r = filteredContacts.map(x => [x.name||"",x.phone||"",x.whatsapp||"",x.email||"",x.address||"",x.location||"",x.instagram||"",x.tiktok||"",x.notes||"",(condicionesIva.find(i=>i.value===x.condicion_iva)?.label||x.condicion_iva||""),x.cuit||"",x.condicion_iibb||"",String(x.calificacion||""),(x.entity_name||"")]);
    const tsv = [h.join("\t"),...r.map(x=>x.join("\t"))].join("\n");
    navigator.clipboard.writeText(tsv).then(()=>{setCopied(true);setTimeout(()=>setCopied(false),2000)}).catch(()=>{const ta=document.createElement("textarea");ta.value=tsv;document.body.appendChild(ta);ta.select();document.execCommand("copy");document.body.removeChild(ta);setCopied(true);setTimeout(()=>setCopied(false),2000)});
  }

  const thStyle = { padding: "10px 8px", fontSize: "12px", color: "#666", whiteSpace: "nowrap" };
  const tdStyle = { padding: "10px 8px", verticalAlign: "top" };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <PageTitle>👥 Contactos</PageTitle>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <IconButton variant={copied ? "primary" : "ghost"} title={copied ? "Copiado!" : "Copiar tabla"} onClick={copyTable}>{copied ? "✓" : "📋"}</IconButton>
          <IconButton variant="primary" onClick={openNew}>+</IconButton>
        </div>
      </div>

      <Card style={{ marginBottom: "16px" }}>
        <Input label="Buscar contacto" value={search} onChange={setSearch} placeholder="Nombre, teléfono, WhatsApp, email, localidad, CUIT..." />
      </Card>

      {showForm && (
        <div onClick={() => setShowForm(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: isMobile ? "flex-start" : "center", justifyContent: "center", padding: isMobile ? "12px" : "24px", paddingTop: isMobile ? "16px" : "24px", zIndex: 1000, overflowY: "auto" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "min(1100px, 100%)", maxHeight: isMobile ? "none" : "92vh", overflow: "auto", background: "#fff", borderRadius: isMobile ? "16px" : "18px", padding: isMobile ? "16px" : "22px", boxShadow: "0 24px 70px rgba(0,0,0,0.25)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: isMobile ? "flex-start" : "center", marginBottom: "16px", gap: "12px", flexDirection: isMobile ? "column" : "row" }}>
              <h3 style={{ fontSize: "18px", fontWeight: 700, margin: 0 }}>{editing ? "Editar contacto" : "Nuevo contacto"}</h3>
              {editing && (
                <button onClick={() => { handleDelete(editing.id); setShowForm(false); }}
                  style={{ background: "none", border: "none", color: "#e74c3c", cursor: "pointer", fontSize: "13px", fontWeight: 600 }}>
                  🗑️ Eliminar
                </button>
              )}
            </div>
          <div style={{ display: "grid", gridTemplateColumns: isTiny ? "1fr" : "1fr 1fr", gap: "12px" }}>
            <Input label="Nombre" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
            <Input label="Teléfono" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
            <Input label="WhatsApp" value={form.whatsapp} onChange={(v) => setForm({ ...form, whatsapp: v })} />
            <Input label="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
            <Input label="Instagram" value={form.instagram} onChange={(v) => setForm({ ...form, instagram: v })} />
            <Input label="TikTok" value={form.tiktok} onChange={(v) => setForm({ ...form, tiktok: v })} />
            </div>
            <div>
              <label style={{ fontSize: "12px", fontWeight: 600, display: "block", marginBottom: "4px", color: "#555" }}>Club / Entidad</label>
              <select value={form.entity_id} onChange={(e) => setForm({ ...form, entity_id: Number(e.target.value) })}
                style={{ width: "100%", padding: "8px 10px", border: "1px solid #ddd", borderRadius: "8px", fontSize: "13px" }}>
                <option value={0}>Sin asignar</option>
                {entities.map(ent => <option key={ent.id} value={ent.id}>{ent.name}</option>)}
              </select>
            </div>
            <div>
            <Input label="Dirección" value={form.address} onChange={(v) => setForm({ ...form, address: v })} />
            <Input label="Localidad" value={form.location} onChange={(v) => setForm({ ...form, location: v })} />
          </div>

          <div style={{ marginTop: "16px", padding: "12px", background: "#f8f8f8", borderRadius: "10px" }}>
            <div style={{ display: "grid", gridTemplateColumns: isTiny ? "1fr" : "1fr 1fr", gap: "12px" }}>
              <div>
                <label style={{ fontSize: "12px", fontWeight: 600, display: "block", marginBottom: "4px", color: "#555" }}>Condición IVA</label>
                <select value={form.condicion_iva} onChange={(e) => setForm({ ...form, condicion_iva: e.target.value })}
                  style={{ width: "100%", padding: "8px 10px", border: "1px solid #ddd", borderRadius: "8px", fontSize: "13px" }}>
                  <option value="">Sin asignar</option>
                  {condicionesIva.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <Input label="CUIL/CUIT" value={form.cuit} onChange={(v) => setForm({ ...form, cuit: v })} />
              <Input label="Condición IIBB" value={form.condicion_iibb} onChange={(v) => setForm({ ...form, condicion_iibb: v })} />
              {!isConsumidorFinal && (
                <div style={{ display: "flex", alignItems: "flex-end", gap: "6px", padding: "8px", background: "#fff3cd", borderRadius: "8px", border: "1px solid #ffc107" }}>
                  <span style={{ fontSize: "12px" }}>⚠️ Estos campos son obligatorios para responsable inscripto</span>
                </div>
              )}
            </div>
          </div>

          <div style={{ marginTop: "12px" }}>
            <label style={{ fontSize: "12px", fontWeight: 600, display: "block", marginBottom: "4px", color: "#555" }}>
              Calificación: {form.calificacion}/10
            </label>
            <input type="range" min="1" max="10" value={form.calificacion}
              onChange={(e) => setForm({ ...form, calificacion: parseInt(e.target.value) })}
              style={{ width: "100%", accentColor: "#6c63ff" }} />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#888", marginTop: "2px" }}>
              <span>1 - Bajo</span>
              <span>10 - Alto</span>
            </div>
          </div>

          <div style={{ marginTop: "12px" }}>
            <Input label="Notas" value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} />
          </div>

          <div style={{ marginTop: "16px", display: "flex", gap: "8px" }}>
            <IconButton variant="primary" onClick={handleSave}>✓</IconButton>
            <IconButton variant="secondary" onClick={() => setShowForm(false)}>✕</IconButton>
          </div>
          </div>
        </div>
      )}

      {loading ? <Loading /> : filteredContacts.length === 0 ? (
        <Empty message="Sin contactos" />
      ) : (
        <Card>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
              <thead>
                <tr style={{ textAlign: "left", borderBottom: "2px solid #e0e0e0", background: "#fafafa" }}>
                  <th style={{...thStyle, cursor:"default", fontWeight:700}}>Nombre</th>
                  <th style={{...thStyle, cursor:"default", fontWeight:700}}>Telefono</th>
                  <th style={{...thStyle, cursor:"default", fontWeight:700}}>WhatsApp</th>
                  <th style={{...thStyle, cursor:"default", fontWeight:700}}>Email</th>
                  <th style={{...thStyle, cursor:"default", fontWeight:700}}>Direccion</th>
                  <th style={{...thStyle, cursor:"default", fontWeight:700}}>Localidad</th>
                  <th style={{...thStyle, cursor:"default", fontWeight:700}}>IG</th>
                  <th style={{...thStyle, cursor:"default", fontWeight:700}}>TT</th>
                  <th style={{...thStyle, cursor:"default", fontWeight:700}}>IVA</th>
                  <th style={{...thStyle, cursor:"default", fontWeight:700}}>CUIT</th>
                  <th style={{...thStyle, cursor:"default", fontWeight:700}}>IIBB</th>
                  <th style={{...thStyle, cursor:"default", fontWeight:700}}>Score</th>
                  <th style={{...thStyle, cursor:"default", fontWeight:700}}>Entidad</th>
                  <th style={{...thStyle, cursor:"default", fontWeight:700}}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredContacts.map((ct) => (
                  <tr key={ct.id} style={{ borderBottom: "1px solid #f1f1f1", cursor:"pointer" }} onClick={() => window.location.href = "/contactos/" + ct.id}>
                    <td style={tdStyle}><strong>{ct.name || "-"}</strong></td>
                    <td style={tdStyle}>{ct.phone || "-"}</td>
                    <td style={tdStyle}>{ct.whatsapp || "-"}</td>
                    <td style={tdStyle}>{ct.email || "-"}</td>
                    <td style={tdStyle}>{ct.address || "-"}</td>
                    <td style={tdStyle}>{ct.location || "-"}</td>
                    <td style={tdStyle}>{ct.instagram ? "@" + ct.instagram.replace("@","") : "-"}</td>
                    <td style={tdStyle}>{ct.tiktok ? "@" + ct.tiktok.replace("@","") : "-"}</td>
                    <td style={tdStyle}>{condicionesIva.find(x => x.value === ct.condicion_iva)?.label || ct.condicion_iva || "-"}</td>
                    <td style={tdStyle}>{ct.cuit || "-"}</td>
                    <td style={tdStyle}>{ct.condicion_iibb || "-"}</td>
                    <td style={{...tdStyle, textAlign:"center"}}>
                      <span style={{ fontSize:"11px", background: ct.calificacion >= 7 ? "#27ae6022" : ct.calificacion >= 4 ? "#f39c1215" : "#e74c3c22", color: ct.calificacion >= 7 ? "#27ae60" : ct.calificacion >= 4 ? "#f39c12" : "#e74c3c", padding:"2px 6px", borderRadius:"8px" }}>★ {ct.calificacion || 0}</span>
                    </td>
                    <td style={tdStyle}>{ct.entity_name || "-"}</td>
                    <td style={tdStyle} onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: "flex", gap: "4px" }}>
                        
                        <IconButton variant="ghost" title="Editar" onClick={() => window.location.href = "/contactos/" + ct.id}>✏️</IconButton>
                        <IconButton variant="danger" title="Eliminar" onClick={() => handleDelete(ct.id)}>🗑️</IconButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}