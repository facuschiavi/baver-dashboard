"use client";

import { useEffect, useState } from "react";
import { fetchJson, postJson, deleteJson } from "../../lib";
import { exportCashWorkbook } from "../../utils/exportCashWorkbook";
import { Card, PageTitle, Loading, Empty } from "../../components/shared/UI";

type CashMovement = { id: number; type: string; reason: string; amount: number; account_name: string; client_name: string; order_number: string; notes: string; created_at: string; };
type PaymentMethod = { id: number; name: string; requires_arqueo: boolean; generates_payment_link?: boolean; integration_provider?: string; integration_label?: string };
type Contact = { id: number; name: string; phone: string; };
type UnpaidNV = { id: number; contact_id: number; order_number: string; contact_name: string; phone: string; total: number; payment_paid: number; payment_pending: number; };
type ClientAdvance = { id: number; amount: number; used_amount: number; remaining: number; notes: string; created_at: string; };
type Stats = { total_in: number; total_out: number; move_count: number; nv_count: number; net: number; };
type Period = "today" | "week" | "month" | "custom";

export default function CobrosPage() {
  const [movements, setMovements] = useState<CashMovement[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [period, setPeriod] = useState<Period>("today");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [filterReason, setFilterReason] = useState<string>("all");
  const filtered = filterReason === "all" ? movements : movements.filter((m: any) => m.reason === filterReason);
  const filteredTotal = filtered.reduce((s: number, m: any) => s + Number(m.amount), 0);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMovForm, setShowMovForm] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [movForm, setMovForm] = useState({ financial_account_id: "", reason: "", order_id: "", client_id: "", amount: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const [paymentLink, setPaymentLink] = useState<string>("");
  const [hasOpenCashSession, setHasOpenCashSession] = useState(false);
  const [deepLinkHandled, setDeepLinkHandled] = useState(false);

  // NV selector state
  const [unpaidNVs, setUnpaidNVs] = useState<UnpaidNV[]>([]);
  const [nvSearch, setNvSearch] = useState("");
  const [showNvDropdown, setShowNvDropdown] = useState(false);
  const [selectedNv, setSelectedNv] = useState<UnpaidNV | null>(null);

  // Contact selector state (for Anticipo)
  const [contactSearch, setContactSearch] = useState("");
  const [showContactDropdown, setShowContactDropdown] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

  // Advance prompt state (when selecting NV in cobros)
  const [cobroAdvances, setCobroAdvances] = useState<ClientAdvance[]>([]);
  const [advanceApplied, setAdvanceApplied] = useState(false);
  const [advanceApplying, setAdvanceApplying] = useState(false);

  function load() {
    setLoading(true);
    Promise.all([
      fetchJson<CashMovement[]>("/cash-movements?type=in&period=" + period + (period === "custom" && customFrom && customTo ? "&from=" + customFrom + "&to=" + customTo : "")),
      fetchJson<Stats>("/cash/stats?period=" + period + (period === "custom" && customFrom && customTo ? "&from=" + customFrom + "&to=" + customTo : "")),
      fetchJson<PaymentMethod[]>("/payment-methods"),
      fetchJson<Contact[]>("/contacts"),
      fetchJson<any>("/cash-sessions/current").catch(() => null),
    ]).then(([mov, st, pm, cc, sess]) => {
      setMovements(mov);
      setStats(st);
      setPaymentMethods(pm);
      setContacts(cc);
      setHasOpenCashSession(Boolean(sess));

      if (!deepLinkHandled && typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        const orderId = params.get("order_id");
        if (orderId) {
          setDeepLinkHandled(true);
          if (!Boolean(sess)) {
            alert("Necesitás abrir una caja antes de cobrar esta NV");
          } else {
            fetchJson<UnpaidNV[]>("/orders/unpaid").then(list => {
              setUnpaidNVs(list);
              const nv = list.find(x => String(x.id) === String(orderId));
              if (!nv) {
                alert("La NV no tiene saldo pendiente o no se encontró");
                return;
              }
              setSelectedNv(nv);
              setNvSearch("");
              setShowNvDropdown(false);
              setMovForm({
                financial_account_id: "",
                reason: "nv_payment",
                order_id: String(nv.id),
                client_id: String(nv.contact_id || ""),
                amount: String(nv.payment_pending),
                notes: "",
              });
              // Also check for advances
              if (nv.contact_id) {
                fetchJson<ClientAdvance[]>("/advances?entity_type=client&entity_id=" + nv.contact_id)
                  .then(advs => setCobroAdvances(advs.filter(a => Number(a.remaining) > 0)))
                  .catch(console.error);
              }
              setShowMovForm(true);
              window.history.replaceState(null, "", "/cobros");
            }).catch(console.error);
          }
        }
      }
    }).catch(console.error).finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [refreshKey, period, customFrom, customTo]);


  async function handleExportExcel() {
    await exportCashWorkbook({
      source: "cobros",
      currentRows: movements,
      period,
      customFrom,
      customTo,
    });
  }

  function setMov(field: string, value: string) {
    setPaymentLink("");
    setMovForm(prev => ({ ...prev, [field]: value }));
    if (field === "client_id") {
      // Reload unpaid NVs filtered by client
      if (value) {
        fetchJson<UnpaidNV[]>("/orders/unpaid?contact_id=" + value).then(setUnpaidNVs).catch(console.error);
      } else {
        setUnpaidNVs([]);
      }
      setSelectedNv(null);
    }
  }

  // Load all unpaid NVs when NV payment reason is selected and no client filter
  useEffect(() => {
    if (movForm.reason === "nv_payment" && !movForm.client_id) {
      fetchJson<UnpaidNV[]>("/orders/unpaid").then(setUnpaidNVs).catch(console.error);
    }
  }, [movForm.reason]);

  // When NV is selected, auto-fill amount and check for advances
  function selectNv(nv: UnpaidNV) {
    setSelectedNv(nv);
    setMovForm(prev => ({ ...prev, order_id: String(nv.id), client_id: String(nv.contact_id || ""), amount: String(nv.payment_pending) }));
    setNvSearch("");
    setShowNvDropdown(false);
    setAdvanceApplied(false);
    // Check if this client has available advances
    if (nv.contact_id) {
      fetchJson<ClientAdvance[]>("/advances?entity_type=client&entity_id=" + nv.contact_id)
        .then(advs => setCobroAdvances(advs.filter(a => Number(a.remaining) > 0)))
        .catch(() => setCobroAdvances([]));
    } else {
      setCobroAdvances([]);
    }
  }

  async function handleApplyAdvanceToNV() {
    if (!selectedNv || cobroAdvances.length === 0) return;
    const adv = cobroAdvances[0]; // use the first available advance
    const useAmt = Math.min(Number(adv.remaining), Number(selectedNv.payment_pending));
    if (useAmt <= 0) return;
    setAdvanceApplying(true);
    try {
      await postJson("/advances/" + adv.id + "/use", {
        amount: useAmt,
        order_id: selectedNv.id,
      });
      setAdvanceApplied(true);
      // Update the form amount to the remaining
      const remaining = Number(selectedNv.payment_pending) - useAmt;
      setMovForm(prev => ({ ...prev, amount: String(Math.max(0, remaining)) }));
      setCobroAdvances([]);
    } catch (e: any) {
      alert(e?.response?.data?.error || e?.message || "Error al aplicar el anticipo");
    } finally {
      setAdvanceApplying(false);
    }
  }

  // When contact is selected for advance
  function selectContact(contact: Contact) {
    setSelectedContact(contact);
    setMovForm(prev => ({ ...prev, client_id: String(contact.id) }));
    setContactSearch("");
    setShowContactDropdown(false);
    // Also reload NVs filtered by this contact
    fetchJson<UnpaidNV[]>("/orders/unpaid?contact_id=" + contact.id).then(setUnpaidNVs).catch(console.error);
  }

  const filteredNVs = unpaidNVs.filter(nv =>
    !nvSearch || nv.order_number?.toLowerCase().includes(nvSearch.toLowerCase()) ||
    nv.contact_name?.toLowerCase().includes(nvSearch.toLowerCase())
  );

  const filteredContacts = contacts.filter(c =>
    !contactSearch || c.name?.toLowerCase().includes(contactSearch.toLowerCase()) ||
    c.phone?.includes(contactSearch)
  );

  const selectedPaymentMethod = paymentMethods.find(pm => String(pm.id) === String(movForm.financial_account_id));
  const usesPaymentLink = Boolean(selectedPaymentMethod?.generates_payment_link && selectedPaymentMethod?.integration_provider === "mercadopago");

  async function handleGeneratePaymentLink() {
    const amount = Number(movForm.amount);
    if (!movForm.reason) { alert("Seleccioná un motivo"); return; }
    if (!movForm.financial_account_id || !amount) { alert("Completá cuenta y monto"); return; }
    if (amount <= 0) { alert("El monto debe ser mayor a cero"); return; }
    if (movForm.reason === "advance" && !movForm.client_id) { alert("Seleccioná un cliente para el anticipo"); return; }
    if (movForm.reason === "nv_payment" && !movForm.order_id) { alert("Seleccioná una NV / orden"); return; }
    setSaving(true);
    try {
      const result = await postJson<{ init_point?: string; sandbox_init_point?: string; error?: string }>("/integrations/mercadopago/preference", {
        order_id: movForm.order_id ? Number(movForm.order_id) : undefined,
        contact_id: movForm.client_id ? Number(movForm.client_id) : undefined,
        financial_account_id: Number(movForm.financial_account_id),
        reason: movForm.reason,
        amount,
        title: movForm.reason === "nv_payment"
          ? `Cobro ${selectedNv?.order_number || "NV"}`
          : movForm.reason === "advance"
            ? `Anticipo ${selectedContact?.name || "cliente"}`
            : "Cobro online",
        description: movForm.notes || undefined,
        notes: movForm.notes || undefined,
      });
      const link = result.init_point || result.sandbox_init_point || "";
      if (!link) throw new Error(result.error || "Mercado Pago no devolvió link");
      setPaymentLink(link);
      // Copy with fallback
      try {
        const ta = document.createElement("textarea");
        ta.value = link;
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      } catch (e2) { console.warn("Clipboard fallback failed", e2); }
    } catch (e: any) { alert(e?.body?.error || e?.message || "Error generando link de pago"); }
    finally { setSaving(false); }
  }

  async function handleRegisterMovement() {
    const amount = Number(movForm.amount);
    if (!movForm.reason) { alert("Seleccioná un motivo"); return; }
    if (!movForm.financial_account_id || !amount) { alert("Completá cuenta y monto"); return; }
    if (amount < 0) { alert("El monto no puede ser negativo"); return; }
    if (movForm.reason === "advance" && !movForm.client_id) { alert("Seleccioná un cliente para el anticipo"); setSaving(false); return; }
    if (movForm.reason === "nv_payment" && !movForm.order_id) { alert("Seleccioná una NV / orden"); setSaving(false); return; }
    setSaving(true);
    try {
      if (movForm.reason === "advance") {
        // 1. Create client advance
        if (!movForm.client_id) { alert("Seleccioná un cliente"); setSaving(false); return; }
        const advance = await postJson<{ id: number }>("/client-advances", {
          client_id: Number(movForm.client_id),
          amount: amount,
          notes: movForm.notes || `Anticipo - NV: ${selectedNv?.order_number || 'N/A'}`,
        });
        // 2. Create cash movement linked to the advance
        await postJson("/cash-movements", {
          financial_account_id: Number(movForm.financial_account_id),
          type: "in",
          reason: "advance",
          client_id: Number(movForm.client_id),
          amount: amount,
          notes: `Anticipo #${advance.id}` + (movForm.notes ? " - " + movForm.notes : ""),
        });
      } else if (movForm.reason === "nv_payment") {
        // Create cash movement for NV
        await postJson("/cash-movements", {
          session_id: null,
          financial_account_id: Number(movForm.financial_account_id),
          type: "in",
          reason: "nv_payment",
          order_id: movForm.order_id ? Number(movForm.order_id) : undefined,
          client_id: movForm.client_id ? Number(movForm.client_id) : undefined,
          amount: amount,
          notes: movForm.notes || undefined,
        });
      } else {
        // Other income
        await postJson("/cash-movements", {
          session_id: null,
          financial_account_id: Number(movForm.financial_account_id),
          type: "in",
          reason: "other_in",
          client_id: movForm.client_id ? Number(movForm.client_id) : undefined,
          amount: amount,
          notes: movForm.notes || undefined,
        });
      }
      setShowMovForm(false);
      setMovForm({ financial_account_id: "", reason: "", order_id: "", client_id: "", amount: "", notes: "" });
      setSelectedNv(null);
      setSelectedContact(null);
      setNvSearch("");
      setContactSearch("");
      setCobroAdvances([]);
      setAdvanceApplied(false);
      setRefreshKey(k => k + 1);
    } catch (e: any) { alert(e?.message || e?.response?.data?.error || "Error"); }
    finally { setSaving(false); }
  }

  function openMovForm() {
    if (!hasOpenCashSession) {
      alert("Necesitás abrir una caja antes de registrar un cobro");
      return;
    }
    setSelectedNv(null);
    setSelectedContact(null);
    setNvSearch("");
    setContactSearch("");
    setCobroAdvances([]);
    setAdvanceApplied(false);
    setMovForm({ financial_account_id: "", reason: "", order_id: "", client_id: "", amount: "", notes: "" });
    setUnpaidNVs([]);
    setShowMovForm(true);
    fetchJson<UnpaidNV[]>("/orders/unpaid").then(setUnpaidNVs).catch(console.error);
  }

  async function handleDeleteMovement(id: number) {
    if (!confirm("Anular este cobro?")) return;
    try { await deleteJson("/cash-movements/" + id); setRefreshKey(k => k + 1); }
    catch (e: any) { alert(e?.response?.data?.error || "Error"); }
  }

  const totalAdvanceAvailable = cobroAdvances.reduce((s, a) => s + Number(a.remaining || 0), 0);

  return (
    <div>
      <PageTitle>💰 Cobros</PageTitle>
      <p style={{ fontSize: "13px", color: "#888", margin: "2px 0 16px" }}>Registrá los cobros de ventas. Usá la barra de arriba para abrir/cerrar caja.</p>

      {stats && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "10px", marginBottom: "16px" }}>
          <div style={{ background: "#27ae60", borderRadius: "12px", padding: "14px", color: "#fff" }}>
            <div style={{ fontSize: "11px", color: "#aaa", marginBottom: "4px" }}>Total cobrado (ingresos)</div>
            <div style={{ fontSize: "22px", fontWeight: 800 }}>${stats.total_in.toLocaleString("es-AR")}</div>
          </div>
          <div style={{ background: "#fff", borderRadius: "12px", padding: "14px", border: "1px solid #eee" }}>
            <div style={{ fontSize: "11px", color: "#888", marginBottom: "4px" }}>Neto del periodo</div>
            <div style={{ fontSize: "22px", fontWeight: 800, color: stats.net >= 0 ? "#27ae60" : "#e74c3c" }}>${stats.net.toLocaleString("es-AR")}</div>
          </div>
          <div style={{ background: "#fff", borderRadius: "12px", padding: "14px", border: "1px solid #eee" }}>
            <div style={{ fontSize: "11px", color: "#888", marginBottom: "4px" }}>Movimientos</div>
            <div style={{ fontSize: "22px", fontWeight: 800 }}>{stats.move_count}</div>
            <div style={{ fontSize: "11px", color: "#888", marginTop: "2px" }}>{stats.nv_count} NV cobradas</div>
          </div>
        </div>
      )}

      {/* Controls */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px", flexWrap: "wrap" }}>
        {/* Period filter */}
        <div style={{ display: "flex", gap: "4px", background: "#f0f0f0", padding: "3px", borderRadius: "8px" }}>
          {(["today", "week", "month", "custom"] as Period[]).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              style={{ padding: "5px 12px", borderRadius: "6px", border: "none", background: period === p ? "#1a1a2e" : "transparent", color: period === p ? "#fff" : "#666", cursor: "pointer", fontSize: "12px", fontWeight: 700 }}>
              {p === "today" ? "Hoy" : p === "week" ? "Semana" : p === "custom" ? "Personalizado" : "Mes"}
            </button>
          ))}
        </div>

        {period === "custom" && (
          <div style={{ display: "flex", gap: "8px", alignItems: "center", marginTop: "6px" }}>
            <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
              style={{ padding: "5px 10px", borderRadius: "6px", border: "1px solid #ddd", fontSize: "12px" }} />
            <span style={{ fontSize: "12px", color: "#888" }}>hasta</span>
            <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
              style={{ padding: "5px 10px", borderRadius: "6px", border: "1px solid #ddd", fontSize: "12px" }} />
            {(customFrom || customTo) && (
              <button onClick={() => { setCustomFrom(""); setCustomTo(""); }}
                style={{ padding: "5px 10px", borderRadius: "6px", border: "1px solid #ddd", background: "#fff", fontSize: "12px", cursor: "pointer" }}>
                Limpiar
              </button>
            )}
            <button onClick={() => setRefreshKey(k => k + 1)}
              style={{ padding: "5px 12px", borderRadius: "6px", border: "none", background: "#27ae60", color: "#fff", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}>Aplicar</button>
          </div>
        )}
      </div>

      {/* Reason filter */}
      <div style={{ display: "flex", gap: "4px", background: "#f0f0f0", padding: "3px", borderRadius: "8px", marginBottom: "12px", width: "fit-content" }}>
        {(["all", "nv_payment", "advance", "other_in"] as const).map(r => (
          <button key={r} onClick={() => setFilterReason(r)} style={{ padding: "5px 12px", borderRadius: "6px", border: "none", background: filterReason === r ? "#6c63ff" : "transparent", color: filterReason === r ? "#fff" : "#666", cursor: "pointer", fontSize: "12px", fontWeight: 700 }}>
            {r === "all" ? "Todos" : r === "nv_payment" ? "NV" : r === "advance" ? "Anticipo" : "Otro"}
          </button>
        ))}
        <span style={{ padding: "5px 12px", borderRadius: "6px", background: "#27ae60", color: "#fff", fontSize: "12px", fontWeight: 700 }}>
          ${filteredTotal.toLocaleString("es-AR")}
        </span>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", gap: "12px", flexWrap: "wrap" }}>
        {!hasOpenCashSession && <div style={{ fontSize: "12px", color: "#e67e22", fontWeight: 700 }}>Abrí una caja para registrar cobros</div>}
        <button onClick={openMovForm} disabled={!hasOpenCashSession} title={!hasOpenCashSession ? "Necesitás abrir una caja primero" : ""} style={{ padding: "8px 16px", borderRadius: "8px", border: "none", background: hasOpenCashSession ? "#27ae60" : "#bfc6cd", color: "#fff", cursor: hasOpenCashSession ? "pointer" : "not-allowed", fontSize: "13px", fontWeight: 700 }}>💰 Registrar Cobro</button>
        <button onClick={handleExportExcel} style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid #ddd", background: "#fff", color: "#1a1a2e", cursor: "pointer", fontSize: "13px", fontWeight: 700 }}>📥 Excel</button>
      </div>

      {loading ? <Loading /> : filtered.length === 0 ? <Empty message="Sin cobros registrados" /> : (
        <div style={{ display: "grid", gap: "6px" }}>
          {filtered.map(m => (
            <Card key={m.id}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span style={{ fontSize: "20px" }}>📥</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontWeight: 700, fontSize: "14px", color: "#27ae60" }}>+${Number(m.amount).toLocaleString("es-AR")}</span>
                    <span style={{ fontSize: "12px", color: "#888" }}>{m.account_name}</span>
                    <span style={{ fontSize: "11px", background: "#f0f0f0", padding: "2px 6px", borderRadius: "4px", color: "#666" }}>
                      #{m.id}
                    </span>
                    <span style={{ fontSize: "11px", background: "#e8e8ff", padding: "2px 6px", borderRadius: "4px", color: "#6c63ff" }}>
                      {m.reason === "nv_payment" ? "NV " + (m.order_number || "") : m.reason === "advance" ? "Anticipo" : m.reason === "other_in" ? "Ingreso" : "Otro"}
                    </span>
                  </div>
                  <div style={{ fontSize: "11px", color: "#aaa" }}>{new Date(m.created_at).toLocaleString("es-AR")}{m.notes && " · " + m.notes}</div>
                </div>
                <button onClick={() => handleDeleteMovement(m.id)} style={{ background: "none", border: "none", color: "#e74c3c", cursor: "pointer", fontSize: "14px" }} title="Anular">🗑️</button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {showMovForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }} onClick={e => e.target === e.currentTarget && setShowMovForm(false)}>
          <div style={{ background: "#fff", borderRadius: "16px", padding: "24px", width: "100%", maxWidth: "460px" }}>
            <h2 style={{ margin: "0 0 16px", fontSize: "18px", fontWeight: 800 }}>💰 Registrar Cobro</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <label style={{ fontSize: "12px", fontWeight: 700, color: "#666" }}>Cuenta *</label>
                <select value={movForm.financial_account_id} onChange={e => setMov("financial_account_id", e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "13px" }}>
                  <option value="">Seleccionar cuenta</option>
                  {paymentMethods.map(pm => <option key={pm.id} value={pm.id}>{pm.name}{pm.generates_payment_link ? " 🔗 MP" : ""}{pm.requires_arqueo ? " (arqueo)" : ""}</option>)}
                </select>
                {usesPaymentLink && (
                  <div style={{ marginTop: "6px", padding: "8px 10px", borderRadius: "8px", background: "#e8f7ff", color: "#0077aa", fontSize: "12px", fontWeight: 700 }}>
                    Esta cuenta genera link de pago Mercado Pago. El cobro se registra automáticamente cuando MP aprueba el pago.
                  </div>
                )}
              </div>
              <div>
                <label style={{ fontSize: "12px", fontWeight: 700, color: "#666" }}>Motivo</label>
                <select value={movForm.reason} onChange={e => { setMov("reason", e.target.value); setSelectedNv(null); setSelectedContact(null); setCobroAdvances([]); setAdvanceApplied(false); setMovForm(prev => ({ ...prev, order_id: "", client_id: "", amount: "" })); }} style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "13px" }}>
                  <option value="">Seleccionar motivo...</option>
                  <option value="nv_payment">Cobro de NV</option>
                  <option value="advance">Anticipo de cliente</option>
                  <option value="other_in">Otro ingreso</option>
                </select>
              </div>

              {/* Cobro de NV - NV Selector */}
              {movForm.reason === "nv_payment" && (
                <>
                  <div>
                    <label style={{ fontSize: "12px", fontWeight: 700, color: "#666" }}>NV / Orden</label>
                    {selectedNv ? (
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 12px", background: "#f0fff4", borderRadius: "8px", border: "1px solid #27ae60" }}>
                        <span style={{ flex: 1, fontSize: "14px", fontWeight: 700 }}>
                          {selectedNv.order_number} · {selectedNv.contact_name} · <span style={{ color: "#f39c12" }}>${selectedNv.payment_pending.toLocaleString("es-AR")} pend.</span>
                        </span>
                        <button onClick={() => { setSelectedNv(null); setMovForm(prev => ({ ...prev, order_id: "", amount: "" })); setCobroAdvances([]); setAdvanceApplied(false); }} style={{ background: "none", border: "none", color: "#e74c3c", cursor: "pointer", fontSize: "13px" }}>✕</button>
                      </div>
                    ) : (
                      <div style={{ position: "relative" }}>
                        <div style={{ display: "flex", gap: "6px" }}>
                          <input value={nvSearch} onChange={e => { setNvSearch(e.target.value); setShowNvDropdown(true); }} onFocus={() => setShowNvDropdown(true)} placeholder="Buscar NV por número o cliente..." style={{ flex: 1, padding: "8px 12px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "13px" }} />
                        </div>
                        {showNvDropdown && (
                          <div style={{ position: "absolute", top: "100%", left: 0, right: 0, border: "1px solid #ddd", borderRadius: "8px", marginTop: "4px", maxHeight: "220px", overflowY: "auto", background: "#fff", zIndex: 10, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
                            {filteredNVs.length === 0 ? (
                              <div style={{ padding: "12px", fontSize: "12px", color: "#999", textAlign: "center" }}>Sin NV pendientes</div>
                            ) : filteredNVs.slice(0, 15).map(nv => (
                              <div key={nv.id} onClick={() => selectNv(nv)}
                                style={{ padding: "10px 14px", cursor: "pointer", fontSize: "13px", borderBottom: "1px solid #f0", display: "flex", justifyContent: "space-between" }}
                                onMouseEnter={e => (e.currentTarget.style.background = "#f5f5f5")}
                                onMouseLeave={e => (e.currentTarget.style.background = "none")}>
                                <span><b>{nv.order_number}</b> · {nv.contact_name}</span>
                                <span style={{ color: "#f39c12", fontWeight: 700 }}>${nv.payment_pending.toLocaleString("es-AR")} pend.</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Advance prompt - when NV has a client with available advance */}
                  {selectedNv && cobroAdvances.length > 0 && !advanceApplied && (
                    <div style={{ padding: "10px 14px", borderRadius: "10px", background: "#f0f4ff", border: "1px solid #6c63ff", display: "flex", alignItems: "center", gap: "10px" }}>
                      <span style={{ fontSize: "16px" }}>💳</span>
                      <div style={{ flex: 1, fontSize: "13px" }}>
                        <span style={{ fontWeight: 700 }}>{selectedNv.contact_name}</span> tiene <b style={{ color: "#27ae60" }}>${totalAdvanceAvailable.toLocaleString("es-AR")}</b> de anticipo disponible.
                        <br />
                        <span style={{ color: "#666", fontSize: "12px" }}>Podés aplicarlo a esta NV y registrar solo el saldo restante.</span>
                      </div>
                      <button onClick={handleApplyAdvanceToNV} disabled={advanceApplying}
                        style={{ padding: "7px 14px", borderRadius: "8px", border: "1px solid #6c63ff", background: "#6c63ff", color: "#fff", cursor: advanceApplying ? "not-allowed" : "pointer", fontSize: "12px", fontWeight: 700, whiteSpace: "nowrap", opacity: advanceApplying ? 0.7 : 1 }}>
                        {advanceApplying ? "Aplicando..." : "🧾 Aplicar anticipo"}
                      </button>
                    </div>
                  )}
                  {advanceApplied && (
                    <div style={{ padding: "10px 14px", borderRadius: "10px", background: "#f0fff4", border: "1px solid #27ae60", display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "16px" }}>✅</span>
                      <span style={{ fontSize: "13px" }}>Anticipo aplicado correctamente. El monto restante se cobra en efectivo.</span>
                    </div>
                  )}

                  {/* Optional: filter by client */}
                  <div>
                    <label style={{ fontSize: "12px", fontWeight: 700, color: "#666" }}>Filtrar por cliente (opcional)</label>
                    <select value={movForm.client_id} onChange={e => setMov("client_id", e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "13px" }}>
                      <option value="">Todos los clientes</option>
                      {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                </>
              )}

              {/* Anticipo de Cliente */}
              {movForm.reason === "advance" && (
                <>
                  <div>
                    <label style={{ fontSize: "12px", fontWeight: 700, color: "#666" }}>Cliente *</label>
                    {selectedContact ? (
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 12px", background: "#f0fff4", borderRadius: "8px", border: "1px solid #27ae60" }}>
                        <span style={{ flex: 1, fontSize: "14px", fontWeight: 700 }}>{selectedContact.name}</span>
                        {selectedContact.phone && <span style={{ fontSize: "12px", color: "#666" }}>{selectedContact.phone}</span>}
                        <button onClick={() => { setSelectedContact(null); setMovForm(prev => ({ ...prev, client_id: "" })); }} style={{ background: "none", border: "none", color: "#e74c3c", cursor: "pointer", fontSize: "13px" }}>✕</button>
                      </div>
                    ) : (
                      <div style={{ position: "relative" }}>
                        <div style={{ display: "flex", gap: "6px" }}>
                          <input value={contactSearch} onChange={e => { setContactSearch(e.target.value); setShowContactDropdown(true); }} onFocus={() => setShowContactDropdown(true)} placeholder="Buscar cliente..." style={{ flex: 1, padding: "8px 12px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "13px" }} />
                          <button onClick={() => setShowContactDropdown(!showContactDropdown)} style={{ padding: "8px 10px", borderRadius: "8px", border: "1px solid #ddd", background: "#fff", cursor: "pointer", fontSize: "14px" }}>🔍</button>
                        </div>
                        {showContactDropdown && (
                          <div style={{ position: "absolute", top: "100%", left: 0, right: 0, border: "1px solid #ddd", borderRadius: "8px", marginTop: "4px", maxHeight: "200px", overflowY: "auto", background: "#fff", zIndex: 10, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
                            {filteredContacts.length === 0 ? (
                              <div style={{ padding: "12px", fontSize: "12px", color: "#999", textAlign: "center" }}>Sin resultados</div>
                            ) : filteredContacts.slice(0, 15).map(c => (
                              <div key={c.id} onClick={() => selectContact(c)}
                                style={{ padding: "10px 14px", cursor: "pointer", fontSize: "13px", borderBottom: "1px solid #f0", display: "flex", justifyContent: "space-between" }}
                                onMouseEnter={e => (e.currentTarget.style.background = "#f5f5f5")}
                                onMouseLeave={e => (e.currentTarget.style.background = "none")}>
                                <span><b>{c.name}</b></span>
                                <span style={{ color: "#888" }}>{c.phone}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  {/* Show client's unpaid NVs for reference */}
                  {movForm.client_id && unpaidNVs.length > 0 && (
                    <div>
                      <label style={{ fontSize: "12px", fontWeight: 700, color: "#666" }}>NV del cliente (referencia)</label>
                      <div style={{ border: "1px solid #eee", borderRadius: "8px", maxHeight: "120px", overflowY: "auto" }}>
                        {unpaidNVs.map(nv => (
                          <div key={nv.id} style={{ padding: "8px 12px", borderBottom: "1px solid #f0", fontSize: "12px", display: "flex", justifyContent: "space-between" }}>
                            <span><b>{nv.order_number}</b></span>
                            <span style={{ color: "#f39c12" }}>${nv.payment_pending.toLocaleString("es-AR")} pend.</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              <div>
                <label style={{ fontSize: "12px", fontWeight: 700, color: "#666" }}>Monto *</label>
                <input type="number" value={movForm.amount} onChange={e => setMov("amount", e.target.value)} placeholder="0.00" min="0" style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "13px" }} />
              </div>
              <div>
                <label style={{ fontSize: "12px", fontWeight: 700, color: "#666" }}>Notas</label>
                <textarea value={movForm.notes} onChange={e => setMov("notes", e.target.value)} placeholder="Observaciones..." style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "13px", minHeight: "60px", resize: "vertical" }} />
              </div>
              {paymentLink && (
                <div style={{ padding: "10px 12px", borderRadius: "10px", background: "#f0fff4", border: "1px solid #27ae60", fontSize: "12px" }}>
                  <div style={{ fontWeight: 800, color: "#27ae60", marginBottom: "6px" }}>✅ Link generado y copiado</div>
                  <a href={paymentLink} target="_blank" rel="noreferrer" style={{ color: "#0077cc", wordBreak: "break-all" }}>{paymentLink}</a>
                </div>
              )}
            </div>
            <div style={{ display: "flex", gap: "8px", marginTop: "16px" }}>
              <button onClick={() => setShowMovForm(false)} style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "1px solid #ddd", background: "#fff", cursor: "pointer" }}>Cancelar</button>
              {usesPaymentLink ? (
                <button onClick={handleGeneratePaymentLink} disabled={saving} style={{ flex: 2, padding: "10px", borderRadius: "8px", border: "none", background: "#009ee3", color: "#fff", cursor: saving ? "not-allowed" : "pointer", fontWeight: 700, opacity: saving ? 0.7 : 1, fontSize: "14px" }}>{saving ? "Generando..." : "🔗 Generar link MP"}</button>
              ) : (
                <button onClick={handleRegisterMovement} disabled={saving} style={{ flex: 2, padding: "10px", borderRadius: "8px", border: "none", background: "#27ae60", color: "#fff", cursor: saving ? "not-allowed" : "pointer", fontWeight: 700, opacity: saving ? 0.7 : 1, fontSize: "14px" }}>{saving ? "Registrando..." : "💰 Registrar"}</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
