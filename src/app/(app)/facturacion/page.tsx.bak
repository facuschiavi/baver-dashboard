"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardHeader, Button, Input, Select, PageTitle, Loading, Empty } from "../../components/shared/UI";

type AfipConfig = {
  cuit: string; razon_social: string; condicion_iva: string;
  situacion_iibb: string | null; numero_iibb: string | null;
  production: boolean; punto_venta: number;
  has_afip_certs: boolean; configured: boolean;
};

type NvOrder = {
  id: number; order_number: string; subtotal: number; delivery_fee: number;
  total: number; created_at: string;
  contact_id: number; contact_name: string; contact_cuit: string;
  contact_condicion_iva: string;
  items: { product_name: string; quantity: number; unit_price: number; subtotal: number }[];
  factura_cae: string | null; factura_resultado: string | null; factura_id: number | null;
};

type AfipInvoice = {
  id: number; invoice_type: number; invoice_number: number; punto_venta: number;
  cae: string; cae_vencimiento: string; result: string;
  neto: number; iva: number; total: number;
  client_name: string | null; client_doc_nro: string | null;
  order_number: string | null;
  created_at: string; obs: string | null;
  voucher_kind?: string;
  related_invoice_id?: number | null;
};

const INVOICE_LABELS: Record<number, string> = {
  1: "Factura A", 3: "NC A",
  6: "Factura B", 8: "NC B",
  11: "Factura C", 13: "NC C",
};
const IVA_PCTS = [
  { value: "0", label: "0% (Exento)" },
  { value: "10.5", label: "10.5%" },
  { value: "21", label: "21%" },
  { value: "27", label: "27%" },
];

function statusBadge(result: string) {
  const colors: Record<string, string> = { A: "#27ae60", R: "#e74c3c", P: "#f39c12" };
  const labels: Record<string, string> = { A: "Aprobada", R: "Rechazada", P: "Pendiente" };
  return <span style={{ background: colors[result] || "#999", color: "#fff", padding: "2px 8px", borderRadius: "12px", fontSize: "11px", fontWeight: 600 }}>{labels[result] || result}</span>;
}

export default function FacturacionPage() {
  const [tab, setTab] = useState<"facturar" | "historial" | "libroiva">("facturar");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Config modal
  const [showConfig, setShowConfig] = useState(false);
  const [config, setConfig] = useState<AfipConfig | null>(null);
  const [certPem, setCertPem] = useState("");
  const [keyPem, setKeyPem] = useState("");
  const [configProduction, setConfigProduction] = useState(false);
  const [configPtoVta, setConfigPtoVta] = useState("1");
  const [savingConfig, setSavingConfig] = useState(false);

  // NV search
  const [nvSearch, setNvSearch] = useState("");
  const [nvFrom, setNvFrom] = useState("");
  const [nvTo, setNvTo] = useState("");
  const [orders, setOrders] = useState<NvOrder[]>([]);
  const [orderTotal, setOrderTotal] = useState(0);
  const [orderOffset, setOrderOffset] = useState(0);
  const [selectedOrder, setSelectedOrder] = useState<NvOrder | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [dragSelecting, setDragSelecting] = useState(false);
  const [dragMode, setDragMode] = useState<"select" | "deselect" | null>(null);
  const [orderDetail, setOrderDetail] = useState<{ items: any[]; invoice_type_auto: number } | null>(null);

  // Emission
  const [emitting, setEmitting] = useState(false);
  const [invoiceType, setInvoiceType] = useState("6");
  const [ivaPct, setIvaPct] = useState("21");
  const [lastResult, setLastResult] = useState<any>(null);
  const [lastResultOrder, setLastResultOrder] = useState<number | null>(null);

  // Historial
  const [invoices, setInvoices] = useState<AfipInvoice[]>([]);
  const [invoiceTotal, setInvoiceTotal] = useState(0);
  const [histPage, setHistPage] = useState(0);
  const [histTipo, setHistTipo] = useState("");
  const [histDesde, setHistDesde] = useState("");
  const [histHasta, setHistHasta] = useState("");

  // Libro IVA
  const [libroMes, setLibroMes] = useState(String(new Date().getMonth() + 1).padStart(2, "0"));
  const [libroAnio, setLibroAnio] = useState(String(new Date().getFullYear()));
  const [libroData, setLibroData] = useState<any>(null);

  const PAGE_LIMIT = 25;

  const api = useCallback(async (path: string, opts: any = {}) => {
    const token = localStorage.getItem("token");
    const res = await fetch(path, {
      ...opts,
      headers: { ...opts.headers, Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    });
    if (res.status === 401) { localStorage.removeItem("token"); window.location.reload(); return null; }
    return res.json();
  }, []);

  // ─── Load config once ──────────────────────────────────────
  useEffect(() => {
    (async () => {
      const data = await api("/api/afip/config");
      if (data?.configured) { setConfig(data); setConfigProduction(data.production); setConfigPtoVta(String(data.punto_venta)); }
    })();
  }, []);

  // ─── Search NVs ────────────────────────────────────────────
  async function searchNvs(page = 0) {
    setLoading(true); setError("");
    const params = new URLSearchParams();
    if (nvSearch) params.set("search", nvSearch);
    if (nvFrom) params.set("from", nvFrom);
    if (nvTo) params.set("to", nvTo);
    params.set("limit", String(PAGE_LIMIT));
    params.set("offset", String(page * PAGE_LIMIT));
    const data = await api(`/api/afip/orders?${params}`);
    if (data) { setOrders(data.orders || []); setOrderTotal(data.total); setOrderOffset(page); }
    setLoading(false);
  }

  // ─── Select NV ─────────────────────────────────────────────
  function setOrderChecked(id: number, checked: boolean) {
    setSelectedIds((prev) => {
      const exists = prev.includes(id);
      if (checked && !exists) return [...prev, id];
      if (!checked && exists) return prev.filter((x) => x !== id);
      return prev;
    });
  }

  function toggleSelected(id: number) {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  function selectVisibleOrders() {
    const ids = orders.filter((o) => !o.factura_cae).map((o) => o.id);
    setSelectedIds((prev) => Array.from(new Set([...prev, ...ids])));
  }

  function clearVisibleOrders() {
    const visible = new Set(orders.map((o) => o.id));
    setSelectedIds((prev) => prev.filter((id) => !visible.has(id)));
  }

  function beginDragSelection(order: NvOrder, e: React.PointerEvent<HTMLDivElement>) {
    const target = e.target as HTMLElement;
    if (target.tagName === "INPUT" || target.tagName === "BUTTON" || order.factura_cae) return;
    const nextMode = selectedIds.includes(order.id) ? "deselect" : "select";
    setDragMode(nextMode);
    setDragSelecting(true);
    setOrderChecked(order.id, nextMode === "select");
  }

  function dragOverOrder(order: NvOrder) {
    if (!dragSelecting || !dragMode || order.factura_cae) return;
    setOrderChecked(order.id, dragMode === "select");
  }

  useEffect(() => {
    const stop = () => { setDragSelecting(false); setDragMode(null); };
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
    return () => {
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
    };
  }, []);

  async function selectOrder(order: NvOrder) {
    setSelectedOrder(order);
    setLastResult(null);
    setLastResultOrder(null);
    setError("");

    const data = await api(`/api/afip/orders/${order.id}`);
    if (data) {
      setOrderDetail({ items: data.items, invoice_type_auto: data.invoice_type_auto });
      setInvoiceType(String(data.invoice_type_auto || 6));
    }
  }

  // ─── Emit invoice ──────────────────────────────────────────
  async function handleEmitir() {
    if (!selectedOrder) return;
    setEmitting(true); setError(""); setSuccess(""); setLastResult(null);

    const body: any = { order_id: selectedOrder.id, invoice_type: parseInt(invoiceType), iva_pct: parseFloat(ivaPct) || 21 };

    const result = await api("/api/afip/facturar", { method: "POST", body: JSON.stringify(body) });

    if (result?.success) {
      setSuccess(`✅ Factura emitida - CAE: ${result.cae}`);
      setLastResult(result);
      setLastResultOrder(selectedOrder.id);
      // Refresh NVs list
      searchNvs(orderOffset);
    } else {
      setError(result?.error || "Error al facturar");
      setLastResult(result);
    }
    setEmitting(false);
  }

  async function handleEmitirLote() {
    if (selectedIds.length === 0) return;
    const msg = `Se emitirán facturas para ${selectedIds.length} NV seleccionadas. ¿Confirmás?`;
    if (!window.confirm(msg)) return;

    setEmitting(true); setError(""); setSuccess(""); setLastResult(null);
    const result = await api("/api/afip/facturar-lote", {
      method: "POST",
      body: JSON.stringify({ order_ids: selectedIds, iva_pct: parseFloat(ivaPct) || 21 }),
    });

    if (result) {
      setLastResult(result);
      const ok = result.emitidas?.length || 0;
      const fail = result.fallidas?.length || 0;
      const skip = result.omitidas?.length || 0;
      setSuccess(`Lote procesado: ${ok} emitidas, ${skip} omitidas, ${fail} fallidas`);
      if (fail > 0) setError(`${fail} facturas fallaron. Revisá el detalle abajo.`);
      setSelectedIds([]);
      searchNvs(orderOffset);
    }
    setEmitting(false);
  }

  // ─── Load historial ────────────────────────────────────────
  async function loadHistorial(page = 0) {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("limit", String(PAGE_LIMIT)); params.set("offset", String(page * PAGE_LIMIT));
    if (histTipo) params.set("tipo", histTipo);
    if (histDesde) params.set("desde", histDesde);
    if (histHasta) params.set("hasta", histHasta);
    const data = await api(`/api/afip/facturas?${params}`);
    if (data) { setInvoices(data.facturas || []); setInvoiceTotal(data.total); setHistPage(page); }
    setLoading(false);
  }

  async function handleEmitirNC(inv: AfipInvoice) {
    if (!window.confirm(`Se emitirá una Nota de Crédito para ${INVOICE_LABELS[inv.invoice_type] || 'comprobante'} ${String(inv.punto_venta).padStart(4, "0")}-${String(inv.invoice_number).padStart(8, "0")}. ¿Confirmás?`)) return;
    setError(""); setSuccess("");
    const result = await api("/api/afip/notas-credito", {
      method: "POST",
      body: JSON.stringify({ invoice_id: inv.id, motivo: "Anulación desde historial" }),
    });
    if (result?.success) {
      setSuccess(`Nota de Crédito emitida - CAE: ${result.cae}`);
      loadHistorial(histPage);
      if (tab === "libroiva") loadLibro();
    } else {
      setError(result?.error || "Error emitiendo Nota de Crédito");
    }
  }

  // ─── Load libro IVA ────────────────────────────────────────
  async function loadLibro() {
    setLoading(true);
    const data = await api(`/api/afip/libro-iva?anio=${libroAnio}&mes=${libroMes}`);
    if (data) setLibroData(data);
    setLoading(false);
  }

  useEffect(() => {
    if (tab === "facturar") searchNvs();
    if (tab === "historial") loadHistorial();
    if (tab === "libroiva") loadLibro();
  }, [tab]);

  // ─── Save config ───────────────────────────────────────────
  async function handleSaveConfig() {
    setSavingConfig(true); setError(""); setSuccess("");
    const body: any = { punto_venta: parseInt(configPtoVta) || 1, production: configProduction };
    if (certPem.trim()) body.certificate_pem = certPem;
    if (keyPem.trim()) body.private_key_pem = keyPem;
    const result = await api("/api/afip/config", { method: "POST", body: JSON.stringify(body) });
    if (result?.success) {
      setSuccess("Configuración guardada");
      setCertPem(""); setKeyPem("");
      const fresh = await api("/api/afip/config");
      if (fresh?.configured) setConfig(fresh);
    } else {
      setError(result?.error || "Error al guardar");
    }
    setSavingConfig(false);
  }

  // ─── Render helpers ────────────────────────────────────────
  function formatNum(n: number) { return (n || 0).toLocaleString("es-AR", { minimumFractionDigits: 2 }); }
  function formatDate(d: string) { return d ? new Date(d).toLocaleDateString("es-AR") : "—"; }

  return (
    <div>
      <style jsx>{`
        .facturacion-main-grid { display: flex; gap: 20px; align-items: flex-start; }
        .facturacion-list { flex: 1; min-width: 0; }
        .facturacion-detail { width: 420px; flex-shrink: 0; position: sticky; top: 12px; }
        .facturacion-filters { display: flex; gap: 8px; margin-bottom: 12px; }
        .facturacion-batch-bar { display: flex; justify-content: space-between; align-items: center; background: #f0eeff; padding: 10px 12px; border-radius: 8px; margin-bottom: 12px; font-size: 13px; gap: 8px; }
        .facturacion-row { user-select: none; touch-action: pan-y; }
        .facturacion-row:hover { background: #faf9ff !important; }
        .mobile-only { display: none; }
        @media (max-width: 820px) {
          .facturacion-main-grid { flex-direction: column; gap: 12px; }
          .facturacion-list, .facturacion-detail { width: 100%; position: static; }
          .facturacion-filters { flex-direction: column; }
          .facturacion-batch-bar { position: sticky; bottom: 8px; z-index: 20; box-shadow: 0 8px 24px rgba(0,0,0,0.18); align-items: stretch; flex-direction: column; }
          .facturacion-batch-actions { width: 100%; display: grid !important; grid-template-columns: 1fr 1fr; }
          .facturacion-row { padding: 14px 12px !important; border-radius: 10px; margin: 6px 8px; border: 1px solid #eee; }
          .facturacion-row input[type=checkbox] { width: 22px; height: 22px; }
          .mobile-only { display: inline-flex; }
        }
      `}</style>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <PageTitle title="🧾 Facturación Electrónica" />
        <button onClick={() => setShowConfig(true)}
          style={{ background: "none", border: "none", fontSize: "24px", cursor: "pointer", padding: "8px" }}
          title="Configuración AFIP"
        >⚙️</button>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "4px", marginBottom: "20px", borderBottom: "2px solid #eee" }}>
        {[
          { key: "facturar", label: "🧾 Facturar NV" },
          { key: "historial", label: "📋 Historial" },
          { key: "libroiva", label: "📒 Libro IVA" },
        ].map((t) => (
          <button key={t.key} onClick={() => setTab(t.key as any)}
            style={{
              padding: "10px 20px", border: "none", cursor: "pointer", fontSize: "14px", fontWeight: 600,
              background: tab === t.key ? "#6c63ff" : "transparent",
              color: tab === t.key ? "#fff" : "#666",
              borderRadius: "8px 8px 0 0",
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {error && <div style={{ background: "#fdecea", color: "#c0392b", padding: "12px 16px", borderRadius: "8px", fontSize: "13px", marginBottom: "16px" }}>❌ {error}</div>}
      {success && <div style={{ background: "#e8f8f5", color: "#1e8449", padding: "12px 16px", borderRadius: "8px", fontSize: "13px", marginBottom: "16px" }}>✅ {success}</div>}

      {lastResult?.requested && (
        <Card style={{ marginBottom: "16px" }}>
          <CardHeader title="Resultado del lote" />
          <div style={{ padding: "16px", fontSize: "13px" }}>
            <div>✅ Emitidas: <strong>{lastResult.emitidas?.length || 0}</strong></div>
            <div>⏭️ Omitidas: <strong>{lastResult.omitidas?.length || 0}</strong></div>
            <div>❌ Fallidas: <strong>{lastResult.fallidas?.length || 0}</strong></div>
            {lastResult.omitidas?.length > 0 && <pre style={{ whiteSpace: "pre-wrap", fontSize: "12px", marginTop: "8px" }}>{JSON.stringify(lastResult.omitidas, null, 2)}</pre>}
            {lastResult.fallidas?.length > 0 && <pre style={{ whiteSpace: "pre-wrap", fontSize: "12px", color: "#c0392b", marginTop: "8px" }}>{JSON.stringify(lastResult.fallidas, null, 2)}</pre>}
          </div>
        </Card>
      )}

      {/* ════════════════ TAB: FACTURAR NV ════════════════ */}
      {tab === "facturar" && (
        <div className="facturacion-main-grid">
          {/* Left: NV list */}
          <div className="facturacion-list">
            <Card>
              <CardHeader title="Notas de Venta" action={
                <Button variant="secondary" onClick={() => searchNvs()}>🔄</Button>
              } />
              <div style={{ padding: "12px 16px" }}>
                <div className="facturacion-filters">
                  <div style={{ flex: 1 }}>
                    <input placeholder="Buscar por cliente, NV o producto..." value={nvSearch}
                      onChange={(e) => setNvSearch(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && searchNvs()}
                      style={{ width: "100%", padding: "8px 12px", border: "1px solid #ddd", borderRadius: "8px", fontSize: "14px" }}
                    />
                  </div>
                  <input type="date" value={nvFrom} onChange={(e) => setNvFrom(e.target.value)}
                    style={{ padding: "8px", border: "1px solid #ddd", borderRadius: "8px", fontSize: "13px" }} />
                  <input type="date" value={nvTo} onChange={(e) => setNvTo(e.target.value)}
                    style={{ padding: "8px", border: "1px solid #ddd", borderRadius: "8px", fontSize: "13px" }} />
                  <Button onClick={() => searchNvs()} disabled={loading}>
                    {loading ? "..." : "Buscar"}
                  </Button>
                </div>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "12px" }}>
                  <Button variant="secondary" onClick={selectVisibleOrders}>Seleccionar visibles</Button>
                  <Button variant="secondary" onClick={clearVisibleOrders}>Destildar visibles</Button>
                  <span style={{ color: "#888", fontSize: "12px", alignSelf: "center" }}>Tip: en desktop podés clickear y arrastrar sobre las NVs.</span>
                </div>
                {selectedIds.length > 0 && (
                  <div className="facturacion-batch-bar">
                    <span><strong>{selectedIds.length}</strong> NV seleccionadas</span>
                    <div className="facturacion-batch-actions" style={{ display: "flex", gap: "8px" }}>
                      <Button variant="secondary" onClick={() => setSelectedIds([])}>Limpiar</Button>
                      <Button onClick={handleEmitirLote} disabled={emitting || !config?.has_afip_certs}>
                        {emitting ? "Procesando..." : "🧾 Facturar seleccionadas"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <div style={{ maxHeight: "500px", overflowY: "auto", borderTop: "1px solid #eee" }}>
                {loading ? <Loading /> : orders.length === 0 ? (
                  <Empty message="No se encontraron NVs" />
                ) : orders.map((o) => (
                  <div key={o.id} className="facturacion-row"
                    onPointerDown={(e) => beginDragSelection(o, e)}
                    onPointerEnter={() => dragOverOrder(o)}
                    onClick={() => selectOrder(o)}
                    style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "10px 16px", cursor: "pointer", fontSize: "13px",
                      borderBottom: "1px solid #f0f0f0",
                      background: selectedOrder?.id === o.id ? "#f0eeff" : "transparent",
                    }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <input type="checkbox" checked={selectedIds.includes(o.id)} disabled={!!o.factura_cae}
                        onClick={(e) => e.stopPropagation()}
                        onChange={() => toggleSelected(o.id)}
                      />
                      <div>
                        <div style={{ fontWeight: 600 }}>{o.order_number || `NV #${o.id}`}</div>
                      <div style={{ color: "#888" }}>{o.contact_name || "—"}</div>
                        {o.contact_cuit && <div style={{ color: "#aaa", fontSize: "12px" }}>CUIT: {o.contact_cuit}</div>}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontWeight: 600 }}>${formatNum(o.total)}</div>
                      <div style={{ color: "#888", fontSize: "12px" }}>{formatDate(o.created_at)}</div>
                      {o.factura_cae && (
                        <div style={{ marginTop: "2px" }}>{statusBadge(o.factura_resultado || "A")}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {orderTotal > PAGE_LIMIT && (
                <div style={{ display: "flex", justifyContent: "center", gap: "8px", padding: "12px" }}>
                  <Button variant="secondary" onClick={() => searchNvs(Math.max(0, orderOffset - 1))} disabled={orderOffset === 0}>◀</Button>
                  <span style={{ padding: "8px", fontSize: "13px", color: "#888" }}>{orderOffset + 1} de {Math.ceil(orderTotal / PAGE_LIMIT)}</span>
                  <Button variant="secondary" onClick={() => searchNvs(orderOffset + 1)} disabled={(orderOffset + 1) * PAGE_LIMIT >= orderTotal}>▶</Button>
                </div>
              )}
            </Card>
          </div>

          {/* Right: NV detail + emit */}
          <div className="facturacion-detail">
            {selectedOrder ? (
              <>
                <Card>
                  <CardHeader title={`📄 ${selectedOrder.order_number || `NV #${selectedOrder.id}`}`} />
                  <div style={{ padding: "16px", fontSize: "13px" }}>
                    <div style={{ marginBottom: "12px" }}>
                      <div><strong>Cliente:</strong> {selectedOrder.contact_name || "—"}</div>
                      <div><strong>CUIT:</strong> {selectedOrder.contact_cuit || "—"}</div>
                      <div><strong>Cond. IVA:</strong> {selectedOrder.contact_condicion_iva || "—"}</div>
                    </div>

                    {orderDetail?.items && orderDetail.items.length > 0 && (
                      <div style={{ marginBottom: "12px" }}>
                        <div style={{ fontWeight: 600, marginBottom: "4px" }}>Items:</div>
                        {orderDetail.items.map((it, i) => (
                          <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid #f0f0f0" }}>
                            <span>{it.product_name} x{it.quantity}</span>
                            <span>${formatNum(it.subtotal)}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div style={{ borderTop: "2px solid #eee", paddingTop: "8px", marginBottom: "12px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}><span>Subtotal:</span><span>${formatNum(selectedOrder.subtotal)}</span></div>
                      {selectedOrder.delivery_fee > 0 && <div style={{ display: "flex", justifyContent: "space-between" }}><span>Envío:</span><span>${formatNum(selectedOrder.delivery_fee)}</span></div>}
                      <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: "15px", marginTop: "4px" }}>
                        <span>Total:</span><span>${formatNum(selectedOrder.total)}</span>
                      </div>
                    </div>

                    {!selectedOrder.factura_cae ? (
                      <>
                        <div style={{ background: "#f8f9fa", padding: "12px", borderRadius: "8px", marginBottom: "12px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                            <span style={{ fontWeight: 600 }}>Comprobante:</span>
                            <span style={{ color: "#6c63ff", fontWeight: 600 }}>
                              {INVOICE_LABELS[orderDetail?.invoice_type_auto || 6] || "Factura B"}
                            </span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span style={{ fontWeight: 600 }}>IVA:</span>
                            <Select value={ivaPct} onChange={setIvaPct} options={IVA_PCTS} />
                          </div>
                        </div>

                        <Button onClick={handleEmitir} disabled={emitting || !config?.has_afip_certs} style={{ width: "100%" }}>
                          {emitting ? "Emitiendo..." : !config?.has_afip_certs ? "Configure AFIP primero (⚙️)" : "🧾 Emitir factura"}
                        </Button>
                      </>
                    ) : (
                      <div style={{ textAlign: "center", padding: "12px", background: "#eafaf1", borderRadius: "8px" }}>
                        ✅ Ya facturada {statusBadge(selectedOrder.factura_resultado || "A")}
                        <div style={{ fontSize: "11px", color: "#888", marginTop: "4px" }}>CAE: {selectedOrder.factura_cae}</div>
                      </div>
                    )}
                  </div>
                </Card>

                {lastResult && lastResultOrder === selectedOrder.id && (
                  <Card>
                    <CardHeader title={lastResult.success ? "✅ Factura emitida" : "❌ Error"} />
                    <div style={{ padding: "16px", fontSize: "13px" }}>
                      {lastResult.success ? (
                        <>
                          <div><strong>CAE:</strong> {lastResult.cae}</div>
                          <div><strong>Vto. CAE:</strong> {lastResult.cae_vencimiento}</div>
                          <div><strong>Comprobante:</strong> {INVOICE_LABELS[lastResult.tipo] || `Tipo ${lastResult.tipo}`} N° {String(lastResult.punto_venta).padStart(4, "0")}-{String(lastResult.numero).padStart(8, "0")}</div>
                          <div><strong>Resultado:</strong> {statusBadge(lastResult.resultado)}</div>
                        </>
                      ) : (
                        <pre style={{ whiteSpace: "pre-wrap", fontSize: "12px", color: "#e74c3c" }}>{JSON.stringify(lastResult, null, 2)}</pre>
                      )}
                    </div>
                  </Card>
                )}
              </>
            ) : (
              <Card>
                <div style={{ padding: "40px 20px", textAlign: "center", color: "#888", fontSize: "14px" }}>
                  Seleccioná una NV de la lista para facturar
                </div>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* ════════════════ TAB: HISTORIAL ════════════════ */}
      {tab === "historial" && (
        <Card>
          <CardHeader title="📋 Facturas emitidas" action={
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <select value={histTipo} onChange={(e) => setHistTipo(e.target.value)}
                style={{ padding: "6px 8px", border: "1px solid #ddd", borderRadius: "6px", fontSize: "12px" }}>
                <option value="">Todos los tipos</option>
                <option value="1">Factura A</option>
                <option value="6">Factura B</option>
                <option value="11">Factura C</option>
              </select>
              <input type="date" value={histDesde} onChange={(e) => setHistDesde(e.target.value)}
                style={{ padding: "6px 8px", border: "1px solid #ddd", borderRadius: "6px", fontSize: "12px" }} />
              <input type="date" value={histHasta} onChange={(e) => setHistHasta(e.target.value)}
                style={{ padding: "6px 8px", border: "1px solid #ddd", borderRadius: "6px", fontSize: "12px" }} />
              <Button variant="secondary" onClick={() => loadHistorial()}>Filtrar</Button>
            </div>
          } />
          <div style={{ padding: "16px" }}>
            {loading ? <Loading /> : invoices.length === 0 ? (
              <Empty message="No se emitieron facturas" />
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                  <thead>
                    <tr style={{ background: "#f8f9fa", borderBottom: "2px solid #eee" }}>
                      <th style={{ padding: "10px 8px", textAlign: "left" }}>Comprobante</th>
                      <th style={{ padding: "10px 8px", textAlign: "left" }}>NV</th>
                      <th style={{ padding: "10px 8px", textAlign: "left" }}>Cliente</th>
                      <th style={{ padding: "10px 8px", textAlign: "right" }}>Neto</th>
                      <th style={{ padding: "10px 8px", textAlign: "right" }}>IVA</th>
                      <th style={{ padding: "10px 8px", textAlign: "right" }}>Total</th>
                      <th style={{ padding: "10px 8px", textAlign: "center" }}>CAE</th>
                      <th style={{ padding: "10px 8px", textAlign: "center" }}>Estado</th>
                      <th style={{ padding: "10px 8px", textAlign: "right" }}>Fecha</th>
                      <th style={{ padding: "10px 8px", textAlign: "center" }}>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((inv) => (
                      <tr key={inv.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                        <td style={{ padding: "10px 8px" }}>
                          {INVOICE_LABELS[inv.invoice_type] || `T${inv.invoice_type}`} {String(inv.punto_venta).padStart(4, "0")}-{String(inv.invoice_number).padStart(8, "0")}
                        </td>
                        <td style={{ padding: "10px 8px" }}>{inv.order_number || "—"}</td>
                        <td style={{ padding: "10px 8px" }}>{inv.client_name || "—"}</td>
                        <td style={{ padding: "10px 8px", textAlign: "right" }}>${formatNum(inv.neto)}</td>
                        <td style={{ padding: "10px 8px", textAlign: "right" }}>${formatNum(inv.iva)}</td>
                        <td style={{ padding: "10px 8px", textAlign: "right" }}>${formatNum(inv.total)}</td>
                        <td style={{ padding: "10px 8px", textAlign: "center", fontFamily: "monospace", fontSize: "12px" }}>{inv.cae || "—"}</td>
                        <td style={{ padding: "10px 8px", textAlign: "center" }}>{statusBadge(inv.result)}</td>
                        <td style={{ padding: "10px 8px", textAlign: "right", whiteSpace: "nowrap" }}>{formatDate(inv.created_at)}</td>
                        <td style={{ padding: "10px 8px", textAlign: "center" }}>
                          {inv.voucher_kind !== "credit_note" && inv.result === "A" ? (
                            <button onClick={() => handleEmitirNC(inv)}
                              style={{ padding: "4px 8px", border: "1px solid #e67e22", background: "#fff7e6", color: "#d35400", borderRadius: "6px", cursor: "pointer", fontSize: "11px" }}>
                              Emitir NC
                            </button>
                          ) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {invoiceTotal > PAGE_LIMIT && (
              <div style={{ display: "flex", justifyContent: "center", gap: "8px", marginTop: "16px" }}>
                <Button variant="secondary" onClick={() => loadHistorial(Math.max(0, histPage - 1))} disabled={histPage === 0}>◀ Anterior</Button>
                <span style={{ padding: "8px", fontSize: "13px", color: "#888" }}>Pág. {histPage + 1} de {Math.ceil(invoiceTotal / PAGE_LIMIT)}</span>
                <Button variant="secondary" onClick={() => loadHistorial(histPage + 1)} disabled={(histPage + 1) * PAGE_LIMIT >= invoiceTotal}>Siguiente ▶</Button>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* ════════════════ TAB: LIBRO IVA ════════════════ */}
      {tab === "libroiva" && (
        <Card>
          <CardHeader title="📒 Libro IVA" action={
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <select value={libroMes} onChange={(e) => setLibroMes(e.target.value)}
                style={{ padding: "6px 8px", border: "1px solid #ddd", borderRadius: "6px", fontSize: "12px" }}>
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={String(i + 1).padStart(2, "0")}>
                    {["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"][i]}
                  </option>
                ))}
              </select>
              <input type="number" value={libroAnio} onChange={(e) => setLibroAnio(e.target.value)}
                style={{ width: "70px", padding: "6px 8px", border: "1px solid #ddd", borderRadius: "6px", fontSize: "12px" }} />
              <Button variant="secondary" onClick={loadLibro}>Consultar</Button>
            </div>
          } />
          <div style={{ padding: "16px" }}>
            {loading ? <Loading /> : !libroData ? (
              <Empty message="Consultá un período para ver el Libro IVA" />
            ) : (
              <>
                {/* Resumen por tipo */}
                {libroData.resumen?.length > 0 && (
                  <div style={{ display: "flex", gap: "12px", marginBottom: "20px", flexWrap: "wrap" }}>
                    {libroData.resumen.map((r: any, i: number) => (
                      <div key={i} style={{ flex: 1, minWidth: "180px", background: "#f8f9fa", padding: "12px", borderRadius: "8px" }}>
                        <div style={{ fontWeight: 600, marginBottom: "4px" }}>{INVOICE_LABELS[r.invoice_type] || `Tipo ${r.invoice_type}`}</div>
                        <div>Cantidad: <strong>{r.cantidad}</strong></div>
                        <div>Neto: <strong>${formatNum(r.total_neto)}</strong></div>
                        <div>IVA: <strong>${formatNum(r.total_iva)}</strong></div>
                        <div style={{ borderTop: "1px solid #ddd", marginTop: "4px", paddingTop: "4px" }}>
                          Total: <strong>${formatNum(r.total_facturado)}</strong>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Detalle */}
                {libroData.comprobantes?.length > 0 ? (
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                      <thead>
                        <tr style={{ background: "#f8f9fa", borderBottom: "2px solid #eee" }}>
                          <th style={{ padding: "10px 8px", textAlign: "left" }}>Comp.</th>
                          <th style={{ padding: "10px 8px", textAlign: "left" }}>NV</th>
                          <th style={{ padding: "10px 8px", textAlign: "left" }}>Cliente</th>
                          <th style={{ padding: "10px 8px", textAlign: "left" }}>Doc.</th>
                          <th style={{ padding: "10px 8px", textAlign: "right" }}>Neto</th>
                          <th style={{ padding: "10px 8px", textAlign: "right" }}>IVA</th>
                          <th style={{ padding: "10px 8px", textAlign: "right" }}>Total</th>
                          <th style={{ padding: "10px 8px", textAlign: "center" }}>CAE</th>
                          <th style={{ padding: "10px 8px", textAlign: "center" }}>Vto.</th>
                          <th style={{ padding: "10px 8px", textAlign: "right" }}>Fecha</th>
                        </tr>
                      </thead>
                      <tbody>
                        {libroData.comprobantes.map((c: any, i: number) => (
                          <tr key={i} style={{ borderBottom: "1px solid #f0f0f0" }}>
                            <td style={{ padding: "8px" }}>{INVOICE_LABELS[c.invoice_type] || `T${c.invoice_type}`} {String(c.punto_venta).padStart(4, "0")}-{String(c.invoice_number).padStart(8, "0")}</td>
                            <td style={{ padding: "8px" }}>{c.order_number || "—"}</td>
                            <td style={{ padding: "8px" }}>{c.client_name || "—"}</td>
                            <td style={{ padding: "8px", fontSize: "12px" }}>{c.client_doc_nro || "—"}</td>
                            <td style={{ padding: "8px", textAlign: "right" }}>${formatNum(c.neto)}</td>
                            <td style={{ padding: "8px", textAlign: "right" }}>${formatNum(c.iva)}</td>
                            <td style={{ padding: "8px", textAlign: "right" }}>${formatNum(c.total)}</td>
                            <td style={{ padding: "8px", textAlign: "center", fontFamily: "monospace", fontSize: "11px" }}>{c.cae || "—"}</td>
                            <td style={{ padding: "8px", textAlign: "center", fontSize: "11px" }}>{c.cae_vencimiento ? new Date(c.cae_vencimiento).toLocaleDateString("es-AR") : "—"}</td>
                            <td style={{ padding: "8px", textAlign: "right", whiteSpace: "nowrap" }}>{formatDate(c.created_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <Empty message={`No hay comprobantes aprobados en ${libroData.periodo}`} />
                )}
              </>
            )}
          </div>
        </Card>
      )}

      {/* ════════════════ CONFIG MODAL ════════════════ */}
      {showConfig && (
        <>
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 100 }} onClick={() => setShowConfig(false)} />
          <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", background: "#fff", borderRadius: "16px", zIndex: 101, width: "500px", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ padding: "24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                <h2 style={{ margin: 0, fontSize: "18px" }}>⚙️ Configuración AFIP</h2>
                <button onClick={() => setShowConfig(false)} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "#888" }}>✕</button>
              </div>

              {config && (
                <div style={{ marginBottom: "16px", padding: "12px", background: "#f8f9fa", borderRadius: "8px", fontSize: "13px" }}>
                  <div style={{ fontWeight: 600, marginBottom: "6px" }}>📋 Datos fiscales</div>
                  <div>🏢 {config.razon_social} (CUIT: {config.cuit})</div>
                  <div>📐 {config.condicion_iva}</div>
                  <div style={{ marginTop: "4px" }}>
                    🟢 AFIP: {config.has_afip_certs
                      ? <span style={{ color: "#27ae60" }}>Certificados cargados ✓</span>
                      : <span style={{ color: "#e67e22" }}>Sin certificados</span>}
                  </div>
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <Input label="Punto de venta" value={configPtoVta} onChange={setConfigPtoVta} placeholder="1" />
                <Select label="Entorno" value={configProduction ? "true" : "false"}
                  onChange={(v) => setConfigProduction(v === "true")}
                  options={[
                    { value: "false", label: "🧪 Homologación (pruebas)" },
                    { value: "true", label: "🏭 Producción" },
                  ]}
                />
              </div>

              <Input label="🔑 Certificado (.pem / .crt)" value={certPem} onChange={setCertPem}
                placeholder="Pegá el contenido del certificado ARCA ..."
                style={{ fontFamily: "monospace", fontSize: "12px", minHeight: "60px" }}
              />
              <Input label="🗝️ Clave privada (.key)" value={keyPem} onChange={setKeyPem}
                placeholder="Pegá el contenido de la clave privada ..."
                style={{ fontFamily: "monospace", fontSize: "12px", minHeight: "60px" }}
              />

              <div style={{ marginTop: "16px" }}>
                <Button onClick={handleSaveConfig} disabled={savingConfig}>
                  {savingConfig ? "Guardando..." : "Guardar configuración"}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
