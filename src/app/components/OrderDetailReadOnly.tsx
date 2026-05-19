"use client";

import { useEffect, useState } from "react";
import { fetchJson, postJson } from "../lib";
import type { OrderDetail, OrderPayment } from "../types";

type Props = {
  orderId: number;
  onClose: () => void;
  onInvoiced?: () => void;
  onCreditNote?: () => void;
};

export default function OrderDetailReadOnly({ orderId, onClose, onInvoiced, onCreditNote }: Props) {
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mpLink, setMpLink] = useState("");
  const [mpLoading, setMpLoading] = useState(false);
  const [mpError, setMpError] = useState("");
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [creditNoteLoading, setCreditNoteLoading] = useState(false);
  const [invoiceError, setInvoiceError] = useState("");
  const [invoiceMsg, setInvoiceMsg] = useState("");

  useEffect(() => {
    fetchJson<OrderDetail>("/orders/" + orderId)
      .then(setOrder)
      .catch(() => setError("No se pudo cargar la venta"))
      .finally(() => setLoading(false));
  }, [orderId]);

  async function refreshOrder() {
    const updated = await fetchJson<OrderDetail>("/orders/" + orderId);
    setOrder(updated);
  }

  async function handleEmitirNC() {
    if (!order?.factura_id || order.nc_id) return;
    if (!confirm(`¿Anular fiscalmente la factura de ${order.order_number}?

Se emitirá una Nota de Crédito por el total de la factura.`)) return;
    setCreditNoteLoading(true); setInvoiceError(""); setInvoiceMsg("");
    try {
      const result: any = await postJson('/afip/notas-credito', { invoice_id: order.factura_id, motivo: `Anulación factura de ${order.order_number}` });
      if (result?.success) {
        setInvoiceMsg(`Nota de Crédito emitida · CAE ${result.cae || '—'}`);
        await refreshOrder();
        onCreditNote?.();
      } else {
        setInvoiceError(result?.error || result?.resultado || 'ARCA rechazó la Nota de Crédito');
      }
    } catch (e: any) {
      setInvoiceError(e?.body?.error || e?.message || 'No se pudo emitir la Nota de Crédito');
      if (e?.status === 409) { await refreshOrder(); onCreditNote?.(); }
    } finally {
      setCreditNoteLoading(false);
    }
  }

  async function handleFacturar() {
    if (!order || order.factura_id) return;
    if (!confirm(`¿Emitir factura electrónica para ${order.order_number}?`)) return;
    setInvoiceLoading(true); setInvoiceError(""); setInvoiceMsg("");
    try {
      const result: any = await postJson('/afip/facturar', { order_id: orderId });
      if (result?.success) {
        setInvoiceMsg(`Factura emitida · CAE ${result.cae || '—'}`);
        await refreshOrder();
        onInvoiced?.();
      } else {
        setInvoiceError(result?.error || result?.resultado || 'ARCA rechazó la factura');
      }
    } catch (e: any) {
      setInvoiceError(e?.body?.error || e?.message || 'No se pudo facturar');
      if (e?.status === 409) {
        await refreshOrder();
        onInvoiced?.();
      }
    } finally {
      setInvoiceLoading(false);
    }
  }

  async function handleMPPay() {
    setMpLoading(true); setMpError(""); setMpLink("");
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/integrations/mercadopago/preference", {
        method: "POST",
        headers: { "Authorization": "Bearer " + token, "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: orderId,
          title: order?.order_number || "Venta #" + orderId,
          amount: Math.max(Number(remaining), 0),
          description: "Pago de " + (order?.order_number || "venta #" + orderId),
        }),
      });
      const data = await res.json();
      if (data.error) { setMpError(data.error); return; }
      setMpLink(data.init_point);
      window.open(data.init_point, "_blank");
    } catch (e: any) {
      setMpError(e.message || "Error al generar link");
    } finally {
      setMpLoading(false);
    }
  }

  if (loading) return (
    <div style={{ background: "#fff", borderRadius: "16px", padding: "40px", textAlign: "center", width: "100%", maxWidth: "600px" }}>
      <div style={{ fontSize: "14px", color: "#888" }}>Cargando...</div>
    </div>
  );

  if (error || !order) return (
    <div style={{ background: "#fff", borderRadius: "16px", padding: "40px", textAlign: "center", width: "100%", maxWidth: "600px" }}>
      <p style={{ color: "#e74c3c" }}>{error}</p>
      <button onClick={onClose} style={{ padding: "8px 20px", borderRadius: "8px", border: "none", background: "#333", color: "#fff", cursor: "pointer" }}>Cerrar</button>
    </div>
  );

  const remaining = Number(order.total) - Number(order.payment_paid || 0);

  return (
    <div style={{ background: "#fff", borderRadius: "16px", padding: "24px", width: "100%", maxWidth: "680px", maxHeight: "90vh", overflowY: "auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 800 }}>{order.order_number}</h2>
          <div style={{ fontSize: "12px", color: "#888", marginTop: "2px" }}>
            {order.contact_name || "Sin cliente"}
            {order.seller_name && ` · Vendedor: ${order.seller_name}`}
          </div>
          <div style={{ fontSize: "12px", color: "#888" }}>
            {new Date(order.created_at).toLocaleDateString("es-AR", { day: "2-digit", month: "long", year: "numeric" })}
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {order.order_status_name && (
            <span style={{ padding: "4px 10px", borderRadius: "20px", background: order.order_status_color || "#888", color: "#fff", fontSize: "12px", fontWeight: 700 }}>
              {order.order_status_name}
            </span>
          )}
          {order.payment_status_name && (
            <span style={{ padding: "4px 10px", borderRadius: "20px", background: order.payment_status_color || "#888", color: "#fff", fontSize: "12px", fontWeight: 700 }}>
              {order.payment_status_name}
            </span>
          )}
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", padding: "4px 8px" }}>✕</button>
        </div>
      </div>

      {/* Info adicional */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
        {order.sale_channel_name && (
          <span style={{ padding: "4px 10px", borderRadius: "6px", background: "#f0f0f0", fontSize: "12px", color: "#666" }}>
            📡 {order.sale_channel_name}
          </span>
        )}
        {order.payment_method_name && (
          <span style={{ padding: "4px 10px", borderRadius: "6px", background: "#f0f0f0", fontSize: "12px", color: "#666" }}>
            💳 {order.payment_method_name}
          </span>
        )}
        {order.factura_id && (
          <span style={{ padding: "4px 10px", borderRadius: "6px", background: "#eafaf1", fontSize: "12px", color: "#27ae60", fontWeight: 700 }}>
            ✅ Facturada{order.factura_cae ? ` · CAE ${order.factura_cae}` : ""}
          </span>
        )}
        {order.nc_id && (
          <span style={{ padding: "4px 10px", borderRadius: "6px", background: "#fff7e6", fontSize: "12px", color: "#d35400", fontWeight: 700 }}>
            ↩️ Factura anulada con NC{order.nc_cae ? ` · CAE ${order.nc_cae}` : ""}
          </span>
        )}
      </div>

      {/* Resumen financiero */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "8px", marginBottom: "16px" }}>
        <div style={{ background: "#f8f8f8", borderRadius: "10px", padding: "10px", textAlign: "center" }}>
          <div style={{ fontSize: "11px", color: "#888", marginBottom: "2px" }}>Subtotal</div>
          <div style={{ fontWeight: 800, fontSize: "15px" }}>${Number(order.subtotal).toLocaleString("es-AR")}</div>
        </div>
        {Number(order.discount_value) > 0 && (
          <div style={{ background: "#fde8e8", borderRadius: "10px", padding: "10px", textAlign: "center" }}>
            <div style={{ fontSize: "11px", color: "#888", marginBottom: "2px" }}>Descuento</div>
            <div style={{ fontWeight: 800, fontSize: "15px", color: "#e74c3c" }}>
              -{order.discount_type === "percent" ? order.discount_value + "%" : "$" + Number(order.discount_value).toLocaleString("es-AR")}
            </div>
          </div>
        )}
        {Number(order.delivery_fee) > 0 && (
          <div style={{ background: "#f8f8f8", borderRadius: "10px", padding: "10px", textAlign: "center" }}>
            <div style={{ fontSize: "11px", color: "#888", marginBottom: "2px" }}>Envío</div>
            <div style={{ fontWeight: 800, fontSize: "15px" }}>${Number(order.delivery_fee).toLocaleString("es-AR")}</div>
          </div>
        )}
        <div style={{ background: "#1a1a2e", borderRadius: "10px", padding: "10px", textAlign: "center" }}>
          <div style={{ fontSize: "11px", color: "#aaa", marginBottom: "2px" }}>Total</div>
          <div style={{ fontWeight: 800, fontSize: "15px", color: "#fff" }}>${Number(order.total).toLocaleString("es-AR")}</div>
        </div>
      </div>

      {/* Pagos */}
      <div style={{ background: "#f8f8f8", borderRadius: "10px", padding: "12px", marginBottom: "16px" }}>
        <div style={{ fontWeight: 700, fontSize: "13px", marginBottom: "6px" }}>💰 Pagos</div>
        {order.payments && order.payments.length > 0 ? (
          <div>
            {order.payments.map((p: OrderPayment) => (
              <div key={p.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #e0e0e0", fontSize: "13px" }}>
                <span>
                  <b>${Number(p.amount).toLocaleString("es-AR")}</b>
                  {p.payment_method_name && <span style={{ color: "#888", marginLeft: "6px" }}>{p.payment_method_name}</span>}
                  <span style={{ color: "#aaa", fontSize: "11px", marginLeft: "6px" }}>
                    {new Date(p.paid_at).toLocaleDateString("es-AR")}
                  </span>
                </span>
              </div>
            ))}
          </div>
        ) : <div style={{ fontSize: "12px", color: "#999" }}>Sin pagos registrados</div>}

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px", fontSize: "13px", fontWeight: 700 }}>
          <span>Cobrado: <span style={{ color: "#27ae60" }}>${Number(order.payment_paid || 0).toLocaleString("es-AR")}</span></span>
          {remaining > 0 && <span style={{ color: "#f39c12" }}>Pendiente: ${remaining.toLocaleString("es-AR")}</span>}
          {remaining <= 0 && <span style={{ color: "#27ae60" }}>✓ Cancelado</span>}
        </div>
      </div>

      {/* Items */}
      <div style={{ marginBottom: "16px" }}>
        <div style={{ fontWeight: 700, fontSize: "13px", marginBottom: "6px" }}>📦 Items</div>
        {order.items && order.items.length > 0 ? (
          <div style={{ border: "1px solid #eee", borderRadius: "8px", overflow: "hidden" }}>
            {order.items.map((item: any, idx: number) => (
              <div key={idx} style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", borderBottom: idx < order.items.length - 1 ? "1px solid #f0" : "none", fontSize: "13px" }}>
                <span>{item.quantity} × {item.product_name}{item.is_service ? <span style={{background:'#e8f5e9',color:'#2e7d32',padding:'1px 6px',borderRadius:'4px',fontSize:'11px',fontWeight:700,marginLeft:'6px'}}>Servicio</span> : null}{item.attribute_value_name ? <span style={{background:'#e8f0fe',color:'#1a56db',padding:'1px 6px',borderRadius:'4px',fontSize:'11px',fontWeight:700,marginLeft:'6px'}}>{item.attribute_value_name}</span> : null}{item.fulfillment_status ? <span style={{background:item.fulfillment_status === 'delivered' ? '#e8f5e9' : '#fff4e5', color:item.fulfillment_status === 'delivered' ? '#2e7d32' : '#b26a00', padding:'1px 6px',borderRadius:'4px',fontSize:'11px',fontWeight:700,marginLeft:'6px'}}>{item.fulfillment_status === 'delivered' ? 'Entregado' : 'Pendiente'}</span> : null}{item.attribute_allocations ? <span style={{color:'#888',fontSize:'11px',marginLeft:'4px'}}>({item.attribute_allocations.map(a=>a.quantity+'x'+a.attribute_value_name).join(', ')})</span> : null}</span>
                <span style={{ fontWeight: 700 }}>${Number(item.subtotal).toLocaleString("es-AR")}</span>
              </div>
            ))}
          </div>
        ) : <div style={{ fontSize: "12px", color: "#999" }}>Sin items</div>}
      </div>

      {/* Delivery */}
      {order.delivery && (order.delivery.address || order.delivery.scheduled_date) && (
        <div style={{ background: "#f8f8f8", borderRadius: "8px", padding: "12px", marginBottom: "16px" }}>
          <div style={{ fontWeight: 700, fontSize: "13px", marginBottom: "6px" }}>🚚 Entrega</div>
          <div style={{ fontSize: "13px" }}>
            {order.delivery.address && <div>📍 {order.delivery.address}{order.delivery.location && `, ${order.delivery.location}`}</div>}
            {order.delivery.scheduled_date && (
              <div style={{ marginTop: "4px" }}>📅 {new Date(order.delivery.scheduled_date).toLocaleDateString("es-AR")}
                {order.delivery.scheduled_time && ` · ${order.delivery.scheduled_time}`}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Notas */}
      {order.notes && (
        <div style={{ fontSize: "13px", color: "#666", fontStyle: "italic", padding: "8px 0", borderTop: "1px solid #eee" }}>
          {order.notes}
        </div>
      )}

      <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
        {remaining > 0 && (
          <button
            onClick={() => { window.location.href = `/cobros?order_id=${order.id}`; }}
            style={{ flex: 2, padding: "10px", borderRadius: "8px", border: "none", background: "#27ae60", color: "#fff", cursor: "pointer", fontSize: "14px", fontWeight: 700 }}
          >
            💰 Cobrar NV
          </button>
        )}
        {remaining > 0 && (
          <button
            onClick={handleMPPay}
            disabled={mpLoading}
            style={{ flex: 2, padding: "10px", borderRadius: "8px", border: "2px solid #009ee3", background: mpLoading ? "#e8f4fd" : "#e8f4fd", color: "#009ee3", cursor: "pointer", fontSize: "14px", fontWeight: 700, opacity: mpLoading ? 0.7 : 1 }}
          >
            {mpLoading ? "Generando..." : "🧾 Cobrar con MP"}
          </button>
        )}
        {mpLink && (
          <div style={{ marginTop: "8px", padding: "10px 14px", background: "#e8f4fd", borderRadius: "8px", border: "1px solid #009ee3", fontSize: "13px", textAlign: "center" }}>
            <div style={{ fontWeight: 700, color: "#009ee3", marginBottom: "4px" }}>✅ Link de pago generado</div>
            <a href={mpLink} target="_blank" rel="noopener noreferrer" style={{ color: "#009ee3", wordBreak: "break-all", fontSize: "12px" }}>{mpLink}</a>
            <button onClick={() => { navigator.clipboard.writeText(mpLink); }} style={{ display: "block", margin: "8px auto 0", padding: "6px 16px", borderRadius: "6px", border: "1px solid #009ee3", background: "#fff", color: "#009ee3", cursor: "pointer", fontSize: "12px", fontWeight: 700 }}>
              📋 Copiar link
            </button>
          </div>
        )}
        {mpError && <div style={{ marginTop: "8px", padding: "8px 12px", background: "#fee", borderRadius: "8px", color: "#c00", fontSize: "12px" }}>{mpError}</div>}
        {!order.factura_id && (
          <button
            onClick={handleFacturar}
            disabled={invoiceLoading}
            style={{ flex: 2, padding: "10px", borderRadius: "8px", border: "2px solid #8e44ad", background: "#fbf8ff", color: "#8e44ad", cursor: invoiceLoading ? "wait" : "pointer", fontSize: "14px", fontWeight: 700, opacity: invoiceLoading ? 0.7 : 1 }}
          >
            {invoiceLoading ? "Facturando..." : "🧾 Facturar NV"}
          </button>
        )}
        {order.factura_id && (
          <button disabled style={{ flex: 2, padding: "10px", borderRadius: "8px", border: "none", background: "#eafaf1", color: "#27ae60", cursor: "default", fontSize: "14px", fontWeight: 700 }}>
            ✅ Facturada
          </button>
        )}
        {order.factura_id && !order.nc_id && (
          <button onClick={handleEmitirNC} disabled={creditNoteLoading} style={{ flex: 2, padding: "10px", borderRadius: "8px", border: "2px solid #e67e22", background: "#fff7e6", color: "#d35400", cursor: creditNoteLoading ? "wait" : "pointer", fontSize: "14px", fontWeight: 700, opacity: creditNoteLoading ? 0.7 : 1 }}>
            {creditNoteLoading ? "Anulando..." : "↩️ Anular factura / emitir NC"}
          </button>
        )}
        {order.nc_id && (
          <button disabled style={{ flex: 2, padding: "10px", borderRadius: "8px", border: "none", background: "#fff7e6", color: "#d35400", cursor: "default", fontSize: "14px", fontWeight: 700 }}>
            ✅ NC emitida
          </button>
        )}
        <button onClick={onClose}
          style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "none", background: "#1a1a2e", color: "#fff", cursor: "pointer", fontSize: "14px", fontWeight: 700 }}>
          Cerrar
        </button>
      </div>
      {invoiceMsg && <div style={{ marginTop: "8px", padding: "8px 12px", background: "#eafaf1", borderRadius: "8px", color: "#1e8449", fontSize: "12px", fontWeight: 700 }}>{invoiceMsg}</div>}
      {invoiceError && <div style={{ marginTop: "8px", padding: "8px 12px", background: "#fee", borderRadius: "8px", color: "#c00", fontSize: "12px" }}>{invoiceError}</div>}
    </div>
  );
}
