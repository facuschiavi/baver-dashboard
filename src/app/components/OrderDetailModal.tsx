"use client";

import { useEffect, useState } from "react";
import { fetchJson, postJson, putJson, deleteJson, money } from "../lib";
import { Loading } from "./shared/UI";
import type { OrderDetail, OrderPayment } from "../types";

type SaleChannel = { id: number; name: string; sort_order: number };
type OrderStatus = { id: number; name: string; color: string; sort_order: number };
type PaymentStatus = { id: number; name: string; color: string; sort_order: number };

type Props = {
  orderId: number;
  orderStatuses: OrderStatus[];
  paymentStatuses: PaymentStatus[];
  saleChannels: SaleChannel[];
  onClose: () => void;
  onUpdated: () => void;
};

export default function OrderDetailModal({
  orderId, orderStatuses, paymentStatuses, saleChannels, onClose, onUpdated
}: Props) {
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const [orderStatusId, setOrderStatusId] = useState("");
  const [paymentStatusId, setPaymentStatusId] = useState("");
  const [showPayForm, setShowPayForm] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [payMethodId, setPayMethodId] = useState("");

  useEffect(() => {
    fetchJson<OrderDetail>("/orders/" + orderId)
      .then(o => {
        setOrder(o);
        setOrderStatusId(String(o.order_status_id || ""));
        setPaymentStatusId(String(o.payment_status_id || ""));
      })
      .catch(() => setError("No se pudo cargar la venta"))
      .finally(() => setLoading(false));
  }, [orderId]);

  async function saveStatus() {
    if (!order) return;
    setSaving(true);
    try {
      await putJson("/orders/" + orderId, {
        order_status_id: orderStatusId ? Number(orderStatusId) : undefined,
        payment_status_id: paymentStatusId ? Number(paymentStatusId) : undefined,
      });
      const updated = await fetchJson<OrderDetail>("/orders/" + orderId);
      setOrder(updated);
      onUpdated();
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  }

  async function registerPayment() {
    if (!order || !payAmount) return;
    setSaving(true);
    try {
      await postJson("/orders/" + orderId + "/payments", {
        amount: Number(payAmount),
        payment_method_id: payMethodId ? Number(payMethodId) : null,
      });
      setShowPayForm(false);
      setPayAmount("");
      const updated = await fetchJson<OrderDetail>("/orders/" + orderId);
      setOrder(updated);
      onUpdated();
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  }

  async function deletePayment(paymentId: number) {
    if (!confirm("¿Eliminar este pago?")) return;
    try {
      await deleteJson("/orders/" + orderId + "/payments/" + paymentId);
      const updated = await fetchJson<OrderDetail>("/orders/" + orderId);
      setOrder(updated);
      onUpdated();
    } catch (e) { console.error(e); }
  }

  if (loading) return (
    <div style={{ background: "#fff", borderRadius: "16px", padding: "40px", textAlign: "center", width: "100%", maxWidth: "600px" }}>
      <Loading />
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
    <div style={{ background: "#fff", borderRadius: "16px", padding: "24px", width: "100%", maxWidth: "700px", maxHeight: "90vh", overflowY: "auto" }}>
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
        <button onClick={onClose} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", padding: "4px 8px" }}>✕</button>
      </div>

      {/* Tags de estado */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
        <select value={orderStatusId} onChange={e => setOrderStatusId(e.target.value)}
          style={{ padding: "6px 10px", borderRadius: "8px", border: "2px solid " + (orderStatuses.find(s => String(s.id) === orderStatusId)?.color || "#ddd"), fontSize: "13px", fontWeight: 700, background: "#fff", cursor: "pointer" }}>
          {orderStatuses.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select value={paymentStatusId} onChange={e => setPaymentStatusId(e.target.value)}
          style={{ padding: "6px 10px", borderRadius: "8px", border: "2px solid " + (paymentStatuses.find(s => String(s.id) === paymentStatusId)?.color || "#ddd"), fontSize: "13px", fontWeight: 700, background: "#fff", cursor: "pointer" }}>
          {paymentStatuses.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        {order.sale_channel_name && (
          <span style={{ padding: "6px 10px", borderRadius: "8px", background: "#f0f0f0", fontSize: "13px", color: "#666" }}>
            📍 {order.sale_channel_name}
          </span>
        )}
        <button onClick={saveStatus} disabled={saving}
          style={{ padding: "6px 14px", borderRadius: "8px", border: "none", background: "#1a1a2e", color: "#fff", cursor: saving ? "not-allowed" : "pointer", fontSize: "13px", fontWeight: 700 }}>
          {saving ? "..." : "Guardar"}
        </button>
      </div>

      {/* Resumen financiero */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px", marginBottom: "16px" }}>
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

      {/* Pago */}
      <div style={{ background: "#f8f8f8", borderRadius: "10px", padding: "12px", marginBottom: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
          <span style={{ fontWeight: 700, fontSize: "13px" }}>💰 Pagos</span>
          <button onClick={() => { setShowPayForm(!showPayForm); setPayAmount(String(remaining > 0 ? remaining.toFixed(2) : "")); }}
            style={{ padding: "4px 12px", borderRadius: "6px", border: "none", background: "#27ae60", color: "#fff", cursor: "pointer", fontSize: "12px", fontWeight: 700 }}>
            + Registrar Pago
          </button>
        </div>
        {order.payments && order.payments.length > 0 ? (
          <div>
            {order.payments.map((p: OrderPayment) => (
              <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid #e0e0e0", fontSize: "13px" }}>
                <span>
                  <b>${Number(p.amount).toLocaleString("es-AR")}</b>
                  {p.payment_method_name && <span style={{ color: "#888", marginLeft: "6px" }}>{p.payment_method_name}</span>}
                  <span style={{ color: "#aaa", fontSize: "11px", marginLeft: "6px" }}>
                    {new Date(p.paid_at).toLocaleDateString("es-AR")}
                  </span>
                </span>
                <button onClick={() => deletePayment(p.id)} style={{ background: "none", border: "none", color: "#e74c3c", cursor: "pointer", fontSize: "12px", padding: "2px 6px" }}>✕</button>
              </div>
            ))}
          </div>
        ) : <div style={{ fontSize: "12px", color: "#999" }}>Sin pagos registrados</div>}

        {showPayForm && (
          <div style={{ display: "flex", gap: "8px", marginTop: "8px", alignItems: "center" }}>
            <input type="number" value={payAmount} min={0} step="0.01"
              onChange={e => setPayAmount(e.target.value)}
              placeholder="Monto"
              style={{ flex: 1, padding: "6px 10px", borderRadius: "6px", border: "1px solid #ddd", fontSize: "13px" }} />
            <select value={payMethodId} onChange={e => setPayMethodId(e.target.value)}
              style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid #ddd", fontSize: "13px" }}>
              <option value="">Método</option>
              <option value="1">Efectivo</option>
              <option value="2">Mercado Pago</option>
              <option value="3">Transferencia</option>
            </select>
            <button onClick={registerPayment} disabled={saving}
              style={{ padding: "6px 12px", borderRadius: "6px", border: "none", background: "#27ae60", color: "#fff", cursor: "pointer", fontSize: "13px" }}>
              {saving ? "..." : "OK"}
            </button>
            <button onClick={() => setShowPayForm(false)}
              style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid #ddd", background: "#fff", cursor: "pointer", fontSize: "13px" }}>
              Cancelar
            </button>
          </div>
        )}

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
                <span>{item.quantity} × {item.product_name}</span>
                <span style={{ fontWeight: 700 }}>${Number(item.subtotal).toLocaleString("es-AR")}</span>
              </div>
            ))}
          </div>
        ) : <div style={{ fontSize: "12px", color: "#999" }}>Sin items</div>}
      </div>

      {/* Delivery */}
      {order.delivery && (
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
    </div>
  );
}
