"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

type Plan = {
  id: number; name: string; description: string; billing_cycle: string; amount: string;
  is_active: boolean; requires_contract: boolean; sort_order: number;
};

type Subscription = {
  id: number; contact_id: number; plan_id: number; start_date: string; status: string;
  next_billing_date: string; billing_amount: string; notes: string;
  contact_name: string; contact_phone: string; plan_name: string; billing_cycle: string;
};

type Contact = { id: number; name: string };
type PaymentMethod = { id: number; name: string; is_cash?: boolean };
type BillingCycle = {
  id: number; subscription_id: number; contact_id: number; contact_name: string; contact_phone?: string;
  plan_name: string; service_name?: string; billing_cycle: string;
  period_start: string; period_end: string; due_date: string; amount: string; status: string;
  paid_at?: string; paid_amount?: string; items?: any[]; order_id?: number | null; order_number?: string; order_total?: string;
};

const CYCLE_LABELS: Record<string, string> = {
  weekly: "Semanal", biweekly: "Quincenal", monthly: "Mensual",
  quarterly: "Trimestral", semiannual: "Semestral", annual: "Anual",
};

const STATUS_COLORS: Record<string, string> = {
  active: "#27ae60", suspended: "#f39c12", cancelled: "#e74c3c", expired: "#95a5a6",
  pending: "#f39c12", overdue: "#e74c3c", paid: "#27ae60", billed: "#3498db",
};
const BILLING_STATUS_LABELS: Record<string, string> = { pending: "Pendiente", overdue: "Vencido", paid: "Pagado", billed: "Emitido", cancelled: "Cancelado" };

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

export default function SuscripcionesPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"subscriptions" | "cycles">("subscriptions");
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [billingCycles, setBillingCycles] = useState<BillingCycle[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"cards" | "list">("cards");
  const [expandedClientId, setExpandedClientId] = useState<number | null>(null);

  // Modal state
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showSubModal, setShowSubModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [payCycle, setPayCycle] = useState<BillingCycle | null>(null);
  const [payForm, setPayForm] = useState({ payment_method_id: "", amount: "", paid_at: new Date().toISOString().split("T")[0] });
  const [saving, setSaving] = useState(false);

  // Plan form
  const [planForm, setPlanForm] = useState({ name: "", description: "", billing_cycle: "monthly", amount: "", requires_contract: false, sort_order: 0 });
  const [editPlanId, setEditPlanId] = useState<number | null>(null);

  // Sub form
  const [subForm, setSubForm] = useState({ contact_id: "", plan_id: "", start_date: "", billing_amount: "", notes: "" });
  const [editSubId, setEditSubId] = useState<number | null>(null);

  // Overview
  const [overview, setOverview] = useState<any>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, s, c, cycles, pm, ov] = await Promise.all([
        fetchJson<Plan[]>("/api/plans"),
        fetchJson<Subscription[]>("/api/subscriptions"),
        fetchJson<Contact[]>("/api/contacts?limit=500"),
        fetchJson<BillingCycle[]>("/api/billing-cycles"),
        fetchJson<PaymentMethod[]>("/api/payment-methods"),
        fetchJson<any>("/api/billing/overview").catch(() => null),
      ]);
      setPlans(p);
      setSubs(s);
      setContacts(c);
      setBillingCycles(cycles);
      setPaymentMethods(pm);
      setOverview(ov);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function savePlan() {
    setSaving(true);
    try {
      const body = { ...planForm, amount: Number(planForm.amount), sort_order: Number(planForm.sort_order) };
      if (editPlanId) {
        await putJson("/api/plans/" + editPlanId, body);
      } else {
        await postJson("/api/plans", body);
      }
      setShowPlanModal(false);
      await load();
    } catch (e) { console.error(e); }
    setSaving(false);
  }

  async function deletePlan(id: number) {
    if (!confirm("Eliminar plan?")) return;
    try {
      await fetch("/api/plans/" + id, { method: "DELETE" });
      await load();
    } catch (e) { console.error(e); }
  }

  async function saveSub() {
    setSaving(true);
    try {
      const body = {
        contact_id: Number(subForm.contact_id),
        plan_id: Number(subForm.plan_id),
        start_date: subForm.start_date || new Date().toISOString().split("T")[0],
        billing_amount: Number(subForm.billing_amount) || undefined,
        notes: subForm.notes || undefined,
      };
      if (editSubId) {
        await putJson("/api/subscriptions/" + editSubId, { plan_id: body.plan_id, billing_amount: body.billing_amount, notes: body.notes });
      } else {
        await postJson("/api/subscriptions", body);
      }
      setShowSubModal(false);
      await load();
    } catch (e) { console.error(e); }
    setSaving(false);
  }

  async function cancelSub(id: number) {
    if (!confirm("Cancelar suscripción?")) return;
    try {
      await fetch("/api/subscriptions/" + id, { method: "DELETE" });
      await load();
    } catch (e) { console.error(e); }
  }

  async function batchGenerateCycles() {
    if (!confirm("Generar ciclo actual para todas las suscripciones? Solo se creara 1 ciclo por suscripcion, sin ciclos futuros.")) return;
    setSaving(true);
    try {
      const res = await postJson<any>("/api/subscriptions/batch-generate-cycles", {});
      alert("Generados: " + res.generated + "\nSaltados (ya existen o futuros): " + res.skipped);
      await load();
    } catch (e: any) { alert("Error: " + (e?.message || e)); }
    setSaving(false);
  }

  async function generateCycle(subId: number) {
    if (!confirm("Generar el próximo ciclo de facturación?")) return;
    setSaving(true);
    try {
      await postJson("/api/subscriptions/" + subId + "/generate-cycle", {});
      await load();
      alert("✅ Ciclo generado.");
    } catch (e: any) {
      if (e?.body?.error === "already_exists") {
        setSaving(false);
        const period = e?.body?.next_period_start || "";
        if (confirm("❌ El ciclo " + period + " ya existe. ¿Querés crear el siguiente?")) {
          setSaving(true);
          try {
            await postJson("/api/subscriptions/" + subId + "/generate-cycle", { skip: true });
            await load();
            alert("✅ Ciclo siguiente creado.");
          } catch (e2: any) {
            alert("❌ " + (e2?.body?.error || e2?.message || "Error"));
          }
        }
      } else {
        alert("❌ " + (e?.body?.error || e?.message || "Error al generar ciclo"));
      }
    }
    setSaving(false);
  }

  async function accrueBatch() {
    if (!confirm("Devengar todas las suscripciones? Se generaran NVs por los billing cycles pendientes.")) return;
    setSaving(true);
    try {
      const res = await postJson<any>("/api/subscriptions/batch-accrue", {});
      alert("Devengadas: " + res.accrued + "\nSaltadas: " + res.skipped);
      await load();
    } catch (e: any) { alert("Error: " + (e?.message || e)); }
    setSaving(false);
  }

  async function accrueByContact(contactId: number) {
    if (!confirm("Devengar las suscripciones de este cliente?")) return;
    setSaving(true);
    try {
      const res = await postJson<any>("/api/billing/contacts/" + contactId + "/accrue", {});
      alert("Devengadas: " + res.accrued + "\nSaltadas: " + res.skipped);
      await load();
    } catch (e: any) { alert("Error: " + (e?.message || e)); }
    setSaving(false);
  }

  async function accrueSingleCycle(bcId: number) {
    if (!confirm("Devengar este ciclo? Se generara una NV.")) return;
    setSaving(true);
    try {
      const res = await postJson<any>("/api/billing/cycles/" + bcId + "/accrue", {});
      if (res.accrued > 0) alert("NV " + (res.results?.[0]?.order_number || "generada") + " creada.");
      else alert("No se pudo devengar: " + (res.message || "error"));
      await load();
    } catch (e: any) { alert("Error: " + (e?.message || e)); }
    setSaving(false);
  }

  async function accrueSubscription(subId: number) {
    if (!confirm("Devengar esta suscripcion? Se generara la NV.")) return;
    setSaving(true);
    try {
      const res = await postJson<any>("/api/billing/subscriptions/" + subId + "/accrue", {});
      alert("Devengadas: " + res.accrued + "\nSaltadas: " + res.skipped);
      await load();
    } catch (e: any) { alert("Error: " + (e?.message || e)); }
    setSaving(false);
  }

  function openPay(cycle: BillingCycle) {
    setPayCycle(cycle);
    setPayForm({ payment_method_id: "", amount: String(cycle.amount || ""), paid_at: new Date().toISOString().split("T")[0] });
    setShowPayModal(true);
  }

  async function payBillingCycle() {
    if (!payCycle) return;
    setSaving(true);
    try {
      await postJson("/api/cash-movements", {
        financial_account_id: Number(payForm.payment_method_id),
        type: "in",
        reason: "subscription_payment",
        billing_cycle_id: payCycle.id,
        client_id: payCycle.contact_id,
        amount: Number(payForm.amount),
        notes: "Cobro ciclo " + payCycle.plan_name + " · " + payCycle.contact_name,
      });
      setShowPayModal(false);
      setPayCycle(null);
      await load();
    } catch (e: any) { alert("Error: " + (e?.message || e)); }
    setSaving(false);
  }

  function openPlanForm(plan?: Plan) {
    if (plan) {
      setPlanForm({
        name: plan.name, description: plan.description, billing_cycle: plan.billing_cycle,
        amount: plan.amount, requires_contract: plan.requires_contract, sort_order: plan.sort_order,
      });
      setEditPlanId(plan.id);
    } else {
      setPlanForm({ name: "", description: "", billing_cycle: "monthly", amount: "", requires_contract: false, sort_order: 0 });
      setEditPlanId(null);
    }
    setShowPlanModal(true);
  }

  function openSubForm(sub?: Subscription) {
    if (sub) {
      setSubForm({
        contact_id: String(sub.contact_id), plan_id: String(sub.plan_id),
        start_date: sub.start_date ? sub.start_date.split("T")[0] : "",
        billing_amount: sub.billing_amount, notes: sub.notes || "",
      });
      setEditSubId(sub.id);
    } else {
      setSubForm({ contact_id: "", plan_id: "", start_date: new Date().toISOString().split("T")[0], billing_amount: "", notes: "" });
      setEditSubId(null);
    }
    setShowSubModal(true);
  }

  const cycleGroups = Object.values(billingCycles.reduce((acc: Record<string, any>, bc) => {
    const key = String(bc.contact_id);
    if (!acc[key]) {
      acc[key] = {
        contact_id: bc.contact_id,
        contact_name: bc.contact_name,
        contact_phone: bc.contact_phone,
        cycles: [] as BillingCycle[],
        pending_total: 0,
        overdue_total: 0,
      };
    }
    acc[key].cycles.push(bc);
    if (bc.status !== "paid" && bc.status !== "cancelled") acc[key].pending_total += Number(bc.amount || 0);
    if (bc.status === "overdue" || (bc.status === "pending" && bc.due_date && new Date(bc.due_date) < new Date())) acc[key].overdue_total += Number(bc.amount || 0);
    return acc;
  }, {})).sort((a: any, b: any) => b.pending_total - a.pending_total || String(a.contact_name).localeCompare(String(b.contact_name)));

  function activeSubsForContact(contactId: number) {
    return subs.filter(s => Number(s.contact_id) === Number(contactId) && s.status === "active");
  }

  const containerStyle: React.CSSProperties = { padding: "24px", maxWidth: "1200px", margin: "0 auto" };
  const cardStyle: React.CSSProperties = {
    background: "#fff", borderRadius: "16px", padding: "20px 24px",
    boxShadow: "0 2px 12px rgba(0,0,0,0.06)", marginBottom: "16px",
  };

  if (loading) return <div style={containerStyle}><p>Cargando...</p></div>;

  return (
    <div style={containerStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <h1 style={{ margin: 0, fontSize: "22px" }}>Suscripciones</h1>
        <div style={{ display: "flex", gap: "8px", alignItems:"center", flexWrap:"wrap" }}>
          <button style={{...btnSecondary, padding:"6px 10px", background: viewMode === "list" ? "#1a1a2e" : "transparent", color: viewMode === "list" ? "#fff" : "#333"}} onClick={() => setViewMode("list")} title="Vista lista">☰</button>
          <button style={{...btnSecondary, padding:"6px 10px", background: viewMode === "cards" ? "#1a1a2e" : "transparent", color: viewMode === "cards" ? "#fff" : "#333"}} onClick={() => setViewMode("cards")} title="Vista tarjetas">⊞</button>
          <button style={btnSecondary} onClick={() => setTab(tab === "cycles" ? "subscriptions" : "cycles")}>
            {tab === "cycles" ? "📋 Ver suscripciones" : "🧾 Ver ciclos"}
          </button>
          <button style={btnSecondary} onClick={() => router.push("/planes")}>📦 Ver planes</button>
        </div>
      </div>

      {/* Overview cards */}
      {overview && (
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "20px" }}>
          <div style={{ ...cardStyle, flex: "1", minWidth: "140px", textAlign: "center", padding: "16px" }}>
            <div style={{ fontSize: "24px", fontWeight: 700 }}>{overview.active_subscriptions}</div>
            <div style={{ fontSize: "12px", color: "#666" }}>Suscripciones activas</div>
          </div>
          <div style={{ ...cardStyle, flex: "1", minWidth: "140px", textAlign: "center", padding: "16px" }}>
            <div style={{ fontSize: "24px", fontWeight: 700, color: "#e74c3c" }}>${Number(overview.overdue_total).toLocaleString("es-AR", {minimumFractionDigits:2})}</div>
            <div style={{ fontSize: "12px", color: "#666" }}>Vencido ({overview.overdue_cycles} ciclos)</div>
          </div>
          <div style={{ ...cardStyle, flex: "1", minWidth: "140px", textAlign: "center", padding: "16px" }}>
            <div style={{ fontSize: "24px", fontWeight: 700, color: "#f39c12" }}>${Number(overview.upcoming_total).toLocaleString("es-AR", {minimumFractionDigits:2})}</div>
            <div style={{ fontSize: "12px", color: "#666" }}>Próximos 30 días ({overview.upcoming_cycles})</div>
          </div>
          <div style={{ ...cardStyle, flex: "1", minWidth: "140px", textAlign: "center", padding: "16px" }}>
            <div style={{ fontSize: "24px", fontWeight: 700, color: "#27ae60" }}>${Number(overview.monthly_revenue).toLocaleString("es-AR", {minimumFractionDigits:2})}</div>
            <div style={{ fontSize: "12px", color: "#666" }}>Cobrado (30 días)</div>
          </div>
        </div>
      )}

      {false && (
        <div style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h2 style={{ margin: 0, fontSize: "16px" }}>Planes / Servicios</h2>
            <button style={btnPrimary} onClick={() => openPlanForm()}>+ Nuevo plan</button>
          </div>

          {plans.length === 0 ? (
            <p style={{ color: "#999" }}>No hay planes creados. Creá el primero.</p>
          ) : viewMode === "cards" ? (
            <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(240px, 1fr))", gap:"12px"}}>
              {plans.map((p) => (
                <div key={p.id} style={{border:"1px solid #f0f0f0", borderRadius:"14px", padding:"16px"}}>
                  <div style={{fontWeight:700, marginBottom:"4px"}}>{p.name}</div>
                  <div style={{fontSize:"12px", color:"#666", minHeight:"34px"}}>{p.description}</div>
                  <div style={{fontSize:"20px", fontWeight:700, color:"#6c63ff", marginTop:"10px"}}>${Number(p.amount).toLocaleString("es-AR", {minimumFractionDigits:2})}</div>
                  <div style={{fontSize:"12px", background:"#f0f0f0", display:"inline-block", padding:"2px 8px", borderRadius:"6px", marginTop:"6px"}}>{CYCLE_LABELS[p.billing_cycle] || p.billing_cycle}</div>
                  <div style={{display:"flex", gap:"6px", justifyContent:"flex-end", marginTop:"12px"}}>
                    <button style={{ ...btnSecondary, padding: "4px 10px" }} onClick={() => openPlanForm(p)}>✏️</button>
                    <button style={{ ...btnSecondary, padding: "4px 10px", color: "#e74c3c" }} onClick={() => deletePlan(p.id)}>🗑️</button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div>
              {plans.map((p) => (
                <div key={p.id} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 0", borderBottom: "1px solid #f1f1f1" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>{p.name}</div>
                    <div style={{ fontSize: "12px", color: "#666" }}>{p.description}</div>
                  </div>
                  <div style={{ fontSize: "13px", color: "#666", minWidth: "80px", textAlign: "right" }}>${Number(p.amount).toLocaleString("es-AR", {minimumFractionDigits:2})}</div>
                  <div style={{ fontSize: "12px", background: "#f0f0f0", padding: "2px 8px", borderRadius: "6px" }}>
                    {CYCLE_LABELS[p.billing_cycle] || p.billing_cycle}
                  </div>
                  <button style={{ ...btnSecondary, padding: "4px 10px" }} onClick={() => openPlanForm(p)}>✏️</button>
                  <button style={{ ...btnSecondary, padding: "4px 10px", color: "#e74c3c" }} onClick={() => deletePlan(p.id)}>🗑️</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "subscriptions" && (
        <div style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h2 style={{ margin: 0, fontSize: "16px" }}>Suscripciones activas</h2>
            <button style={btnPrimary} onClick={() => openSubForm()}>+ Nueva suscripción</button>
          </div>

          {subs.length === 0 ? (
            <p style={{ color: "#999" }}>No hay suscripciones activas.</p>
          ) : viewMode === "cards" ? (
            <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(260px, 1fr))", gap:"12px"}}>
              {subs.map((s) => (
                <div key={s.id} style={{border:"1px solid #f0f0f0", borderRadius:"14px", padding:"16px"}}>
                  <div style={{fontWeight:700, cursor:"pointer"}} onClick={() => router.push("/contactos/" + s.contact_id)}>{s.contact_name}</div>
                  <div style={{fontSize:"12px", color:"#666", marginTop:"2px"}}>{s.plan_name} · {CYCLE_LABELS[s.billing_cycle] || s.billing_cycle}</div>
                  <div style={{fontSize:"20px", fontWeight:700, color:"#6c63ff", marginTop:"10px"}}>${Number(s.billing_amount).toLocaleString("es-AR", {minimumFractionDigits:2})}</div>
                  <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:"10px"}}>
                    <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "6px", background: (STATUS_COLORS[s.status] || "#999") + "22", color: STATUS_COLORS[s.status] || "#999" }}>{s.status}</span>
                    <span style={{fontSize:"11px", color:"#999"}}>Próx: {new Date(s.next_billing_date).toLocaleDateString("es-AR")}</span>
                  </div>
                  <div style={{display:"flex", gap:"6px", justifyContent:"flex-end", marginTop:"12px"}}>
                    <button style={{ ...btnSecondary, padding: "4px 10px" }} onClick={() => generateCycle(s.id)} title="Generar próximo ciclo">🔄</button>
                    <button style={{...btnSecondary, padding:"4px 10px", fontSize:"12px"}} onClick={() => accrueSubscription(s.id)} title="Devengar">📄</button>
                    {s.status === "active" && <button style={{ ...btnSecondary, padding: "4px 10px", color: "#e74c3c" }} onClick={() => cancelSub(s.id)}>✕</button>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div>
              {subs.map((s) => (
                <div key={s.id} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 0", borderBottom: "1px solid #f1f1f1" }}>
                  <div style={{ flex: 1, cursor: "pointer" }} onClick={() => router.push("/contactos/" + s.contact_id)}>
                    <div style={{ fontWeight: 600 }}>{s.contact_name}</div>
                    <div style={{ fontSize: "12px", color: "#666" }}>{s.plan_name} · {CYCLE_LABELS[s.billing_cycle] || s.billing_cycle}</div>
                  </div>
                  <div style={{ fontSize: "13px", fontWeight: 600 }}>${Number(s.billing_amount).toLocaleString("es-AR", {minimumFractionDigits:2})}</div>
                  <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "6px", background: (STATUS_COLORS[s.status] || "#999") + "22", color: STATUS_COLORS[s.status] || "#999" }}>
                    {s.status}
                  </span>
                  <div style={{ fontSize: "11px", color: "#999" }}>Próx: {new Date(s.next_billing_date).toLocaleDateString("es-AR")}</div>
                  <button style={{ ...btnSecondary, padding: "4px 10px" }} onClick={() => generateCycle(s.id)} title="Generar próximo ciclo">🔄</button>
                  <button style={{...btnSecondary, padding:"4px 10px", fontSize:"12px"}} onClick={() => accrueSubscription(s.id)} title="Devengar">📄</button>
                  {s.status === "active" && (
                    <button style={{ ...btnSecondary, padding: "4px 10px", color: "#e74c3c" }} onClick={() => cancelSub(s.id)}>✕</button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "cycles" && (
        <div style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h2 style={{ margin: 0, fontSize: "16px" }}>Ciclos de facturación por cliente</h2>
            <div style={{display:"flex", gap:"8px", alignItems:"center"}}>
              <button style={{...btnPrimary, padding:"5px 14px", fontSize:"13px"}} onClick={() => accrueBatch()}>📄 Devengar todo</button>
              <button style={{...btnSecondary, padding:"5px 14px", fontSize:"13px"}} onClick={() => batchGenerateCycles()}>🔄 Generar ciclos</button>
              <span style={{ fontSize: "12px", color: "#666" }}>{cycleGroups.length} clientes · {billingCycles.length} ciclos</span>
            </div>
          </div>
          {cycleGroups.length === 0 ? (
            <p style={{ color: "#999" }}>No hay ciclos de facturación.</p>
          ) : viewMode === "list" ? (
            <div>
              {billingCycles.map((bc: BillingCycle) => (
                <div key={bc.id} style={{display:"grid", gridTemplateColumns:"1.2fr 1fr 120px 95px 150px", gap:"10px", alignItems:"center", padding:"10px 0", borderBottom:"1px solid #f1f1f1"}}>
                  <div>
                    <div style={{fontWeight:700, cursor:"pointer"}} onClick={() => router.push("/contactos/" + bc.contact_id)}>{bc.contact_name || "Sin cliente"}</div>
                    <div style={{fontSize:"11px", color:"#777"}}>{bc.contact_phone || ""}</div>
                  </div>
                  <div>
                    <div style={{fontWeight:600, fontSize:"13px"}}>{bc.plan_name}{bc.service_name ? " · " + bc.service_name : ""}</div>
                    <div style={{fontSize:"11px", color:"#777"}}>Período {new Date(bc.period_start).toLocaleDateString("es-AR")} → {new Date(bc.period_end).toLocaleDateString("es-AR")}</div>
                  </div>
                  <div style={{fontWeight:800}}>${Number(bc.amount).toLocaleString("es-AR", {minimumFractionDigits:2})}</div>
                  <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "6px", background: (STATUS_COLORS[bc.status] || "#999") + "22", color: STATUS_COLORS[bc.status] || "#999", textAlign:"center", fontWeight:700 }}>{BILLING_STATUS_LABELS[bc.status] || bc.status}</span>
                  {bc.status !== "paid" && bc.status !== "cancelled" ? <div style={{display:"flex", gap:"4px", justifyContent:"flex-end"}}>{(bc.status === "pending" && !bc.order_id) && <button style={{...btnPrimary, padding:"4px 8px", fontSize:"11px", opacity:0.85}} onClick={() => accrueSingleCycle(bc.id)}>📄 Devengar</button>}<button style={{...btnPrimary, padding:"4px 10px", fontSize:"12px"}} onClick={() => openPay(bc)}>Cobrar</button></div> : <span style={{color:"#27ae60", fontSize:"12px", fontWeight:700, textAlign:"right"}}>Pagado</span>}
                </div>
              ))}
            </div>
          ) : (
            <div style={{display:"flex", flexDirection:"column", gap:"10px"}}>
              {cycleGroups.map((group: any) => {
                const expanded = expandedClientId === group.contact_id;
                const activeSubs = activeSubsForContact(group.contact_id);
                return (
                  <div key={group.contact_id} style={{border:"1px solid #f0f0f0", borderRadius:"14px", padding:"16px"}}>
                    <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", gap:"12px"}}>
                      <div>
                        <div style={{fontWeight:800, cursor:"pointer", color:"#1a1a2e"}} onClick={() => router.push("/contactos/" + group.contact_id)}>{group.contact_name || "Sin cliente"}</div>
                        <div style={{fontSize:"12px", color:"#666"}}>{activeSubs.length} suscripción(es) activa(s) · {group.cycles.length} ciclo(s)</div>
                      </div>
                      <div style={{display:"flex", alignItems:"center", gap:"12px"}}>
                      <button style={{...btnSecondary, padding:"4px 10px", fontSize:"12px"}} onClick={() => accrueByContact(group.contact_id)}>📄 Devengar</button>
                      <div style={{textAlign:"right"}}>
                        <div style={{fontSize:"18px", fontWeight:800, color: group.pending_total > 0 ? "#f39c12" : "#27ae60"}}>${Number(group.pending_total).toLocaleString("es-AR", {minimumFractionDigits:2})}</div>
                        <div style={{fontSize:"11px", color: group.overdue_total > 0 ? "#e74c3c" : "#999"}}>{group.overdue_total > 0 ? "Vencido $" + Number(group.overdue_total).toLocaleString("es-AR") : "Sin vencido"}</div>
                      </div>
                      <button style={{...btnSecondary, padding:"4px 10px", fontSize:"12px"}} onClick={() => setExpandedClientId(expanded ? null : group.contact_id)}>{expanded ? "▲" : "▼"}</button>
                    </div>
                    </div>

                    {expanded && (
                      <div style={{marginTop:"14px", borderTop:"1px solid #f2f2f2", paddingTop:"12px"}}>
                        <div style={{fontSize:"13px", fontWeight:700, marginBottom:"8px"}}>Suscripciones activas</div>
                        {activeSubs.length === 0 ? <div style={{fontSize:"12px", color:"#999", marginBottom:"10px"}}>No hay suscripciones activas.</div> : (
                          <div style={{display:"flex", flexWrap:"wrap", gap:"6px", marginBottom:"12px"}}>
                            {activeSubs.map(s => <span key={s.id} style={{fontSize:"12px", background:"#f3f1ff", color:"#6c63ff", padding:"4px 8px", borderRadius:"999px", fontWeight:700}}>{s.plan_name} · ${Number(s.billing_amount).toLocaleString("es-AR")}</span>)}
                          </div>
                        )}

                        <div style={{fontSize:"13px", fontWeight:700, marginBottom:"8px"}}>Ciclos</div>
                        <div style={{display:"flex", flexDirection:"column", gap:"6px"}}>
                          {group.cycles.map((bc: BillingCycle) => (
                            <div key={bc.id} style={{display:"grid", gridTemplateColumns:"1fr 110px 95px 90px", gap:"8px", alignItems:"center", padding:"8px 0", borderBottom:"1px solid #f7f7f7"}}>
                              <div>
                                <div style={{fontWeight:600, fontSize:"13px"}}>{bc.plan_name}{bc.service_name ? " · " + bc.service_name : ""}</div>
                                <div style={{fontSize:"11px", color:"#777"}}>Período {new Date(bc.period_start).toLocaleDateString("es-AR")} → {new Date(bc.period_end).toLocaleDateString("es-AR")} · vence {bc.due_date ? new Date(bc.due_date).toLocaleDateString("es-AR") : "-"}</div>
                                {bc.order_number ? <div style={{fontSize:"11px", marginTop:"3px", color:"#6c63ff", fontWeight:600}}>🧾 NV: {bc.order_number} · ${Number(bc.order_total || bc.amount).toLocaleString("es-AR", {minimumFractionDigits:2})}</div> : null}
                              </div>
                              <div style={{fontWeight:800}}>${Number(bc.amount).toLocaleString("es-AR", {minimumFractionDigits:2})}</div>
                              <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "6px", background: (STATUS_COLORS[bc.status] || "#999") + "22", color: STATUS_COLORS[bc.status] || "#999", textAlign:"center", fontWeight:700 }}>{BILLING_STATUS_LABELS[bc.status] || bc.status}</span>
                              {bc.status !== "paid" && bc.status !== "cancelled" ? <div style={{display:"flex", gap:"4px"}}>{(bc.status === "pending" && !bc.order_id) && <button style={{...btnPrimary, padding:"4px 8px", fontSize:"11px", opacity:0.85}} onClick={() => accrueSingleCycle(bc.id)}>📄 Devengar</button>}<button style={{...btnPrimary, padding:"4px 10px", fontSize:"12px"}} onClick={() => openPay(bc)}>Cobrar</button></div> : <span style={{color:"#27ae60", fontSize:"12px", fontWeight:700}}>Pagado</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── PLAN MODAL ── */}
      {showPlanModal && (
        <div onClick={() => setShowPlanModal(false)} style={{position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", display:"flex", alignItems:"center", justifyContent:"center", padding:"20px", zIndex:1000}}>
          <div onClick={e => e.stopPropagation()} style={{background:"#fff", borderRadius:"18px", padding:"24px", width:"100%", maxWidth:"420px"}}>
            <h3 style={{margin:"0 0 16px", fontSize:"18px"}}>{editPlanId ? "Editar plan" : "Nuevo plan"}</h3>

            <div style={{fontSize:"13px", color:"#666", marginBottom:"6px"}}>Nombre *</div>
            <input value={planForm.name} onChange={e => setPlanForm(f => ({...f, name: e.target.value}))} style={inputStyle} placeholder="Ej: Plan Básico" />

            <div style={{fontSize:"13px", color:"#666", marginBottom:"6px"}}>Descripción</div>
            <textarea value={planForm.description} onChange={e => setPlanForm(f => ({...f, description: e.target.value}))} style={{...inputStyle, minHeight:"60px", resize:"vertical"}} placeholder="¿Qué incluye?" />

            <div style={{fontSize:"13px", color:"#666", marginBottom:"6px"}}>Ciclo de facturación</div>
            <select value={planForm.billing_cycle} onChange={e => setPlanForm(f => ({...f, billing_cycle: e.target.value}))} style={inputStyle}>
              {Object.entries(CYCLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>

            <div style={{fontSize:"13px", color:"#666", marginBottom:"6px"}}>Monto *</div>
            <input type="number" value={planForm.amount} min="0" step="0.01" onChange={e => setPlanForm(f => ({...f, amount: e.target.value}))} style={inputStyle} />

            <label style={{display:"flex", alignItems:"center", gap:"8px", fontSize:"13px", marginBottom:"8px"}}>
              <input type="checkbox" checked={planForm.requires_contract} onChange={e => setPlanForm(f => ({...f, requires_contract: e.target.checked}))} />
              Requiere contrato
            </label>

            <div style={{display:"flex", gap:"8px", justifyContent:"flex-end", marginTop:"16px"}}>
              <button onClick={() => setShowPlanModal(false)} style={btnSecondary}>Cancelar</button>
              <button onClick={savePlan} disabled={!planForm.name || !planForm.amount || saving} style={btnPrimary}>
                {saving ? "..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── SUBSCRIPTION MODAL ── */}
      {showSubModal && (
        <div onClick={() => setShowSubModal(false)} style={{position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", display:"flex", alignItems:"center", justifyContent:"center", padding:"20px", zIndex:1000}}>
          <div onClick={e => e.stopPropagation()} style={{background:"#fff", borderRadius:"18px", padding:"24px", width:"100%", maxWidth:"420px"}}>
            <h3 style={{margin:"0 0 16px", fontSize:"18px"}}>{editSubId ? "Editar suscripción" : "Nueva suscripción"}</h3>

            {!editSubId && (
              <>
                <div style={{fontSize:"13px", color:"#666", marginBottom:"6px"}}>Contacto *</div>
                <select value={subForm.contact_id} onChange={e => setSubForm(f => ({...f, contact_id: e.target.value}))} style={inputStyle}>
                  <option value="">Seleccionar...</option>
                  {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </>
            )}

            <div style={{fontSize:"13px", color:"#666", marginBottom:"6px"}}>Plan *</div>
            <select value={subForm.plan_id} onChange={e => setSubForm(f => ({...f, plan_id: e.target.value}))} style={inputStyle}>
              <option value="">Seleccionar...</option>
              {plans.filter(p => p.is_active).map(p => (
                <option key={p.id} value={p.id}>{p.name} - ${Number(p.amount).toLocaleString("es-AR", {minimumFractionDigits:2})} ({CYCLE_LABELS[p.billing_cycle]})</option>
              ))}
            </select>

            {!editSubId && (
              <>
                <div style={{fontSize:"13px", color:"#666", marginBottom:"6px"}}>Fecha de inicio</div>
                <input type="date" value={subForm.start_date} onChange={e => setSubForm(f => ({...f, start_date: e.target.value}))} style={inputStyle} />

                <div style={{fontSize:"13px", color:"#666", marginBottom:"6px"}}>Monto (opcional, usa el del plan por defecto)</div>
                <input type="number" value={subForm.billing_amount} min="0" step="0.01" onChange={e => setSubForm(f => ({...f, billing_amount: e.target.value}))} style={inputStyle} />
              </>
            )}

            <div style={{fontSize:"13px", color:"#666", marginBottom:"6px"}}>Notas</div>
            <textarea value={subForm.notes} onChange={e => setSubForm(f => ({...f, notes: e.target.value}))} style={{...inputStyle, minHeight:"60px", resize:"vertical"}} />

            <div style={{display:"flex", gap:"8px", justifyContent:"flex-end", marginTop:"16px"}}>
              <button onClick={() => setShowSubModal(false)} style={btnSecondary}>Cancelar</button>
              <button onClick={saveSub} disabled={!subForm.contact_id || !subForm.plan_id || saving} style={btnPrimary}>
                {saving ? "..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showPayModal && payCycle && (
        <div onClick={() => setShowPayModal(false)} style={{position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", display:"flex", alignItems:"center", justifyContent:"center", padding:"20px", zIndex:1000}}>
          <div onClick={e => e.stopPropagation()} style={{background:"#fff", borderRadius:"18px", padding:"24px", width:"100%", maxWidth:"420px"}}>
            <h3 style={{margin:"0 0 8px", fontSize:"18px"}}>Cobrar ciclo</h3>
            <div style={{fontSize:"13px", color:"#666", marginBottom:"14px"}}>{payCycle.contact_name} · {payCycle.plan_name}</div>
            <div style={{fontSize:"13px", color:"#666", marginBottom:"6px"}}>Método de pago *</div>
            <select value={payForm.payment_method_id} onChange={e => setPayForm(f => ({...f, payment_method_id: e.target.value}))} style={inputStyle}>
              <option value="">Seleccionar...</option>
              {paymentMethods.map(pm => <option key={pm.id} value={pm.id}>{pm.name}</option>)}
            </select>
            <div style={{fontSize:"13px", color:"#666", marginBottom:"6px"}}>Monto *</div>
            <input type="number" value={payForm.amount} min="0" step="0.01" onChange={e => setPayForm(f => ({...f, amount: e.target.value}))} style={inputStyle} />
            <div style={{fontSize:"13px", color:"#666", marginBottom:"6px"}}>Fecha de pago</div>
            <input type="date" value={payForm.paid_at} onChange={e => setPayForm(f => ({...f, paid_at: e.target.value}))} style={inputStyle} />
            <div style={{display:"flex", gap:"8px", justifyContent:"flex-end", marginTop:"16px"}}>
              <button onClick={() => setShowPayModal(false)} style={btnSecondary}>Cancelar</button>
              <button onClick={payBillingCycle} disabled={!payForm.payment_method_id || !payForm.amount || saving} style={btnPrimary}>{saving ? "..." : "Cobrar"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
