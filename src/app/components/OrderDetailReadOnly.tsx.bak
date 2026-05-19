"use client";

import { useEffect, useState } from "react";
import { fetchJson } from "../lib";
import type { OrderDetail, OrderPayment } from "../types";

type Props = {
  orderId: number;
  onClose: () => void;
};

export default function OrderDetailReadOnly({ orderId, onClose }: Props) {
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchJson<OrderDetail>("/orders/" + orderId)
      .then(setOrder)
      .catch(() => setError("No se pudo cargar la venta"))
      .finally(() => setLoading(false));
  }, [orderId]);

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
                <span>{item.quantity} × {item.product_name}{item.attribute_value_name ? <span style={{background:'#e8f0fe',color:'#1a56db',padding:'1px 6px',borderRadius:'4px',fontSize:'11px',fontWeight:700,marginLeft:'6px'}}>{item.attribute_value_name}</span> : null}{item.attribute_allocations ? <span style={{color:'#888',fontSize:'11px',marginLeft:'4px'}}>({item.attribute_allocations.map(a=>a.quantity+'x'+a.attribute_value_name).join(', ')})</span> : null}</span>
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
            onClick={() => { window.location.href = `/baver/cobros?order_id=${order.id}`; }}
            style={{ flex: 2, padding: "10px", borderRadius: "8px", border: "none", background: "#27ae60", color: "#fff", cursor: "pointer", fontSize: "14px", fontWeight: 700 }}
          >
            💰 Cobrar NV
          </button>
        )}
        <button onClick={onClose}
          style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "none", background: "#1a1a2e", color: "#fff", cursor: "pointer", fontSize: "14px", fontWeight: 700 }}>
          Cerrar
        </button>
      </div>
    </div>
  );
}
