"use client";

import { useEffect, useState } from "react";
import { fetchJson, postJson, putJson, deleteJson } from "../../lib";
import { Card, CardHeader, Button, IconButton, Input, Select, PageTitle, Loading } from "../../components/shared/UI";

type Client = {
  id: number;
  name: string;
  subdomain: string;
  logo_url: string;
  slogan: string;
  address: string;
  phone: string;
  whatsapp: string;
  email: string;
  business_hours: Record<string, string[]>;
  city: string;
  instagram_url: string;
  facebook_url: string;
  tiktok_url: string;
  web_url: string;
};

type FiscalData = {
  id: number;
  client_id: number;
  razon_social: string;
  cuit: string;
  condicion_iva: string;
  situacion_iibb: string;
  numero_iibb: string;
  alicuota_default?: number;
};

type User = {
  id: number;
  username: string;
  name: string;
  email: string;
  phone: string;
  telegram_id: string;
  rol: string;
};


type IvaAlicuota = { codigo_afip: number; porcentaje: string | number; nombre: string };
const FALLBACK_IVA_ALICUOTAS: IvaAlicuota[] = [
  { codigo_afip: 3, porcentaje: 0, nombre: "0% - Exento / No gravado" },
  { codigo_afip: 9, porcentaje: 2.5, nombre: "2,5% - Reducida" },
  { codigo_afip: 8, porcentaje: 5, nombre: "5% - Reducida" },
  { codigo_afip: 4, porcentaje: 10.5, nombre: "10,5% - Reducida" },
  { codigo_afip: 5, porcentaje: 21, nombre: "21% - General" },
  { codigo_afip: 6, porcentaje: 27, nombre: "27% - Incrementada" },
];
const ivaOptions = (items: IvaAlicuota[]) => (items.length ? items : FALLBACK_IVA_ALICUOTAS).map(a => ({ value: String(Number(a.porcentaje)), label: a.nombre }));

const DAYS = [
  { key: "monday", label: "Lunes" },
  { key: "tuesday", label: "Martes" },
  { key: "wednesday", label: "Miercoles" },
  { key: "thursday", label: "Jueves" },
  { key: "friday", label: "Viernes" },
  { key: "saturday", label: "Sabado" },
  { key: "sunday", label: "Domingo" },
];

export default function NegocioPage() {
  const [client, setClient] = useState<Client | null>(null);
  const [fiscalData, setFiscalData] = useState<FiscalData | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingBiz, setEditingBiz] = useState(false);
  const [savingBiz, setSavingBiz] = useState(false);
  const [bizSaved, setBizSaved] = useState(false);
  const [formBiz, setFormBiz] = useState({
    slogan: "", logo_url: "", address: "", phone: "", whatsapp: "", email: "",
    city: "", instagram_url: "", facebook_url: "", tiktok_url: "", web_url: "",
  });
  const [businessHours, setBusinessHours] = useState<Record<string, string[]>>({
    monday: ["09:00-18:00"], tuesday: ["09:00-18:00"], wednesday: ["09:00-18:00"],
    thursday: ["09:00-18:00"], friday: ["09:00-18:00"], saturday: ["09:00-13:00"], sunday: [],
  });

  const [showFiscalForm, setShowFiscalForm] = useState(false);
  const [editingFiscal, setEditingFiscal] = useState(false);
  const [savingFiscal, setSavingFiscal] = useState(false);
  const [fiscalSaved, setFiscalSaved] = useState(false);
  const [formFiscal, setFormFiscal] = useState({ razon_social: "", cuit: "", condicion_iva: "", situacion_iibb: "", numero_iibb: "", alicuota_default: "21" });
  const [ivaAlicuotas, setIvaAlicuotas] = useState<IvaAlicuota[]>(FALLBACK_IVA_ALICUOTAS);

  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formUser, setFormUser] = useState({ username: "", password: "", name: "", email: "", phone: "", telegram_id: "", rol: "operator" });

  function loadData() {
    setLoading(true);
    Promise.all([
      fetchJson<Client>("/clients/1"),
      fetchJson<User[]>("/users"),
      fetchJson<FiscalData | null>("/fiscal-data/1"),
      fetchJson<IvaAlicuota[]>("/iva-alicuotas").catch(() => FALLBACK_IVA_ALICUOTAS),
    ])
      .then(([c, u, f, iva]) => {
        setIvaAlicuotas(iva || FALLBACK_IVA_ALICUOTAS);
        setClient(c);
        setUsers(u);
        setFiscalData(f);
        setFormBiz({
          slogan: c.slogan || "",
          logo_url: c.logo_url || "",
          address: c.address || "",
          phone: c.phone || "",
          whatsapp: c.whatsapp || "",
          email: c.email || "",
          city: c.city || "",
          instagram_url: c.instagram_url || "",
          facebook_url: c.facebook_url || "",
          tiktok_url: c.tiktok_url || "",
          web_url: c.web_url || "",
        });
        if (c.business_hours) {
          const bh = typeof c.business_hours === "string" ? JSON.parse(c.business_hours) : c.business_hours;
          const normalized: Record<string, string[]> = {};
          DAYS.forEach(d => {
            const val = bh[d.key];
            normalized[d.key] = Array.isArray(val) ? val : [];
          });
          setBusinessHours(normalized);
        }
        if (f) {
          setFormFiscal({
            razon_social: f.razon_social || "",
            cuit: f.cuit || "",
            condicion_iva: f.condicion_iva || "",
            alicuota_default: f.alicuota_default ? String(f.alicuota_default) : "21",
            situacion_iibb: f.situacion_iibb || "",
            numero_iibb: f.numero_iibb || "",
          });
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadData(); }, []);

  async function handleSaveBiz() {
    setSavingBiz(true);
    try {
      const updated = await putJson<Client>("/clients/1", { ...formBiz, business_hours: businessHours });
      setClient(updated);
      setEditingBiz(false);
      setBizSaved(true);
      setTimeout(() => setBizSaved(false), 2000);
    } catch (e) { console.error(e); }
    finally { setSavingBiz(false); }
  }

  async function handleSaveFiscal() {
    setSavingFiscal(true);
    try {
      const updated = await putJson<FiscalData>("/fiscal-data/1", { ...formFiscal, client_id: 1 });
      setFiscalData(updated);
      setEditingFiscal(false);
      setFiscalSaved(true);
      setTimeout(() => setFiscalSaved(false), 2000);
    } catch (e) { console.error(e); }
    finally { setSavingFiscal(false); }
  }

  function openNewUser() {
    setEditingUser(null);
    setFormUser({ username: "", password: "", name: "", email: "", phone: "", telegram_id: "", rol: "operator" });
    setShowUserForm(true);
  }

  function openEditUser(u: User) {
    setEditingUser(u);
    setFormUser({ username: u.username, password: "", name: u.name || "", email: u.email || "", phone: u.phone || "", telegram_id: u.telegram_id || "", rol: u.rol });
    setShowUserForm(true);
  }

  async function handleSaveUser() {
    try {
      if (editingUser) {
        await putJson(`/users/${editingUser.id}`, { name: formUser.name, email: formUser.email, phone: formUser.phone, telegram_id: formUser.telegram_id, rol: formUser.rol });
      } else {
        if (!formUser.username || !formUser.password) return alert("Usuario y contrasenia requeridos");
        await postJson("/users", formUser);
      }
      setShowUserForm(false);
      loadData();
    } catch (e) { console.error(e); }
  }

  async function handleDeleteUser(id: number) {
    if (!confirm("Eliminar este usuario?")) return;
    try { await deleteJson(`/users/${id}`); loadData(); } catch (e) { console.error(e); }
  }

  if (loading) return <Loading />;

  const ROL_COLORS: Record<string, string> = { admin: "#e74c3c", manager: "#f39c12", operator: "#27ae60" };

  // Build social badges for visual card
  const socialBadges = [
    formBiz.web_url ? { label: formBiz.web_url, icon: "🌐" } : null,
    formBiz.instagram_url ? { label: formBiz.instagram_url, icon: "📸" } : null,
    formBiz.facebook_url ? { label: formBiz.facebook_url, icon: "📘" } : null,
    formBiz.tiktok_url ? { label: formBiz.tiktok_url, icon: "🎵" } : null,
  ].filter((x): x is { label: string; icon: string } => x !== null);

  return (
    <div style={{ maxWidth: "680px" }}>
      <PageTitle>Mi Negocio</PageTitle>

      {/* Resumen placeholder */}
      <div style={{
        background: "linear-gradient(135deg, #6c63ff15, #1a1a2e08)",
        border: "1px solid #6c63ff30",
        borderRadius: "12px",
        padding: "16px 20px",
        marginBottom: "20px",
        fontSize: "13px",
        color: "#666",
        lineHeight: "1.6",
      }}>
        <strong style={{ color: "#6c63ff" }}>Resumen</strong><br />
        Aqui veras un resumen de todo lo que podes configurar en tu negocio.
      </div>

      {/* VISUAL CARD */}
      <Card style={{ marginBottom: "20px", overflow: "hidden" }}>
        <div style={{
          margin: "-20px -20px 0",
          padding: "24px 24px 20px",
          background: "linear-gradient(135deg, #6c63ff 0%, #1a1a2e 100%)",
          color: "#fff",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            {formBiz.logo_url ? (
              <img src={formBiz.logo_url} alt="logo" style={{ width: "56px", height: "56px", borderRadius: "12px", objectFit: "cover", border: "2px solid rgba(255,255,255,0.3)" }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
            ) : (
              <div style={{ width: "56px", height: "56px", borderRadius: "12px", background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "28px" }}>🏪</div>
            )}
            <div>
              <div style={{ fontSize: "20px", fontWeight: 700 }}>{client?.name}</div>
              {formBiz.slogan ? (
                <div style={{ fontSize: "13px", opacity: 0.8, marginTop: "2px" }}>"{formBiz.slogan}"</div>
              ) : (
                <div style={{ fontSize: "13px", opacity: 0.5, marginTop: "2px" }}>Sin eslogan</div>
              )}
            </div>
          </div>
        </div>

        {/* Contact info row */}
        <div style={{ marginTop: "16px", display: "flex", flexWrap: "wrap", gap: "12px", fontSize: "13px", color: "#666" }}>
          {formBiz.address && <span>📍 {formBiz.address}{formBiz.city ? `, ${formBiz.city}` : ""}</span>}
          {formBiz.phone && <span>📞 {formBiz.phone}</span>}
          {formBiz.whatsapp && <span>💬 {formBiz.whatsapp}</span>}
          {formBiz.email && <span>✉️ {formBiz.email}</span>}
        </div>

        {/* Social badges */}
        {socialBadges.length > 0 && (
          <div style={{ marginTop: "12px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {socialBadges.map((b) => (
              <span key={b.label} style={{ background: "#f0f0f0", padding: "3px 10px", borderRadius: "20px", fontSize: "12px" }}>
                {b.icon} {b.label}
              </span>
            ))}
          </div>
        )}
      </Card>

      {/* DATOS COMERCIALES */}
      <Card style={{ marginBottom: "20px" }}>
        <CardHeader
          title="Datos comerciales"
          action={!editingBiz && <IconButton variant="ghost" title="Editar" onClick={() => setEditingBiz(true)}>✏️</IconButton>}
        />
        {editingBiz ? (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <Input label="Slogan" value={formBiz.slogan} onChange={(v) => setFormBiz({ ...formBiz, slogan: v })} placeholder="Tu eslogan" />
              <Input label="Logo (URL)" value={formBiz.logo_url} onChange={(v) => setFormBiz({ ...formBiz, logo_url: v })} placeholder="https://..." />
              <Input label="Direccion" value={formBiz.address} onChange={(v) => setFormBiz({ ...formBiz, address: v })} placeholder="Av. Libertador 1234" />
              <Input label="Ciudad" value={formBiz.city} onChange={(v) => setFormBiz({ ...formBiz, city: v })} placeholder="San Juan" />
              <Input label="Telefono" value={formBiz.phone} onChange={(v) => setFormBiz({ ...formBiz, phone: v })} placeholder="+54 264 1234567" />
              <Input label="WhatsApp" value={formBiz.whatsapp} onChange={(v) => setFormBiz({ ...formBiz, whatsapp: v })} placeholder="+54 264 9876543" />
              <Input label="Email" value={formBiz.email} onChange={(v) => setFormBiz({ ...formBiz, email: v })} placeholder="info@minegocio.com" />
            </div>

            {/* Horarios por dia */}
            <div style={{ marginTop: "16px", paddingTop: "16px", borderTop: "1px solid #f0" }}>
              <div style={{ fontSize: "12px", fontWeight: 600, color: "#888", marginBottom: "10px" }}>Horarios de atencion</div>
              {DAYS.map((day) => (
                <div key={day.key} style={{ marginBottom: "12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                    <span style={{ width: "90px", fontSize: "13px", color: "#666", fontWeight: 600 }}>{day.label}</span>
                    <button
                      onClick={() => setBusinessHours({ ...businessHours, [day.key]: [...(businessHours[day.key] || []), "09:00-18:00"] })}
                      style={{ background: "#6c63ff", color: "#fff", border: "none", borderRadius: "6px", padding: "2px 10px", fontSize: "12px", cursor: "pointer" }}
                    >+ franja</button>
                    {businessHours[day.key]?.length === 0 && (
                      <span style={{ fontSize: "12px", color: "#ccc" }}>cerrado</span>
                    )}
                  </div>
                  {businessHours[day.key]?.map((slot, idx) => (
                    <div key={idx} style={{ display: "flex", alignItems: "center", gap: "6px", marginLeft: "98px", marginBottom: "4px" }}>
                      <input
                        value={slot}
                        onChange={(e) => {
                          const updated = [...businessHours[day.key]];
                          updated[idx] = e.target.value;
                          setBusinessHours({ ...businessHours, [day.key]: updated });
                        }}
                        style={{ flex: 1, padding: "5px 10px", border: "1px solid #ddd", borderRadius: "8px", fontSize: "13px" }}
                        placeholder="09:00-13:00"
                      />
                      <button
                        onClick={() => {
                          const updated = businessHours[day.key].filter((_, i) => i !== idx);
                          setBusinessHours({ ...businessHours, [day.key]: updated });
                        }}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "#e74c3c", fontSize: "14px" }}
                      >✕</button>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {/* Redes */}
            <div style={{ marginTop: "16px", paddingTop: "16px", borderTop: "1px solid #f0" }}>
              <div style={{ fontSize: "12px", fontWeight: 600, color: "#888", marginBottom: "10px" }}>Redes y web</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <Input label="Web" value={formBiz.web_url} onChange={(v) => setFormBiz({ ...formBiz, web_url: v })} placeholder="https://..." />
                <Input label="Instagram" value={formBiz.instagram_url} onChange={(v) => setFormBiz({ ...formBiz, instagram_url: v })} placeholder="nombredeusuario" />
                <Input label="Facebook" value={formBiz.facebook_url} onChange={(v) => setFormBiz({ ...formBiz, facebook_url: v })} placeholder="nombredeusuario" />
                <Input label="TikTok" value={formBiz.tiktok_url} onChange={(v) => setFormBiz({ ...formBiz, tiktok_url: v })} placeholder="nombredeusuario" />
              </div>
            </div>

            <div style={{ display: "flex", gap: "8px", marginTop: "16px", paddingTop: "16px", borderTop: "1px solid #f0" }}>
              <Button onClick={handleSaveBiz} disabled={savingBiz}>
                {savingBiz ? "Guardando..." : "Guardar cambios"}
              </Button>
              <Button variant="secondary" onClick={() => setEditingBiz(false)}>Cancelar</Button>
            </div>
            {bizSaved && <div style={{ color: "#27ae60", fontSize: "13px", fontWeight: 600, marginTop: "8px" }}>Cambios guardados</div>}
          </div>
        ) : (
          /* View mode: only show schedule */
          <div style={{ fontSize: "13px", color: "#666" }}>
            {businessHours && (
              <div>
                {DAYS.map((day) => (
                  <div key={day.key} style={{ marginBottom: "4px" }}>
                    <span style={{ color: "#888" }}>{day.label}: </span>
                    {businessHours[day.key]?.length > 0
                      ? businessHours[day.key].map((slot, i) => (
                          <span key={i} style={{ marginRight: "6px" }}>🕐 {slot}</span>
                        ))
                      : <span style={{ color: "#ccc" }}>cerrado</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Card>

      {/* DATOS FISCALES */}
      <Card style={{ marginBottom: "20px" }}>
        <CardHeader
          title="Datos fiscales"
          action={!editingFiscal && <IconButton variant="ghost" title="Editar" onClick={() => { setEditingFiscal(true); setShowFiscalForm(true); }}>✏️</IconButton>}
        />
        {showFiscalForm && editingFiscal ? (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <Input label="Razon social" value={formFiscal.razon_social} onChange={(v) => setFormFiscal({ ...formFiscal, razon_social: v })} placeholder="Nombre juridico de la empresa" />
              <Input label="CUIT" value={formFiscal.cuit} onChange={(v) => setFormFiscal({ ...formFiscal, cuit: v })} placeholder="XX-XXXXXXXX-X" />
              <Input label="Condicion IVA" value={formFiscal.condicion_iva} onChange={(v) => setFormFiscal({ ...formFiscal, condicion_iva: v })} placeholder="Responsable Inscripto" />
              <Input label="Situacion IIBB" value={formFiscal.situacion_iibb} onChange={(v) => setFormFiscal({ ...formFiscal, situacion_iibb: v })} placeholder="Activo" />
              <Input label="Nro IIBB" value={formFiscal.numero_iibb} onChange={(v) => setFormFiscal({ ...formFiscal, numero_iibb: v })} placeholder="123456-00" />
              <Select label="Alícuota IVA por defecto" value={formFiscal.alicuota_default} onChange={(v) => setFormFiscal({ ...formFiscal, alicuota_default: v })} options={ivaOptions(ivaAlicuotas)} />
            </div>
            <div style={{ display: "flex", gap: "8px", marginTop: "16px", paddingTop: "16px", borderTop: "1px solid #f0" }}>
              <Button onClick={handleSaveFiscal} disabled={savingFiscal}>
                {savingFiscal ? "Guardando..." : "Guardar cambios"}
              </Button>
              <Button variant="secondary" onClick={() => { setEditingFiscal(false); setShowFiscalForm(false); }}>Cancelar</Button>
            </div>
            {fiscalSaved && <div style={{ color: "#27ae60", fontSize: "13px", fontWeight: 600, marginTop: "8px" }}>Cambios guardados</div>}
          </div>
        ) : (
          <div style={{ fontSize: "13px", color: "#666" }}>
            {fiscalData?.razon_social && <div>🏢 {fiscalData.razon_social}</div>}
            {fiscalData?.cuit && <div>📋 CUIT: {fiscalData.cuit}</div>}
            {fiscalData?.condicion_iva && <div>📐 {fiscalData.condicion_iva}</div>}
            {fiscalData?.situacion_iibb && <div>📍 IIBB: {fiscalData.situacion_iibb}{fiscalData.numero_iibb ? ` - ${fiscalData.numero_iibb}` : ""}</div>}
            {fiscalData?.alicuota_default && <div>🧾 IVA default: {fiscalData.alicuota_default}%</div>}
            {!fiscalData?.razon_social && !fiscalData?.cuit && (
              <div style={{ color: "#ccc" }}>Sin datos fiscales cargados. Click ✏️ para agregar.</div>
            )}
          </div>
        )}
      </Card>

      {/* MI EQUIPO */}
      <Card>
        <CardHeader
          title="Mi equipo"
          action={<IconButton variant="primary" title="Agregar usuario" onClick={openNewUser}>+</IconButton>}
        />
        {users.length === 0 ? (
          <div style={{ textAlign: "center", padding: "24px", color: "#aaa", fontSize: "13px" }}>Sin usuarios</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {users.map((u) => (
              <div key={u.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", background: "#f8f8f8", borderRadius: "10px" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#6c63ff22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", flexShrink: 0 }}>
                  {u.name ? u.name[0].toUpperCase() : u.username[0].toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "14px", fontWeight: 600, color: "#333" }}>{u.name || u.username}</div>
                  <div style={{ fontSize: "12px", color: "#aaa" }}>
                  {u.email && <span>✉️ {u.email}</span>}
                  {u.phone && <span style={{ marginLeft: "8px" }}>📞 {u.phone}</span>}
                  {u.telegram_id && <span style={{ marginLeft: "8px" }}>✈️ {u.telegram_id}</span>}
                </div>
                </div>
                <div style={{ padding: "2px 8px", borderRadius: "10px", fontSize: "11px", fontWeight: 600, background: (ROL_COLORS[u.rol] || "#888") + "22", color: ROL_COLORS[u.rol] || "#888" }}>
                  {u.rol}
                </div>
                <div style={{ display: "flex", gap: "4px" }}>
                  <IconButton variant="ghost" title="Editar" onClick={() => openEditUser(u)}>✏️</IconButton>
                  <IconButton variant="danger" title="Eliminar" onClick={() => handleDeleteUser(u.id)}>🗑️</IconButton>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* User Form Modal */}
      {showUserForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }} onClick={(e) => { if (e.target === e.currentTarget) setShowUserForm(false); }}>
          <div style={{ background: "#fff", borderRadius: "16px", padding: "24px", width: "100%", maxWidth: "420px" }}>
            <h3 style={{ fontSize: "17px", fontWeight: 700, marginBottom: "20px" }}>
              {editingUser ? "✏️ Editar usuario" : "+ Nuevo usuario"}
            </h3>
            <Input label="Nombre" value={formUser.name} onChange={(v) => setFormUser({ ...formUser, name: v })} placeholder="Juan Perez" />
            <Input label="Usuario" value={formUser.username} onChange={(v) => setFormUser({ ...formUser, username: v })} disabled={!!editingUser} placeholder="juanperez" />
            {!editingUser && <Input label="Contrasenia" value={formUser.password} onChange={(v) => setFormUser({ ...formUser, password: v })} type="password" placeholder="Minimo 6 caracteres" />}
            <Input label="Email" value={formUser.email} onChange={(v) => setFormUser({ ...formUser, email: v })} placeholder="juan@minegocio.com" />
            <Input label="Telefono" value={formUser.phone} onChange={(v) => setFormUser({ ...formUser, phone: v })} placeholder="+54 264 1234567" />
            <Input label="Telegram ID" value={formUser.telegram_id} onChange={(v) => setFormUser({ ...formUser, telegram_id: v })} placeholder="ID numerico de Telegram" />
            <div style={{ marginBottom: "16px" }}>
              <label style={{ fontSize: "13px", fontWeight: 600, display: "block", marginBottom: "4px", color: "#555" }}>Rol</label>
              <select value={formUser.rol} onChange={(e) => setFormUser({ ...formUser, rol: e.target.value })} style={{ width: "100%", padding: "8px 12px", border: "1px solid #ddd", borderRadius: "8px", fontSize: "14px" }}>
                <option value="operator">Operador</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
              <Button variant="secondary" onClick={() => setShowUserForm(false)}>Cancelar</Button>
              <Button onClick={handleSaveUser}>{editingUser ? "Guardar" : "Crear"}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
