"use client";

import { useEffect, useState } from "react";
import { fetchJson, postJson, deleteJson } from "../../lib";
import { exportCashWorkbook } from "../../utils/exportCashWorkbook";
import { Card, PageTitle, Loading, Empty } from "../../components/shared/UI";

type CashMovement = { id: number; type: string; reason: string; amount: number; account_name: string; supplier_name?: string; provider_name?: string; order_number?: string; purchase_order_id?: number; payment_status_name?: string; payment_status_color?: string; notes?: string; created_at: string; };
type PaymentMethod = { id: number; name: string; requires_arqueo: boolean };
type Supplier = { id: number; name: string; phone: string; whatsapp: string; };
type UnpaidNP = { id: number; order_number: string; provider_name: string; total: number; payment_paid: number; payment_pending: number; };
type Stats = { total_in: number; total_out: number; move_count: number; nv_count: number; net: number; };
type Period = "today" | "week" | "month" | "custom";

export default function PagosPage() {
  const [movements, setMovements] = useState<CashMovement[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [period, setPeriod] = useState<Period>("today");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMovForm, setShowMovForm] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [movForm, setMovForm] = useState({ financial_account_id: "", reason: "", purchase_order_id: "", supplier_id: "", amount: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const [hasOpenCashSession, setHasOpenCashSession] = useState(false);
  const [deepLinkHandled, setDeepLinkHandled] = useState(false);

  // NP selector state
  const [unpaidNPs, setUnpaidNPs] = useState<UnpaidNP[]>([]);
  const [npSearch, setNpSearch] = useState("");
  const [showNpDropdown, setShowNpDropdown] = useState(false);
  const [selectedNp, setSelectedNp] = useState<UnpaidNP | null>(null);

  // Supplier selector state (for Anticipo)
  const [supSearch, setSupSearch] = useState("");
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

  function load() {
    setLoading(true);
    Promise.all([
      fetchJson<CashMovement[]>("/payment-movements?period=" + period),
      fetchJson<Stats>("/payment/stats?period=" + period + (period === "custom" && customFrom && customTo ? "&from=" + customFrom + "&to=" + customTo : "")),
      fetchJson<PaymentMethod[]>("/payment-methods"),
      fetchJson<Supplier[]>("/providers"),
      fetchJson<any>("/cash-sessions/current").catch(() => null),
    ]).then(([mov, st, pm, ss, sess]) => {
      setMovements(mov);
      setStats(st);
      setPaymentMethods(pm);
      setSuppliers(ss);
      setHasOpenCashSession(Boolean(sess));

      if (!deepLinkHandled && typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        const purchaseOrderId = params.get("purchase_order_id");
        if (purchaseOrderId) {
          setDeepLinkHandled(true);
          if (!Boolean(sess)) {
            alert("Necesitás abrir una caja antes de pagar esta compra");
          } else {
            fetchJson<UnpaidNP[]>("/purchase-orders/unpaid").then(list => {
              setUnpaidNPs(list);
              const np = list.find(x => String(x.id) === String(purchaseOrderId));
              if (!np) {
                alert("La compra no tiene saldo pendiente o no se encontró");
                return;
              }
              setSelectedNp(np);
              setNpSearch("");
              setShowNpDropdown(false);
              setMovForm({
                financial_account_id: "",
                reason: "np_payment",
                purchase_order_id: String(np.id),
                supplier_id: "",
                amount: String(np.payment_pending),
                notes: "",
              });
              setShowMovForm(true);
              window.history.replaceState(null, "", "/baver/pagos");
            }).catch(console.error);
          }
        }
      }
    }).catch(console.error).finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [refreshKey, period, customFrom, customTo]);


  async function handleExportExcel() {
    await exportCashWorkbook({
      source: "pagos",
      currentRows: movements,
      period,
      customFrom,
      customTo,
    });
  }

  function setMov(field: string, value: string) {
    setMovForm(prev => ({ ...prev, [field]: value }));
  }

  function selectNp(np: UnpaidNP) {
    setSelectedNp(np);
    setMovForm(prev => ({ ...prev, purchase_order_id: String(np.id), amount: String(np.payment_pending) }));
    setNpSearch("");
    setShowNpDropdown(false);
  }

  function selectSupplier(supplier: Supplier) {
    setSelectedSupplier(supplier);
    setMovForm(prev => ({ ...prev, supplier_id: String(supplier.id) }));
    setSupSearch("");
    setShowSupplierDropdown(false);
  }

  const filteredNPs = unpaidNPs.filter(np =>
    !npSearch || np.order_number?.toLowerCase().includes(npSearch.toLowerCase()) ||
    (np.provider_name || "").toLowerCase().includes(npSearch.toLowerCase())
  );

  const filteredSuppliers = suppliers.filter(s =>
    !supSearch || s.name?.toLowerCase().includes(supSearch.toLowerCase()) ||
    (s.phone || "").includes(supSearch)
  );

  async function handleRegisterMovement() {
    const amount = Number(movForm.amount);
    if (!movForm.reason) { alert("Seleccioná un motivo"); return; }
    if (!movForm.financial_account_id || !amount) { alert("Completá cuenta y monto"); return; }
    if (amount < 0) { alert("El monto no puede ser negativo"); return; }
    if (movForm.reason === "np_payment" && !movForm.purchase_order_id) { alert("Seleccioná una NP"); setSaving(false); return; }
    if (movForm.reason === "advance" && !movForm.supplier_id) { alert("Seleccioná un proveedor"); setSaving(false); return; }
    setSaving(true);
    try {
      // Create cash movement
      await postJson("/cash-movements", {
        session_id: null,
        financial_account_id: Number(movForm.financial_account_id),
        type: "out",
        reason: movForm.reason || "other_out",
        purchase_order_id: movForm.purchase_order_id ? Number(movForm.purchase_order_id) : undefined,
        supplier_id: movForm.supplier_id ? Number(movForm.supplier_id) : undefined,
        amount: amount,
        notes: movForm.notes || undefined,
      });

      // If advance to supplier, also create advance record
      if (movForm.reason === "advance" && movForm.supplier_id) {
        await postJson("/advances", {
          entity_type: "provider",
          entity_id: Number(movForm.supplier_id),
          amount: amount,
          notes: movForm.notes || undefined,
        });
      }
      setShowMovForm(false);
      setMovForm({ financial_account_id: "", reason: "np_payment", purchase_order_id: "", supplier_id: "", amount: "", notes: "" });
      setSelectedNp(null);
      setSelectedSupplier(null);
      setNpSearch("");
      setSupSearch("");
      setRefreshKey(k => k + 1);
    } catch (e: any) { alert(e?.message || e?.response?.data?.error || "Error"); }
    finally { setSaving(false); }
  }

  function loadUnpaidNPs() {
    fetchJson<UnpaidNP[]>("/purchase-orders/unpaid").then(setUnpaidNPs).catch(console.error);
  }

  function openMovForm() {
    if (!hasOpenCashSession) {
      alert("Necesitás abrir una caja antes de registrar un pago");
      return;
    }
    setSelectedNp(null);
    setSelectedSupplier(null);
    setNpSearch("");
    setSupSearch("");
    setMovForm({ financial_account_id: "", reason: "", purchase_order_id: "", supplier_id: "", amount: "", notes: "" });
    setUnpaidNPs([]);
    setShowMovForm(true);
    loadUnpaidNPs();
  }

  async function handleDeleteMovement(id: number) {
    if (!confirm("Anular este pago?")) return;
    try { await deleteJson("/cash-movements/" + id); setRefreshKey(k => k + 1); }
    catch (e: any) { alert(e?.response?.data?.error || "Error"); }
  }

  return (
    <div>
      <PageTitle>💸 Pagos</PageTitle>
      <p style={{ fontSize: "13px", color: "#888", margin: "2px 0 16px" }}>Registrá los pagos a proveedores. Usá la barra de arriba para abrir/cerrar caja.</p>

      {stats && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "10px", marginBottom: "16px" }}>
          <div style={{ background: "#e74c3c", borderRadius: "12px", padding: "14px", color: "#fff" }}>
            <div style={{ fontSize: "11px", color: "#aaa", marginBottom: "4px" }}>Total pagado (egresos)</div>
            <div style={{ fontSize: "22px", fontWeight: 800 }}>${stats.total_out.toLocaleString("es-AR")}</div>
          </div>
          <div style={{ background: "#fff", borderRadius: "12px", padding: "14px", border: "1px solid #eee" }}>
            <div style={{ fontSize: "11px", color: "#888", marginBottom: "4px" }}>Neto del periodo</div>
            <div style={{ fontSize: "22px", fontWeight: 800, color: stats.net >= 0 ? "#27ae60" : "#e74c3c" }}>${stats.net.toLocaleString("es-AR")}</div>
          </div>
          <div style={{ background: "#fff", borderRadius: "12px", padding: "14px", border: "1px solid #eee" }}>
            <div style={{ fontSize: "11px", color: "#888", marginBottom: "4px" }}>Movimientos</div>
            <div style={{ fontSize: "22px", fontWeight: 800 }}>{stats.move_count}</div>
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: "4px", background: "#f0f0f0", padding: "3px", borderRadius: "8px", marginBottom: "12px", width: "fit-content" }}>
        {(["today", "week", "month", "custom"] as Period[]).map(p => (
          <button key={p} onClick={() => setPeriod(p)} style={{ padding: "5px 12px", borderRadius: "6px", border: "none", background: period === p ? "#1a1a2e" : "transparent", color: period === p ? "#fff" : "#666", cursor: "pointer", fontSize: "12px", fontWeight: 700 }}>
            {p === "today" ? "Hoy" : p === "week" ? "Semana" : p === "custom" ? "Personalizado" : "Mes"}
          </button>
        ))}
      </div>

      {period === "custom" && (
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center", marginBottom: "12px" }}>
          <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} style={{ padding: "6px 10px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "13px" }} />
          <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} style={{ padding: "6px 10px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "13px" }} />
          {(customFrom || customTo) && (
            <button onClick={() => { setCustomFrom(""); setCustomTo(""); setPeriod("today"); }} style={{ padding: "5px 10px", borderRadius: "6px", border: "1px solid #ddd", background: "#fff", color: "#666", fontSize: "12px", cursor: "pointer" }}>Limpiar</button>
          )}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", gap: "12px", flexWrap: "wrap" }}>
        {!hasOpenCashSession && <div style={{ fontSize: "12px", color: "#e67e22", fontWeight: 700 }}>Abrí una caja para registrar pagos</div>}
        <button onClick={openMovForm} disabled={!hasOpenCashSession} title={!hasOpenCashSession ? "Necesitás abrir una caja primero" : ""} style={{ padding: "8px 16px", borderRadius: "8px", border: "none", background: hasOpenCashSession ? "#e74c3c" : "#bfc6cd", color: "#fff", cursor: hasOpenCashSession ? "pointer" : "not-allowed", fontSize: "13px", fontWeight: 700 }}>💸 Registrar Pago</button>
        <button onClick={handleExportExcel} style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid #ddd", background: "#fff", color: "#1a1a2e", cursor: "pointer", fontSize: "13px", fontWeight: 700 }}>📥 Excel</button>
      </div>

      {loading ? <Loading /> : movements.length === 0 ? <Empty message="Sin pagos registrados" /> : (
        <div style={{ display: "grid", gap: "6px" }}>
          {movements.map(m => {
            const title = m.reason === "np_payment" ? "Pago de NP" : m.reason === "advance" ? "Anticipo a proveedor" : m.reason === "other_out" ? "Egreso" : "Otro";
            const provider = m.provider_name || m.supplier_name || "Sin proveedor";
            return (
            <Card key={m.id}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                <div style={{ width: "38px", height: "38px", borderRadius: "10px", background: "#fff1f0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", flexShrink: 0 }}>📤</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "flex-start", flexWrap: "wrap" }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                        <span style={{ fontWeight: 800, fontSize: "15px", color: "#e74c3c" }}>-${Number(m.amount).toLocaleString("es-AR")}</span>
                        <span style={{ fontSize: "11px", background: "#f0f0f0", padding: "2px 6px", borderRadius: "4px", color: "#666" }}>#{m.id}</span>
                        <span style={{ fontSize: "12px", color: "#666", fontWeight: 700 }}>{title}</span>
                        {m.payment_status_name && (
                          <span style={{ fontSize: "11px", background: m.payment_status_color || "#f4f4f4", color: "#fff", padding: "2px 8px", borderRadius: "999px", fontWeight: 700 }}>
                            {m.payment_status_name}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: "13px", color: "#222", fontWeight: 700, marginBottom: "6px" }}>
                        {provider}
                        {m.order_number ? ` · ${m.order_number}` : ""}
                      </div>
                    </div>
                    <button onClick={() => handleDeleteMovement(m.id)} style={{ background: "none", border: "none", color: "#e74c3c", cursor: "pointer", fontSize: "14px" }} title="Anular">🗑️</button>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "6px" }}>
                    <span style={{ fontSize: "11px", background: "#f6f6f6", color: "#666", padding: "3px 8px", borderRadius: "999px" }}>Cuenta: {m.account_name}</span>
                    {m.purchase_order_id && <span style={{ fontSize: "11px", background: "#fff5e6", color: "#8a5a00", padding: "3px 8px", borderRadius: "999px" }}>Imputado a NP #{m.purchase_order_id}</span>}
                  </div>
                  <div style={{ fontSize: "11px", color: "#999" }}>
                    {new Date(m.created_at).toLocaleString("es-AR")}
                    {m.notes ? ` · ${m.notes}` : ""}
                  </div>
                </div>
              </div>
            </Card>
          )})}
        </div>
      )}

      {showMovForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }} onClick={e => e.target === e.currentTarget && setShowMovForm(false)}>
          <div style={{ background: "#fff", borderRadius: "16px", padding: "24px", width: "100%", maxWidth: "460px" }}>
            <h2 style={{ margin: "0 0 16px", fontSize: "18px", fontWeight: 800 }}>💸 Registrar Pago</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <label style={{ fontSize: "12px", fontWeight: 700, color: "#666" }}>Cuenta *</label>
                <select value={movForm.financial_account_id} onChange={e => setMov("financial_account_id", e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "13px" }}>
                  <option value="">Seleccionar cuenta</option>
                  {paymentMethods.map(pm => <option key={pm.id} value={pm.id}>{pm.name}{pm.requires_arqueo ? " (arqueo)" : ""}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: "12px", fontWeight: 700, color: "#666" }}>Motivo</label>
                <select value={movForm.reason} onChange={e => {
                  const value = e.target.value;
                  setMov("reason", value);
                  setSelectedNp(null);
                  setSelectedSupplier(null);
                  setMovForm(prev => ({ ...prev, purchase_order_id: "", supplier_id: "", amount: "" }));
                  if (value === "np_payment") loadUnpaidNPs();
                }} style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "13px" }}>
                  <option value="">Seleccionar motivo...</option>
                  <option value="np_payment">Pago de NP</option>
                  <option value="advance">Anticipo a proveedor</option>
                  <option value="other_out">Otro egreso</option>
                </select>
              </div>

              {/* Pago de NP */}
              {movForm.reason === "np_payment" && (
                <div>
                  <label style={{ fontSize: "12px", fontWeight: 700, color: "#666" }}>NP a pagar</label>
                  {selectedNp ? (
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 12px", background: "#fef9f9", borderRadius: "8px", border: "1px solid #e74c3c" }}>
                      <span style={{ flex: 1, fontSize: "14px", fontWeight: 700 }}>
                        {selectedNp.order_number} · {selectedNp.provider_name || "Sin proveedor"} · <span style={{ color: "#e74c3c" }}>${selectedNp.payment_pending.toLocaleString("es-AR")} pend.</span>
                      </span>
                      <button onClick={() => { setSelectedNp(null); setMovForm(prev => ({ ...prev, purchase_order_id: "", amount: "" })); }} style={{ background: "none", border: "none", color: "#e74c3c", cursor: "pointer", fontSize: "13px" }}>✕</button>
                    </div>
                  ) : (
                    <div style={{ position: "relative" }}>
                      <div style={{ display: "flex", gap: "6px" }}>
                        <input value={npSearch} onChange={e => { setNpSearch(e.target.value); setShowNpDropdown(true); }} onFocus={() => setShowNpDropdown(true)} placeholder="Buscar NP por número o proveedor..." style={{ flex: 1, padding: "8px 12px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "13px" }} />
                      </div>
                      {showNpDropdown && (
                        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, border: "1px solid #ddd", borderRadius: "8px", marginTop: "4px", maxHeight: "220px", overflowY: "auto", background: "#fff", zIndex: 10, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
                          {filteredNPs.length === 0 ? (
                            <div style={{ padding: "12px", fontSize: "12px", color: "#999", textAlign: "center" }}>Sin NP pendientes</div>
                          ) : filteredNPs.slice(0, 15).map(np => (
                            <div key={np.id} onClick={() => selectNp(np)}
                              style={{ padding: "10px 14px", cursor: "pointer", fontSize: "13px", borderBottom: "1px solid #f0", display: "flex", justifyContent: "space-between" }}
                              onMouseEnter={e => (e.currentTarget.style.background = "#f5f5f5")}
                              onMouseLeave={e => (e.currentTarget.style.background = "none")}>
                              <span><b>{np.order_number}</b> · {np.provider_name || "Sin proveedor"}</span>
                              <span style={{ color: "#e74c3c", fontWeight: 700 }}>${np.payment_pending.toLocaleString("es-AR")} pend.</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Anticipo a Proveedor */}
              {movForm.reason === "advance" && (
                <div>
                  <label style={{ fontSize: "12px", fontWeight: 700, color: "#666" }}>Proveedor *</label>
                  {selectedSupplier ? (
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 12px", background: "#fef9f9", borderRadius: "8px", border: "1px solid #e74c3c" }}>
                      <span style={{ flex: 1, fontSize: "14px", fontWeight: 700 }}>{selectedSupplier.name}</span>
                      {selectedSupplier.phone && <span style={{ fontSize: "12px", color: "#666" }}>{selectedSupplier.phone}</span>}
                      <button onClick={() => { setSelectedSupplier(null); setMovForm(prev => ({ ...prev, supplier_id: "" })); }} style={{ background: "none", border: "none", color: "#e74c3c", cursor: "pointer", fontSize: "13px" }}>✕</button>
                    </div>
                  ) : (
                    <div style={{ position: "relative" }}>
                      <div style={{ display: "flex", gap: "6px" }}>
                        <input value={supSearch} onChange={e => { setSupSearch(e.target.value); setShowSupplierDropdown(true); }} onFocus={() => setShowSupplierDropdown(true)} placeholder="Buscar proveedor..." style={{ flex: 1, padding: "8px 12px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "13px" }} />
                        <button onClick={() => setShowSupplierDropdown(!showSupplierDropdown)} style={{ padding: "8px 10px", borderRadius: "8px", border: "1px solid #ddd", background: "#fff", cursor: "pointer", fontSize: "14px" }}>🔍</button>
                      </div>
                      {showSupplierDropdown && (
                        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, border: "1px solid #ddd", borderRadius: "8px", marginTop: "4px", maxHeight: "200px", overflowY: "auto", background: "#fff", zIndex: 10, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
                          {filteredSuppliers.length === 0 ? (
                            <div style={{ padding: "12px", fontSize: "12px", color: "#999", textAlign: "center" }}>Sin resultados</div>
                          ) : filteredSuppliers.slice(0, 15).map(s => (
                            <div key={s.id} onClick={() => selectSupplier(s)}
                              style={{ padding: "10px 14px", cursor: "pointer", fontSize: "13px", borderBottom: "1px solid #f0", display: "flex", justifyContent: "space-between" }}
                              onMouseEnter={e => (e.currentTarget.style.background = "#f5f5f5")}
                              onMouseLeave={e => (e.currentTarget.style.background = "none")}>
                              <span><b>{s.name}</b></span>
                              <span style={{ color: "#888" }}>{s.phone}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div>
                <label style={{ fontSize: "12px", fontWeight: 700, color: "#666" }}>Monto *</label>
                <input type="number" value={movForm.amount} onChange={e => setMov("amount", e.target.value)} placeholder="0.00" min="0" style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "13px" }} />
              </div>
              <div>
                <label style={{ fontSize: "12px", fontWeight: 700, color: "#666" }}>Notas</label>
                <textarea value={movForm.notes} onChange={e => setMov("notes", e.target.value)} placeholder="Observaciones..." style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "13px", minHeight: "60px", resize: "vertical" }} />
              </div>
            </div>
            <div style={{ display: "flex", gap: "8px", marginTop: "16px" }}>
              <button onClick={() => setShowMovForm(false)} style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "1px solid #ddd", background: "#fff", cursor: "pointer" }}>Cancelar</button>
              <button onClick={handleRegisterMovement} disabled={saving} style={{ flex: 2, padding: "10px", borderRadius: "8px", border: "none", background: "#e74c3c", color: "#fff", cursor: saving ? "not-allowed" : "pointer", fontWeight: 700, opacity: saving ? 0.7 : 1, fontSize: "14px" }}>{saving ? "Registrando..." : "💸 Registrar"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}