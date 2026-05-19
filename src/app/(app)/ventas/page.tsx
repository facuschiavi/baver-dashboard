"use client";

const API = process.env.NEXT_PUBLIC_API_URL || "/api";

import { useEffect, useState } from "react";
import { fetchJson, postJson, deleteJson } from "../../lib";
import * as XLSX from 'xlsx';
import { Card, Badge, IconButton, PageTitle, Loading, Empty } from "../../components/shared/UI";
import OrderDetailReadOnly from "../../components/OrderDetailReadOnly";
import NewSaleModal from "../../components/NewSaleModal";
import type { SaleChannel, OrderStatus, PaymentStatus } from "../../types";

type OrderRow = {
  id: number;
  order_number: string;
  total: number;
  subtotal: number;
  discount_type: string;
  discount_value: number;
  delivery_fee: number;
  contact_name: string;
  seller_name: string;
  sale_channel_name: string;
  order_status_name: string;
  order_status_color: string;
  payment_status_name: string;
  payment_status_color: string;
  payment_paid: number;
  payment_pending: number;
  items: Array<{ quantity: number }>;
  created_at: string;
  sale_channel_has_delivery?: boolean;
  factura_id?: number | null;
  factura_cae?: string | null;
  factura_resultado?: string | null;
  factura_tipo?: number | null;
  factura_numero?: number | null;
  nc_id?: number | null;
  nc_cae?: string | null;
  nc_numero?: number | null;
};

type Stats = {
  total_count: number;
  total_revenue: number;
  total_collected: number;
  total_pending: number;
  best_seller: { seller_name: string; sale_count: number; revenue: number } | null;
  payment_breakdown: Array<{ method_name: string; order_count: number; collected: number }>;
  by_day: Array<{ day: string; order_count: number; day_revenue: number }>;
};

type Period = "today" | "week" | "month" | "custom";

export default function VentasPage() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"cards" | "list">("cards");
  const [search, setSearch] = useState("");
  const [filterChannel, setFilterChannel] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPayment, setFilterPayment] = useState("");
  const [period, setPeriod] = useState<Period>("today");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const [saleChannels, setSaleChannels] = useState<SaleChannel[]>([]);
  const [orderStatuses, setOrderStatuses] = useState<OrderStatus[]>([]);
  const [paymentStatuses, setPaymentStatuses] = useState<PaymentStatus[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);

  const [detailId, setDetailId] = useState<number | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusTargetId, setStatusTargetId] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [invoicingId, setInvoicingId] = useState<number | null>(null);
  const [creditNoteId, setCreditNoteId] = useState<number | null>(null);

  function openStatusModal(id: number) {
    setStatusTargetId(id);
    setShowStatusModal(true);
  }

  async function updateOrderStatus(orderId: number, newStatusId: number) {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
    const r = await fetch(`${API}/orders/${orderId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ order_status_id: newStatusId }),
    });
    if (!r.ok) throw new Error('status ' + r.status);
  }

  function doSaveStatus(newStatusId: number) {
    updateOrderStatus(statusTargetId, newStatusId)
      .then(() => { setShowStatusModal(false); load(); })
      .catch(e => alert('Error: ' + e));
  }

  async function startProduction(orderId: number) {
    if (!confirm("Iniciar producción para esta NV?")) return;
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
    try {
      const r = await fetch(API + "/plugins/produccion/init/" + orderId, {
        method: 'POST', headers: { 'Authorization': 'Bearer ' + token }
      });
      if (r.ok) {
        alert("✅ Producción iniciada");
        setRefreshKey(k => k + 1);
      } else {
        const err = await r.json();
        alert("Error: " + (err.error || err.message || r.status));
      }
    } catch(e: any) { alert("Error: " + e.message); }
  }

  async function markFinalized(orderId: number) {
    if (!confirm("Marcar esta NV como finalizada? Esto da por terminados productos, servicios y OTs asociadas.")) return;
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
    try {
      const r = await fetch(`${API}/orders/${orderId}/finalize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      });
      if (!r.ok) throw new Error('status ' + r.status);
      load();
    } catch (e) { alert('Error: ' + e); }
  }

  function load() {
    setLoading(true);
    Promise.all([
      fetchJson<OrderRow[]>("/orders?period=" + period + (period === "custom" && customFrom && customTo ? "&from=" + customFrom + "&to=" + customTo : "")),
      fetchJson<SaleChannel[]>("/sale-channels"),
      fetchJson<OrderStatus[]>("/order-statuses"),
      fetchJson<PaymentStatus[]>("/payment-statuses"),
      fetchJson<Stats>("/orders/stats?period=" + period + (period === "custom" && customFrom && customTo ? "&from=" + customFrom + "&to=" + customTo : "")),
    ]).then(([o, sc, os, ps, st]) => {
      setOrders(o);
      setSaleChannels(sc);
      setOrderStatuses(os);
      setPaymentStatuses(ps);
      setStats(st);
    }).catch(console.error).finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [refreshKey, period, customFrom, customTo]);

  function handleCreated() { setShowNew(false); setRefreshKey(k => k + 1); }

async function downloadInvoicePdf(invoiceId: number, label: string) {
  const token = localStorage.getItem("token");
  try {
    const res = await fetch("/api/afip/invoices/" + invoiceId + "/pdf", {
      headers: { Authorization: "Bearer " + token },
    });
    if (!res.ok) { alert("Error al descargar PDF"); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = label + ".pdf";
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (e) { alert("Error: " + e); }
}

function handleExportExcel() {
  const data = orders.map(o => ({
    "NV": o.order_number,
    "Fecha": new Date(o.created_at).toLocaleDateString("es-AR"),
    "Cliente": o.contact_name || "-",
    "Canal": o.sale_channel_name || "-",
    "Total": Number(o.total || 0),
    "Pagado": Number(o.payment_paid || 0),
    "Saldo": Number(o.payment_pending || 0),
    "Estado Pago": o.payment_status_name || "-",
    "Vendedor": o.seller_name || "-",
    "Status": o.order_status_name || "-",
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Ventas");
  const from = customFrom || "todas";
  const to = customTo || "todas";
  XLSX.writeFile(wb, "Ventas_" + from + "_" + to + ".xlsx");
}


  async function handleDelete(id: number, orderNumber: string) {
    if (!confirm(`¿Eliminar la venta ${orderNumber}? Esta acción no se puede deshacer.`)) return;
    try {
      await deleteJson("/orders/" + id);
      setRefreshKey(k => k + 1);
    } catch (e: any) {
      console.error(e);
      const body = e?.body || (typeof e === "object" ? e : null);
      if (body?.requires_credit_note) {
        alert(body.error || "No se puede eliminar una venta facturada sin emitir antes Nota de Crédito.");
      } else if (body?.payments?.length > 0) {
        const paymentList = body.payments.map((p: any) => "  $" + Number(p.amount).toLocaleString("es-AR", {minimumFractionDigits:2}) + " - " + (p.method || "-") + " (" + new Date(p.paid_at).toLocaleDateString("es-AR") + ")").join("\n");
        alert("No se puede eliminar: la venta tiene cobros asociados.\n\nEliminá los cobros primero:\n" + paymentList);
      } else {
        alert("No se pudo eliminar");
      }
    }
  }

  async function handleEmitirNC(order: OrderRow) {
    if (!order.factura_id || order.nc_id) return;
    if (!confirm(`¿Anular fiscalmente la factura de ${order.order_number}?

Se emitirá una Nota de Crédito por el total de la factura.`)) return;
    setCreditNoteId(order.id);
    try {
      const result: any = await postJson('/afip/notas-credito', { invoice_id: order.factura_id, motivo: `Anulación factura de ${order.order_number}` });
      if (result?.success) {
        alert(`Nota de Crédito emitida ✅
CAE: ${result.cae || '—'}`);
      } else {
        alert(result?.error || result?.resultado || 'ARCA rechazó la Nota de Crédito');
      }
      load();
    } catch (e: any) {
      alert(e?.body?.error || e?.message || 'No se pudo emitir la Nota de Crédito');
      if (e?.status === 409) load();
    } finally {
      setCreditNoteId(null);
    }
  }

  async function handleFacturar(order: OrderRow) {
    if (order.factura_id) return;
    if (!confirm(`¿Emitir factura electrónica para ${order.order_number}?`)) return;
    setInvoicingId(order.id);
    try {
      const result: any = await postJson('/afip/facturar', { order_id: order.id });
      if (result?.success) {
        alert(`Factura emitida ✅
CAE: ${result.cae || '—'}`);
      } else {
        alert(result?.error || result?.resultado || 'ARCA rechazó la factura');
      }
      load();
    } catch (e: any) {
      const msg = e?.body?.error || e?.message || 'No se pudo facturar';
      alert(msg);
      if (e?.status === 409) load();
    } finally {
      setInvoicingId(null);
    }
  }

  const invoiceButtonStyle = (disabled = false): React.CSSProperties => ({
    padding: "5px 8px", borderRadius: "6px", border: disabled ? "1px solid #27ae60" : "1px solid #8e44ad",
    background: disabled ? "#eafaf1" : "#fbf8ff", cursor: disabled ? "default" : "pointer", fontSize: "12px", color: disabled ? "#27ae60" : "#8e44ad"
  });

  const creditNoteButtonStyle = (disabled = false): React.CSSProperties => ({
    padding: "5px 8px", borderRadius: "6px", border: disabled ? "1px solid #d35400" : "1px solid #e67e22",
    background: disabled ? "#fff7e6" : "#fff7e6", cursor: disabled ? "default" : "pointer", fontSize: "12px", color: "#d35400"
  });

  const filtered = orders.filter(o => {
    if (search && !o.contact_name?.toLowerCase().includes(search.toLowerCase()) &&
        !o.order_number?.toLowerCase().includes(search.toLowerCase()) &&
        !o.seller_name?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterChannel && String(o.sale_channel_name) !== filterChannel) return false;
    if (filterStatus && String(o.order_status_name) !== filterStatus) return false;
    if (filterPayment && String(o.payment_status_name) !== filterPayment) return false;
    return true;
  });

  const itemCount = (o: OrderRow) => o.items?.reduce((s, i) => s + (i.quantity || 1), 0) ?? 0;
  const pendingAmount = (o: OrderRow) => {
    const paid = Number(o.payment_paid || 0);
    const total = Number(o.total || 0);
    return total - paid;
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: "16px" }}>
        <PageTitle>🧾 Ventas</PageTitle>
        <p style={{ fontSize: "13px", color: "#888", margin: "2px 0 0" }}>
          Gestioná tus Notas de Venta, controlá pagos parciales y seguí el estado de cada operación.
        </p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "10px", marginBottom: "16px" }}>
          <div style={{ background: "#1a1a2e", borderRadius: "12px", padding: "14px", color: "#fff" }}>
            <div style={{ fontSize: "11px", color: "#aaa", marginBottom: "4px" }}>Ventas del período</div>
            <div style={{ fontSize: "24px", fontWeight: 800 }}>{stats.total_count}</div>
            <div style={{ fontSize: "12px", color: "#27ae60", marginTop: "2px" }}>
              ${stats.total_revenue.toLocaleString("es-AR")} facturado
            </div>
          </div>
          <div style={{ background: "#fff", borderRadius: "12px", padding: "14px", border: "1px solid #eee" }}>
            <div style={{ fontSize: "11px", color: "#888", marginBottom: "4px" }}>Cobrado</div>
            <div style={{ fontSize: "20px", fontWeight: 800, color: "#27ae60" }}>${stats.total_collected.toLocaleString("es-AR")}</div>
            {stats.total_pending > 0 && (
              <div style={{ fontSize: "12px", color: "#f39c12", marginTop: "2px" }}>
                ${stats.total_pending.toLocaleString("es-AR")} pendiente
              </div>
            )}
          </div>
          <div style={{ background: "#fff", borderRadius: "12px", padding: "14px", border: "1px solid #eee" }}>
            <div style={{ fontSize: "11px", color: "#888", marginBottom: "4px" }}>🏆 Mejor Vendedor</div>
            <div style={{ fontSize: "16px", fontWeight: 800 }}>
              {stats.best_seller ? stats.best_seller.seller_name : "—"}
            </div>
            {stats.best_seller && (
              <div style={{ fontSize: "11px", color: "#888", marginTop: "2px" }}>
                {stats.best_seller.sale_count} ventas · ${Number(stats.best_seller.revenue).toLocaleString("es-AR")}
              </div>
            )}
          </div>
          <div style={{ background: "#fff", borderRadius: "12px", padding: "14px", border: "1px solid #eee" }}>
            <div style={{ fontSize: "11px", color: "#888", marginBottom: "4px" }}>💳 Métodos de Pago</div>
            {stats.payment_breakdown.filter(b => b.method_name).slice(0, 2).map(b => (
              <div key={b.method_name} style={{ fontSize: "12px", display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
                <span>{b.method_name}</span>
                <span style={{ fontWeight: 700 }}>${Number(b.collected).toLocaleString("es-AR")}</span>
              </div>
            ))}
            {!stats.payment_breakdown.filter(b => b.method_name).length && (
              <div style={{ fontSize: "12px", color: "#ccc" }}>Sin datos</div>
            )}
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

        <div style={{ marginLeft: "auto", display: "flex", gap: "8px", alignItems: "center" }}>
          <button onClick={() => setViewMode("cards")}
            style={{ padding: "6px 12px", borderRadius: "8px", border: "none", background: viewMode === "cards" ? "#1a1a2e" : "#e0e0e0", color: viewMode === "cards" ? "#fff" : "#333", cursor: "pointer", fontSize: "13px" }}>
            ▦
          </button>
          <button onClick={() => setViewMode("list")}
            style={{ padding: "6px 12px", borderRadius: "8px", border: "none", background: viewMode === "list" ? "#1a1a2e" : "#e0e0e0", color: viewMode === "list" ? "#fff" : "#333", cursor: "pointer", fontSize: "13px" }}>
            ☰
          </button>
          <button onClick={() => setShowNew(true)}
            style={{ padding: "8px 16px", borderRadius: "8px", border: "none", background: "#27ae60", color: "#fff", cursor: "pointer", fontSize: "13px", fontWeight: 700 }}>
            ➕ Nueva Venta
          </button>
          <button onClick={handleExportExcel} style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid #ddd", background: "#fff", color: "#1a1a2e", cursor: "pointer", fontSize: "13px", fontWeight: 700 }}>📥 Excel</button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "12px", flexWrap: "wrap" }}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar..."
          style={{ flex: 1, minWidth: "160px", padding: "8px 12px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "13px" }} />
        <select value={filterChannel} onChange={e => setFilterChannel(e.target.value)}
          style={{ padding: "8px 10px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "13px", minWidth: "120px" }}>
          <option value="">Canal: Todos</option>
          {saleChannels.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          style={{ padding: "8px 10px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "13px", minWidth: "120px" }}>
          <option value="">Estado: Todos</option>
          {orderStatuses.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
        </select>
        <select value={filterPayment} onChange={e => setFilterPayment(e.target.value)}
          style={{ padding: "8px 10px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "13px", minWidth: "120px" }}>
          <option value="">Pago: Todos</option>
          {paymentStatuses.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
        </select>
      </div>

      {loading ? <Loading /> : filtered.length === 0 ? (
        <Empty message="Sin ventas registradas" />
      ) : viewMode === "cards" ? (
        <div style={{ display: "grid", gap: "10px" }}>
          {filtered.map(o => (
            <Card key={o.id}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px", flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 800, fontSize: "14px", color: "#1a1a2e" }}>{o.order_number}</span>
                    {o.sale_channel_name && (
                      <span style={{ fontSize: "11px", background: "#f0f0f0", padding: "2px 6px", borderRadius: "4px", color: "#666" }}>
                        {o.sale_channel_name}
                      </span>
                    )}
                    {o.seller_name && (
                      <span style={{ fontSize: "11px", color: "#888" }}>👤 {o.seller_name}</span>
                    )}
                  </div>
                  <div style={{ fontSize: "12px", color: "#888", marginBottom: "6px" }}>
                    {o.contact_name || "Sin cliente"} · {new Date(o.created_at).toLocaleDateString("es-AR")}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                    <span style={{ fontSize: "17px", fontWeight: 800, color: "#1a1a2e" }}>
                      ${Number(o.total).toLocaleString("es-AR")}
                    </span>
                    {o.payment_paid > 0 && Number(o.payment_paid) < Number(o.total) && (
                      <span style={{ fontSize: "12px", color: "#f39c12" }}>
                        · ${Number(o.payment_paid).toLocaleString("es-AR")} cobrado
                        <span style={{ color: "#e74c3c" }}> (resta ${Number(o.total - o.payment_paid).toLocaleString("es-AR")})</span>
                      </span>
                    )}
                    <span style={{ fontSize: "11px", color: "#aaa" }}>({itemCount(o)} items)</span>
                  </div>
                  <div style={{ display: "flex", gap: "6px", marginTop: "6px", flexWrap: "wrap" }}>
                    {o.order_status_name && (
                      <Badge color={o.order_status_color || "#888"}>{o.order_status_name}</Badge>
                    )}
                    {o.payment_status_name && (
                      <Badge color={o.payment_status_color || "#888"}>{o.payment_status_name}</Badge>
                    )}
                  </div>
                  {o.items?.length > 0 && (
                    <div style={{ marginTop: "8px", fontSize: "12px", color: "#666", display: "flex", flexDirection: "column", gap: "3px" }}>
                      {o.items.slice(0, 3).map((item: any, idx: number) => (
                        <div key={idx}>• {Number(item.quantity)} × {item.product_name}</div>
                      ))}
                      {o.items.length > 3 && <div style={{ color: "#999" }}>+ {o.items.length - 3} ítems más</div>}
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", alignItems: "flex-end" }}>
                  <div style={{ display: "flex", gap: "4px" }}>
                    <button onClick={() => setDetailId(o.id)} title="Ver detalle"
                      style={{ padding: "5px 8px", borderRadius: "6px", border: "1px solid #ddd", background: "#fff", cursor: "pointer", fontSize: "12px" }}>
                      👁️
                    </button>
                    {o.factura_id ? (
                      <>
                        <button title={`Facturada${o.factura_cae ? ` · CAE ${o.factura_cae}` : ''}`} disabled style={invoiceButtonStyle(true)}>✅🧾</button>
                        {o.nc_id ? <button title={`Factura anulada con NC${o.nc_cae ? ` · CAE ${o.nc_cae}` : ''}`} disabled style={creditNoteButtonStyle(true)}>✅↩️</button> : <button onClick={() => handleEmitirNC(o)} disabled={creditNoteId === o.id} title="Anular factura / emitir Nota de Crédito" style={creditNoteButtonStyle(false)}>{creditNoteId === o.id ? "..." : "↩️"}</button>}
                      </>
                    ) : (
                      <button onClick={() => handleFacturar(o)} disabled={invoicingId === o.id} title="Facturar electrónicamente" style={invoiceButtonStyle(false)}>
                        {invoicingId === o.id ? "..." : "🧾"}
                      </button>
                    )}
                    <button onClick={() => openStatusModal(o.id)} title="Editar estado"
                      style={{ padding: "5px 8px", borderRadius: "6px", border: "1px solid #ddd", background: "#fff", cursor: "pointer", fontSize: "12px" }}>
                      🚚
                    </button>
                    {o.order_status_name?.toLowerCase() === "pedido" && (
                      <button onClick={() => startProduction(o.id)} title="Iniciar producción"
                        style={{ padding: "5px 8px", borderRadius: "6px", border: "1px solid #6c63ff", background: "#f3f0ff", cursor: "pointer", fontSize: "12px" }}>
                        🏗️
                      </button>
                    )}
                    {o.order_status_name?.toLowerCase() !== "entregado" && (
                      <button onClick={() => markFinalized(o.id)} title="Marcar finalizado"
                        style={{ padding: "5px 8px", borderRadius: "6px", border: "1px solid #27ae60", background: "#f0fff4", cursor: "pointer", fontSize: "12px" }}>
                        ✅
                      </button>
                    )}
                    {o.factura_id && (
                      <button onClick={() => downloadInvoicePdf(o.factura_id, o.order_number + "-factura")} title="Descargar PDF factura"
                        style={{ padding: "5px 8px", borderRadius: "6px", border: "1px solid #2563eb", background: "#f0f5ff", cursor: "pointer", fontSize: "12px", color: "#2563eb" }}>
                        📄 PDF
                      </button>
                    )}
                    <button onClick={() => handleDelete(o.id, o.order_number)} title="Eliminar"
                      style={{ padding: "5px 8px", borderRadius: "6px", border: "1px solid #ddd", background: "#fff", cursor: "pointer", fontSize: "12px", color: "#e74c3c" }}>
                      🗑️
                    </button>
                  </div>
                  {pendingAmount(o) > 0 && Number(o.payment_paid) > 0 && (
                    <div style={{ fontSize: "11px", color: "#f39c12", textAlign: "right" }}>
                      $ {pendingAmount(o).toLocaleString("es-AR")} pend.
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr style={{ background: "#f8f8f8" }}>
                <th style={{ padding: "8px", textAlign: "left", fontWeight: 700 }}>#</th>
                <th style={{ padding: "8px", textAlign: "left", fontWeight: 700 }}>Cliente</th>
                <th style={{ padding: "8px", textAlign: "left", fontWeight: 700 }}>Fecha</th>
                <th style={{ padding: "8px", textAlign: "left", fontWeight: 700 }}>Vendedor</th>
                <th style={{ padding: "8px", textAlign: "left", fontWeight: 700 }}>Canal</th>
                <th style={{ padding: "8px", textAlign: "right", fontWeight: 700 }}>Total</th>
                <th style={{ padding: "8px", textAlign: "left", fontWeight: 700 }}>Pago</th>
                <th style={{ padding: "8px", textAlign: "left", fontWeight: 700 }}>Estado</th>
                <th style={{ padding: "8px", textAlign: "center", fontWeight: 700 }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(o => (
                <tr key={o.id} style={{ borderBottom: "1px solid #f0" }}>
                  <td style={{ padding: "8px", fontWeight: 700 }}>{o.order_number}</td>
                  <td style={{ padding: "8px" }}>{o.contact_name || "—"}</td>
                  <td style={{ padding: "8px" }}>{new Date(o.created_at).toLocaleDateString("es-AR")}</td>
                  <td style={{ padding: "8px", color: "#666" }}>{o.seller_name || "—"}</td>
                  <td style={{ padding: "8px", color: "#666" }}>{o.sale_channel_name || "—"}</td>
                  <td style={{ padding: "8px", textAlign: "right", fontWeight: 700 }}>${Number(o.total).toLocaleString("es-AR")}</td>
                  <td style={{ padding: "8px" }}>
                    {o.payment_status_name && <Badge color={o.payment_status_color || "#888"}>{o.payment_status_name}</Badge>}
                  </td>
                  <td style={{ padding: "8px" }}>
                    {o.order_status_name && <Badge color={o.order_status_color || "#888"}>{o.order_status_name}</Badge>}
                  </td>
                  <td style={{ padding: "8px", textAlign: "center" }}>
                    <button onClick={() => setDetailId(o.id)} title="Ver detalle" style={{ background: "none", border: "none", cursor: "pointer", fontSize: "12px", padding: "2px 4px" }}>👁️</button>
                    {o.factura_id ? <><button title={`Facturada${o.factura_cae ? ` · CAE ${o.factura_cae}` : ''}`} disabled style={{ background: "none", border: "none", cursor: "default", fontSize: "12px", padding: "2px 4px", color: "#27ae60" }}>✅🧾</button>{o.nc_id ? <button title={`Factura anulada con NC${o.nc_cae ? ` · CAE ${o.nc_cae}` : ''}`} disabled style={{ background: "none", border: "none", cursor: "default", fontSize: "12px", padding: "2px 4px", color: "#d35400" }}>✅↩️</button> : <button onClick={() => handleEmitirNC(o)} disabled={creditNoteId === o.id} title="Anular factura / emitir Nota de Crédito" style={{ background: "none", border: "none", cursor: creditNoteId === o.id ? "wait" : "pointer", fontSize: "12px", padding: "2px 4px", color: "#d35400" }}>{creditNoteId === o.id ? "..." : "↩️"}</button>}</> : <button onClick={() => handleFacturar(o)} disabled={invoicingId === o.id} title="Facturar electrónicamente" style={{ background: "none", border: "none", cursor: invoicingId === o.id ? "wait" : "pointer", fontSize: "12px", padding: "2px 4px", color: "#8e44ad" }}>{invoicingId === o.id ? "..." : "🧾"}</button>}
                    <button onClick={() => openStatusModal(o.id)} title="Editar estado" style={{ background: "none", border: "none", cursor: "pointer", fontSize: "12px", padding: "2px 4px" }}>🚚</button>
                    {o.order_status_name?.toLowerCase() !== "entregado" && <button onClick={() => markFinalized(o.id)} title="Marcar finalizado" style={{ background: "none", border: "none", cursor: "pointer", fontSize: "12px", padding: "2px 4px", color: "#27ae60" }}>✅</button>}
                    {o.order_status_name?.toLowerCase() === "pedido" && <button onClick={() => startProduction(o.id)} title="Iniciar producción" style={{ background: "none", border: "none", cursor: "pointer", fontSize: "12px", padding: "2px 4px", color: "#6c63ff" }}>🏗️</button>}
                    {o.factura_id && <button onClick={() => downloadInvoicePdf(o.factura_id!, o.order_number + "-factura")} title="Descargar PDF factura" style={{ background: "none", border: "none", cursor: "pointer", fontSize: "12px", padding: "2px 4px", color: "#2563eb" }}>📄</button>}
                    <button onClick={() => handleDelete(o.id, o.order_number)} title="Eliminar" style={{ background: "none", border: "none", cursor: "pointer", fontSize: "12px", padding: "2px 4px", color: "#e74c3c" }}>🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modals */}
      {detailId && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}
          onClick={e => e.target === e.currentTarget && setDetailId(null)}>
          <OrderDetailReadOnly orderId={detailId} onClose={() => setDetailId(null)} onInvoiced={load} onCreditNote={load} />
        </div>
      )}

      {showNew && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}
          onClick={e => e.target === e.currentTarget && setShowNew(false)}>
          <NewSaleModal
            saleChannels={saleChannels}
            orderStatuses={orderStatuses}
            paymentStatuses={paymentStatuses}
            onClose={() => setShowNew(false)}
            onCreated={handleCreated}
          />
        </div>
      )}

      {/* Status edit modal */}
      {showStatusModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }} onClick={e => { if (e.target === e.currentTarget) setShowStatusModal(false); }}>
          <div style={{ background: "#fff", borderRadius: "16px", padding: "24px", width: "100%", maxWidth: "380px" }}>
            <h3 style={{ margin: "0 0 16px", fontSize: "18px", fontWeight: 800 }}>🚚 Cambiar Estado</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px" }}>
              {orderStatuses.map(s => (
                <div key={s.id} onClick={() => doSaveStatus(s.id)}
                  style={{ display: "flex", alignItems: "center", gap: "10px", padding: "12px 16px", borderRadius: "10px", border: "2px solid #e0e0e0", cursor: "pointer" }}>
                  <span style={{ width: "14px", height: "14px", borderRadius: "50%", background: s.color || "#888", flexShrink: 0 }} />
                  <span style={{ fontWeight: 600, fontSize: "14px" }}>{s.name}</span>
                </div>
              ))}
            </div>
            <button onClick={() => setShowStatusModal(false)} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #ddd", background: "#fff", cursor: "pointer", fontSize: "14px" }}>Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}
