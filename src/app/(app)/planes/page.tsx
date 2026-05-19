"use client";

import { useState, useEffect, useCallback } from "react";

type Service = {
  id: number; name: string; description: string; price: string;
  is_recurring: boolean; is_active: boolean;
};

type Plan = {
  id: number; name: string; description: string; billing_cycle: string; amount: string;
  service_id: number; is_active: boolean; requires_contract: boolean;
  allows_invoice: boolean; requires_billing_day: boolean;
  allowed_payment_methods: string; sort_order: number;
};

const CYCLE_LABELS: Record<string, string> = {
  weekly: "Semanal", biweekly: "Quincenal", monthly: "Mensual",
  quarterly: "Trimestral", semiannual: "Semestral", annual: "Anual",
};
function getToken() { if (typeof window === "undefined") return null; return localStorage.getItem("token"); }

async function fetchJson<T>(url: string): Promise<T> {
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers["Authorization"] = "Bearer " + token;
  const res = await fetch(url, { headers });
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

export default function PlanesPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<"cards" | "list">("cards");
  const [form, setForm] = useState({
    billing_cycle: "monthly", requires_contract: false,
    allows_invoice: false, requires_billing_day: false,
    allowed_payment_methods: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, s] = await Promise.all([
        fetchJson<Plan[]>("/api/plans"),
        fetchJson<Service[]>("/api/services?recurring=true"),
      ]);
      setPlans(p);
      setServices(s.filter(x => x.is_recurring));
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function save() {
    setSaving(true);
    try {
      if (editId) {
        await putJson("/api/plans/" + editId, form);
      }
      setShowModal(false);
      await load();
    } catch (e) { console.error(e); }
    setSaving(false);
  }

  function openForm(plan?: Plan) {
    if (plan) {
      setForm({
        billing_cycle: plan.billing_cycle,
        requires_contract: plan.requires_contract,
        allows_invoice: plan.allows_invoice,
        requires_billing_day: plan.requires_billing_day,
        allowed_payment_methods: plan.allowed_payment_methods,
      });
      setEditId(plan.id);
    }
    setShowModal(true);
  }

  const containerStyle: React.CSSProperties = { padding: "24px", maxWidth: "900px", margin: "0 auto" };
  const cardStyle: React.CSSProperties = {
    background: "#fff", borderRadius: "16px", padding: "20px 24px",
    boxShadow: "0 2px 12px rgba(0,0,0,0.06)", marginBottom: "16px",
  };

  if (loading) return <div style={containerStyle}><p>Cargando...</p></div>;

  return (
    <div style={containerStyle}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:"12px", flexWrap:"wrap", marginBottom: "24px" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "22px" }}>Planes (Servicios recurrentes)</h1>
          <p style={{ fontSize: "13px", color: "#666", marginTop: "4px" }}>
            Los planes se crean automáticamente desde Servicios al marcar un servicio como recurrente.
            Acá configurás los detalles de facturación.
          </p>
        </div>
        <div style={{display:"flex", gap:"8px"}}>
          <button style={{...btnSecondary, padding:"6px 10px", background: viewMode === "list" ? "#1a1a2e" : "transparent", color: viewMode === "list" ? "#fff" : "#333"}} onClick={() => setViewMode("list")} title="Vista lista">☰</button>
          <button style={{...btnSecondary, padding:"6px 10px", background: viewMode === "cards" ? "#1a1a2e" : "transparent", color: viewMode === "cards" ? "#fff" : "#333"}} onClick={() => setViewMode("cards")} title="Vista tarjetas">⊞</button>
        </div>
      </div>

      <div style={cardStyle}>
        {plans.length === 0 ? (
          <p style={{ color: "#999" }}>
            No hay planes. Creá un servicio recurrente en Servicios primero.
          </p>
        ) : viewMode === "list" ? (
          <div>
            {plans.map((p) => {
              const svc = services.find(s => s.id === p.service_id);
              return (
                <div key={p.id} style={{display:"grid", gridTemplateColumns:"1fr 110px 120px 110px", gap:"10px", alignItems:"center", padding:"12px 0", borderBottom:"1px solid #f1f1f1"}}>
                  <div>
                    <div style={{fontWeight:700}}>{p.name}</div>
                    <div style={{fontSize:"12px", color:"#666"}}>{svc ? "Servicio: " + svc.name : p.description}</div>
                  </div>
                  <div style={{fontSize:"12px", color:"#666"}}>{CYCLE_LABELS[p.billing_cycle] || p.billing_cycle}</div>
                  <div style={{fontWeight:700, color:"#6c63ff"}}>${Number(p.amount).toLocaleString("es-AR", {minimumFractionDigits:2})}</div>
                  <button style={{ ...btnSecondary, padding: "4px 12px", fontSize: "12px" }} onClick={() => openForm(p)}>⚙️</button>
                </div>
              );
            })}
          </div>
        ) : (
          <div>
            {plans.map((p) => {
              const svc = services.find(s => s.id === p.service_id);
              return (
                <div key={p.id} style={{
                  border: "1px solid #f0f0f0", borderRadius: "14px",
                  padding: "20px", marginBottom: "12px",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ fontSize: "16px", fontWeight: 700 }}>{p.name}</div>
                      <div style={{ fontSize: "13px", color: "#666", marginTop: "2px" }}>{p.description}</div>
                      {svc && (
                        <div style={{ fontSize: "12px", color: "#6c63ff", marginTop: "4px" }}>
                          Servicio base: {svc.name} — ${Number(svc.price).toLocaleString("es-AR", {minimumFractionDigits:2})}
                        </div>
                      )}
                    </div>
                    <button style={{ ...btnSecondary, padding: "4px 12px", fontSize: "12px" }} onClick={() => openForm(p)}>
                      ⚙️ Configurar
                    </button>
                  </div>

                  <div style={{ display: "flex", gap: "16px", marginTop: "16px", flexWrap: "wrap" }}>
                    <div style={{ fontSize: "13px", color: "#555" }}>
                      <strong>Ciclo:</strong> {CYCLE_LABELS[p.billing_cycle] || p.billing_cycle}
                    </div>
                    <div style={{ fontSize: "13px", color: "#555" }}>
                      <strong>Monto:</strong> ${Number(p.amount).toLocaleString("es-AR", {minimumFractionDigits:2})}
                    </div>
                    {p.requires_contract && (
                      <div style={{ fontSize: "12px", background: "#fff3cd", color: "#856404", padding: "2px 8px", borderRadius: "6px" }}>
                        Requiere contrato
                      </div>
                    )}
                    {p.allows_invoice && (
                      <div style={{ fontSize: "12px", background: "#e8f4fd", color: "#0056b3", padding: "2px 8px", borderRadius: "6px" }}>
                        Factura disponible
                      </div>
                    )}
                    {p.requires_billing_day && (
                      <div style={{ fontSize: "12px", background: "#f0f0f0", color: "#666", padding: "2px 8px", borderRadius: "6px" }}>
                        Requiere día de cobro
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL */}
      {showModal && (
        <div onClick={() => setShowModal(false)} style={{position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", display:"flex", alignItems:"center", justifyContent:"center", padding:"20px", zIndex:1000}}>
          <div onClick={e => e.stopPropagation()} style={{background:"#fff", borderRadius:"18px", padding:"24px", width:"100%", maxWidth:"420px"}}>
            <h3 style={{margin:"0 0 16px", fontSize:"18px"}}>Configurar plan</h3>

            <div style={{fontSize:"13px", color:"#666", marginBottom:"6px"}}>Ciclo de facturación</div>
            <select value={form.billing_cycle} onChange={e => setForm(f => ({...f, billing_cycle: e.target.value}))} style={{width:"100%", padding:"10px 12px", borderRadius:"10px", border:"1px solid #e0e0e0", fontSize:"14px", background:"#fff", boxSizing:"border-box", marginBottom:"8px"}}>
              {Object.entries(CYCLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>

            <label style={{display:"flex", alignItems:"center", gap:"8px", fontSize:"13px", margin:"8px 0", cursor:"pointer"}}>
              <input type="checkbox" checked={form.requires_contract}
                onChange={e => setForm(f => ({...f, requires_contract: e.target.checked}))} />
              Requiere contrato
            </label>

            <label style={{display:"flex", alignItems:"center", gap:"8px", fontSize:"13px", margin:"8px 0", cursor:"pointer"}}>
              <input type="checkbox" checked={form.allows_invoice}
                onChange={e => setForm(f => ({...f, allows_invoice: e.target.checked}))} />
              Permite emitir factura
            </label>

            <label style={{display:"flex", alignItems:"center", gap:"8px", fontSize:"13px", margin:"8px 0", cursor:"pointer"}}>
              <input type="checkbox" checked={form.requires_billing_day}
                onChange={e => setForm(f => ({...f, requires_billing_day: e.target.checked}))} />
              Requiere definir día de cobro
            </label>

            <div style={{fontSize:"13px", color:"#666", marginBottom:"6px", marginTop:"12px"}}>Métodos de pago permitidos (nombres separados por coma)</div>
            <input value={form.allowed_payment_methods} onChange={e => setForm(f => ({...f, allowed_payment_methods: e.target.value}))}
              style={{width:"100%", padding:"10px 12px", borderRadius:"10px", border:"1px solid #e0e0e0", fontSize:"14px", background:"#fff", boxSizing:"border-box", marginBottom:"8px"}}
              placeholder="Ej: transferencia, mercadopago, efectivo" />

            <div style={{display:"flex", gap:"8px", justifyContent:"flex-end", marginTop:"16px"}}>
              <button onClick={() => setShowModal(false)} style={btnSecondary}>Cancelar</button>
              <button onClick={save} disabled={saving} style={btnPrimary}>
                {saving ? "..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
