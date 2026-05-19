"use client";

import { useEffect, useState } from "react";
import { fetchJson, postJson, putJson, deleteJson } from "../lib";
import type { OrderDetail, Product, OrderPayment } from "../types";

type SaleChannel = { id: number; name: string; sort_order: number };
type OrderStatus = { id: number; name: string; color: string; sort_order: number };
type PaymentStatus = { id: number; name: string; color: string; sort_order: number };
type PaymentMethod = { id: number; name: string };
type User = { id: number; name: string; username: string };

type ItemDraft = { product_id: number; product_name: string; quantity: number; unit_price: number; id?: number };

type Props = {
  orderId: number;
  saleChannels: SaleChannel[];
  orderStatuses: OrderStatus[];
  paymentStatuses: PaymentStatus[];
  onClose: () => void;
  onUpdated: () => void;
};

export default function EditSaleModal({ orderId, saleChannels, orderStatuses, paymentStatuses, onClose, onUpdated }: Props) {
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [productSearch, setProductSearch] = useState("");
  const [showProductDropdown, setShowProductDropdown] = useState(false);

  const [form, setForm] = useState({
    seller_id: "",
    sale_channel_id: "",
    order_status_id: "",
    payment_method_id: "",
    notes: "",
    delivery_address: "",
    delivery_location: "",
    scheduled_date: "",
    scheduled_time: "",
    delivery_fee: "0",
    discount_type: "",
    discount_value: "",
  });

  const [items, setItems] = useState<ItemDraft[]>([]);

  useEffect(() => {
    Promise.all([
      fetchJson<OrderDetail>("/orders/" + orderId),
      fetchJson<Product[]>("/products"),
      fetchJson<User[]>("/users"),
      fetchJson<PaymentMethod[]>("/payment-methods"),
    ]).then(([o, p, u, pm]) => {
      setOrder(o);
      setProducts(p);
      setUsers(u.filter((user: any) => user.is_active !== false));
      setPaymentMethods(pm);
      setForm({
        seller_id: String(o.seller_id || ""),
        sale_channel_id: String(o.sale_channel_id || ""),
        order_status_id: String(o.order_status_id || ""),
        payment_method_id: String(o.payment_method_id || ""),
        notes: o.notes || "",
        delivery_address: o.delivery?.address || "",
        delivery_location: o.delivery?.location || "",
        scheduled_date: o.delivery?.scheduled_date ? String(o.delivery.scheduled_date).split('T')[0] : "",
        scheduled_time: o.delivery?.scheduled_time || "",
        delivery_fee: String(o.delivery_fee || "0"),
        discount_type: o.discount_type || "",
        discount_value: String(o.discount_value || ""),
      });
      setItems(o.items.map((it: any) => ({
        id: it.id,
        product_id: it.product_id,
        product_name: it.product_name,
        quantity: it.quantity,
        unit_price: Number(it.unit_price),
      })));
    }).catch(console.error).finally(() => setLoading(false));
  }, [orderId]);

  const isLocalChannel = saleChannels.find(c => String(c.id) === form.sale_channel_id)?.name?.toLowerCase().includes("local");

  const filteredProducts = products.filter(pr =>
    (!productSearch || pr.name?.toLowerCase().includes(productSearch.toLowerCase())) &&
    pr.discontinued !== 1 &&
    !items.find(i => i.product_id === pr.id)
  );

  const subtotal = items.reduce((s, i) => s + i.quantity * i.unit_price, 0);
  let discountAmount = 0;
  if (form.discount_type === "percent" && Number(form.discount_value)) {
    discountAmount = subtotal * (Number(form.discount_value) / 100);
  } else if (form.discount_type === "fixed" && Number(form.discount_value)) {
    discountAmount = Number(form.discount_value);
  }
  const deliveryFee = isLocalChannel ? 0 : (Number(form.delivery_fee) || 0);
  const total = Math.max(0, subtotal - discountAmount + deliveryFee);
  const remaining = total - Number(order?.payment_paid || 0);

  function addProduct(p: Product) {
    // Call backend to add item (with stock deduction)
    postJson(`/orders/${orderId}/items`, {
      product_id: p.id,
      quantity: 1,
      unit_price: Number(p.price) || 0,
    }).then(() => {
      // Reload order to get updated items
      return fetchJson<OrderDetail>("/orders/" + orderId);
    }).then(updated => {
      setOrder(updated);
      setItems(updated.items.map((it: any) => ({
        id: it.id,
        product_id: it.product_id,
        product_name: it.product_name,
        quantity: it.quantity,
        unit_price: Number(it.unit_price),
      })));
      onUpdated();
    }).catch((e: any) => {
      alert(e?.response?.data?.error || "No se pudo agregar el producto");
    });
    setProductSearch("");
    setShowProductDropdown(false);
  }

  function updateItem(idx: number, field: keyof ItemDraft, value: any) {
    const item = items[idx];
    if (field === "quantity" || field === "unit_price") {
      // Call backend
      putJson(`/orders/${orderId}/items/${item.id}`, {
        quantity: field === "quantity" ? value : item.quantity,
        unit_price: field === "unit_price" ? value : item.unit_price,
      }).then(() => {
        return fetchJson<OrderDetail>("/orders/" + orderId);
      }).then(updated => {
        setOrder(updated);
        setItems(updated.items.map((it: any) => ({
          id: it.id, product_id: it.product_id, product_name: it.product_name,
          quantity: it.quantity, unit_price: Number(it.unit_price),
        })));
        onUpdated();
      }).catch((e: any) => {
        alert(e?.response?.data?.error || "No se pudo actualizar el item");
      });
    }
    setItems(items.map((it, i) => i === idx ? { ...it, [field]: value } : it));
  }

  function removeItem(idx: number) {
    const item = items[idx];
    if (!item.id) { setItems(items.filter((_, i) => i !== idx)); return; }
    deleteJson(`/orders/${orderId}/items/${item.id}`).then(() => {
      return fetchJson<OrderDetail>("/orders/" + orderId);
    }).then(updated => {
      setOrder(updated);
      setItems(updated.items.map((it: any) => ({
        id: it.id, product_id: it.product_id, product_name: it.product_name,
        quantity: it.quantity, unit_price: Number(it.unit_price),
      })));
      onUpdated();
    }).catch((e: any) => {
      alert(e?.response?.data?.error || "No se pudo eliminar el item");
    });
  }

  async function handleSave() {
    if (items.length === 0) { alert("La venta debe tener al menos un producto"); return; }
    setSaving(true);
    try {
      await putJson("/orders/" + orderId, {
        seller_id: form.seller_id ? Number(form.seller_id) : undefined,
        sale_channel_id: form.sale_channel_id ? Number(form.sale_channel_id) : undefined,
        order_status_id: form.order_status_id ? Number(form.order_status_id) : undefined,
        payment_method_id: form.payment_method_id ? Number(form.payment_method_id) : undefined,
        discount_type: form.discount_type || undefined,
        discount_value: form.discount_value ? Number(form.discount_value) : undefined,
        delivery_fee: deliveryFee,
        notes: form.notes || undefined,
      });
      onUpdated();
    } catch (e: any) {
      alert("Error: " + (e?.message || "No se pudo actualizar"));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return (
    <div style={{ background: "#fff", borderRadius: "16px", padding: "40px", textAlign: "center", width: "100%", maxWidth: "680px" }}>
      <div style={{ fontSize: "14px", color: "#888" }}>Cargando...</div>
    </div>
  );

  if (!order) return null;

  // Preview new payment status
  let previewPaymentStatus = order.payment_status_name;
  let previewPaymentColor = order.payment_status_color;
  if (remaining <= 0 && total > 0) {
    previewPaymentStatus = "Cobrado";
    previewPaymentColor = "#27ae60";
  } else if (remaining > 0 && remaining < total) {
    previewPaymentStatus = "Cobrado Parcial";
    previewPaymentColor = "#f39c12";
  } else if (total > 0) {
    previewPaymentStatus = "Impago";
    previewPaymentColor = "#e74c3c";
  }

  return (
    <div style={{ background: "#fff", borderRadius: "16px", padding: "24px", width: "100%", maxWidth: "720px", maxHeight: "90vh", overflowY: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 800 }}>✏️ Editar Venta — {order.order_number}</h2>
          <div style={{ fontSize: "12px", color: "#888", marginTop: "2px" }}>Cliente: <b>{order.contact_name}</b> (no editable)</div>
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", padding: "4px 8px" }}>✕</button>
      </div>

      {/* Preview de estado de pago */}
      {(remaining !== total - Number(order.payment_paid || 0)) && (
        <div style={{ background: "#fff3e0", border: "1px solid #f39c12", borderRadius: "8px", padding: "8px 12px", marginBottom: "12px", fontSize: "12px" }}>
          ⚠️ Al guardar, el estado de pago cambiará a:{" "}
          <b style={{ color: previewPaymentColor }}>{previewPaymentStatus}</b>
          {remaining > 0 && ` (quedarán $${remaining.toLocaleString("es-AR")} pendientes)`}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>

        {/* Vendedor */}
        <div>
          <label style={{ fontSize: "12px", fontWeight: 700, color: "#666", display: "block", marginBottom: "4px" }}>Vendedor</label>
          <select value={form.seller_id} onChange={e => setForm(f => ({ ...f, seller_id: e.target.value }))}
            style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "13px" }}>
            <option value="">— Sin asignar —</option>
            {users.map((u: any) => <option key={u.id} value={u.id}>{u.name || u.username}</option>)}
          </select>
        </div>

        {/* Canal */}
        <div>
          <label style={{ fontSize: "12px", fontWeight: 700, color: "#666", display: "block", marginBottom: "4px" }}>Canal de Venta</label>
          <select value={form.sale_channel_id} onChange={e => setForm(f => ({ ...f, sale_channel_id: e.target.value }))}
            style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "13px" }}>
            <option value="">— Seleccionar —</option>
            {saleChannels.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        {/* Estado de venta */}
        <div>
          <label style={{ fontSize: "12px", fontWeight: 700, color: "#666", display: "block", marginBottom: "4px" }}>Estado de Venta</label>
          <select value={form.order_status_id} onChange={e => setForm(f => ({ ...f, order_status_id: e.target.value }))}
            style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "13px" }}>
            {orderStatuses.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        {/* Método de pago */}
        <div>
          <label style={{ fontSize: "12px", fontWeight: 700, color: "#666", display: "block", marginBottom: "4px" }}>Método de Pago</label>
          <select value={form.payment_method_id} onChange={e => setForm(f => ({ ...f, payment_method_id: e.target.value }))}
            style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "13px" }}>
            <option value="">— Seleccionar —</option>
            {paymentMethods.map(pm => <option key={pm.id} value={pm.id}>{pm.name}</option>)}
          </select>
        </div>

        {/* Productos - solo lectura con opción de agregar/quitar */}
        <div style={{ gridColumn: "1/-1" }}>
          <label style={{ fontSize: "12px", fontWeight: 700, color: "#666", display: "block", marginBottom: "4px" }}>Productos</label>
          <div style={{ border: "1px solid #eee", borderRadius: "8px", overflow: "hidden", marginBottom: "8px" }}>
            {items.map((item, idx) => (
              <div key={idx} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 12px", borderBottom: "1px solid #f0", fontSize: "13px" }}>
                <span style={{ flex: 1 }}>{item.product_name}</span>
                <input type="number" value={item.quantity} min={1}
                  onChange={e => updateItem(idx, "quantity", Number(e.target.value))}
                  style={{ width: "50px", padding: "4px 6px", borderRadius: "6px", border: "1px solid #ddd", fontSize: "12px", textAlign: "center" }} />
                <span style={{ color: "#888", fontSize: "12px" }}>×</span>
                <input type="number" value={item.unit_price}
                  onChange={e => updateItem(idx, "unit_price", Number(e.target.value))}
                  style={{ width: "80px", padding: "4px 6px", borderRadius: "6px", border: "1px solid #ddd", fontSize: "12px" }} />
                <span style={{ fontWeight: 700, minWidth: "70px", textAlign: "right" }}>
                  ${(item.quantity * item.unit_price).toLocaleString("es-AR")}
                </span>
                <button onClick={() => removeItem(idx)} style={{ background: "none", border: "none", color: "#e74c3c", cursor: "pointer", fontSize: "14px", padding: "2px 4px" }}>✕</button>
              </div>
            ))}
            <div style={{ padding: "8px 12px", fontWeight: 800, fontSize: "13px", textAlign: "right", background: "#f9f9f9" }}>
              Subtotal: ${subtotal.toLocaleString("es-AR")}
            </div>
          </div>

          {/* Agregar producto */}
          <div style={{ position: "relative" }}>
            <div style={{ display: "flex", gap: "6px" }}>
              <input
                value={productSearch}
                onChange={e => { setProductSearch(e.target.value); setShowProductDropdown(true); }}
                onFocus={() => setShowProductDropdown(true)}
                placeholder="Buscar para agregar producto..."
                style={{ flex: 1, padding: "8px 12px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "13px" }}
              />
              <button onClick={() => setShowProductDropdown(!showProductDropdown)}
                style={{ padding: "8px 10px", borderRadius: "8px", border: "1px solid #ddd", background: "#fff", cursor: "pointer", fontSize: "14px" }}>
                🔍
              </button>
            </div>
            {showProductDropdown && (
              <div style={{ position: "absolute", top: "100%", left: 0, right: 0, border: "1px solid #ddd", borderRadius: "8px", marginTop: "4px", maxHeight: "180px", overflowY: "auto", background: "#fff", zIndex: 10, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
                {filteredProducts.slice(0, 12).map(p => (
                  <div key={p.id} onClick={() => addProduct(p)}
                    style={{ padding: "10px 14px", cursor: "pointer", fontSize: "13px", borderBottom: "1px solid #f0", display: "flex", justifyContent: "space-between" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#f5f5f5")}
                    onMouseLeave={e => (e.currentTarget.style.background = "none")}>
                    <span>{p.name}</span>
                    <span style={{ color: "#888", fontWeight: 700 }}>${Number(p.price).toLocaleString("es-AR")}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Descuento */}
        <div>
          <label style={{ fontSize: "12px", fontWeight: 700, color: "#666", display: "block", marginBottom: "4px" }}>Tipo Descuento</label>
          <select value={form.discount_type} onChange={e => setForm(f => ({ ...f, discount_type: e.target.value }))}
            style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "13px" }}>
            <option value="">Sin descuento</option>
            <option value="percent">% Porcentaje</option>
            <option value="fixed">$ Monto fijo</option>
          </select>
        </div>
        {form.discount_type && (
          <div>
            <label style={{ fontSize: "12px", fontWeight: 700, color: "#666", display: "block", marginBottom: "4px" }}>
              {form.discount_type === "percent" ? "% Descuento" : "$ Descuento"}
            </label>
            <input type="number" value={form.discount_value} min={0}
              onChange={e => setForm(f => ({ ...f, discount_value: e.target.value }))}
              style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "13px" }} />
          </div>
        )}

        {/* Costo envío */}
        {!isLocalChannel && (
          <div>
            <label style={{ fontSize: "12px", fontWeight: 700, color: "#666", display: "block", marginBottom: "4px" }}>Costo de Envío</label>
            <input type="number" value={form.delivery_fee} min={0}
              onChange={e => setForm(f => ({ ...f, delivery_fee: e.target.value }))}
              style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "13px" }} />
          </div>
        )}

        {/* Entrega */}
        {!isLocalChannel && (
          <div style={{ gridColumn: "1/-1", borderTop: "1px solid #eee", paddingTop: "12px", marginTop: "4px" }}>
            <label style={{ fontSize: "12px", fontWeight: 700, color: "#666", display: "block", marginBottom: "4px" }}>Dirección de Entrega</label>
            <input value={form.delivery_address} onChange={e => setForm(f => ({ ...f, delivery_address: e.target.value }))}
              style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "13px", marginBottom: "6px" }} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              <input value={form.delivery_location} onChange={e => setForm(f => ({ ...f, delivery_location: e.target.value }))}
                placeholder="Localidad" style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "13px" }} />
              <input type="date" value={form.scheduled_date}
                onChange={e => setForm(f => ({ ...f, scheduled_date: e.target.value }))}
                style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "13px" }} />
            </div>
            <div style={{ marginTop: "6px" }}>
              <input value={form.scheduled_time} onChange={e => setForm(f => ({ ...f, scheduled_time: e.target.value }))}
                placeholder="Horario preferido"
                style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "13px" }} />
            </div>
          </div>
        )}

        {/* Notas */}
        <div style={{ gridColumn: "1/-1" }}>
          <label style={{ fontSize: "12px", fontWeight: 700, color: "#666", display: "block", marginBottom: "4px" }}>Notas</label>
          <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "13px", minHeight: "60px", resize: "vertical" }} />
        </div>
      </div>

      {/* Resumen */}
      <div style={{ marginTop: "16px", borderTop: "2px solid #1a1a2e", paddingTop: "12px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "4px" }}>
          <span>Subtotal:</span><span>${subtotal.toLocaleString("es-AR")}</span>
        </div>
        {discountAmount > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "#e74c3c", marginBottom: "4px" }}>
            <span>Descuento:</span><span>-${discountAmount.toLocaleString("es-AR")}</span>
          </div>
        )}
        {deliveryFee > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "4px" }}>
            <span>Envío:</span><span>${deliveryFee.toLocaleString("es-AR")}</span>
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "18px", fontWeight: 800, color: "#1a1a2e", marginTop: "4px" }}>
          <span>Total:</span><span>${total.toLocaleString("es-AR")}</span>
        </div>
        {Number(order.payment_paid) > 0 && (
          <div style={{ fontSize: "12px", color: "#27ae60", marginTop: "2px", textAlign: "right" }}>
            Ya cobrado: ${Number(order.payment_paid).toLocaleString("es-AR")} · Pendiente: ${Math.max(0, remaining).toLocaleString("es-AR")}
          </div>
        )}
        <div style={{ display: "flex", gap: "8px", marginTop: "16px" }}>
          <button onClick={onClose} style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "1px solid #ddd", background: "#fff", cursor: "pointer", fontSize: "14px" }}>Cancelar</button>
          <button onClick={handleSave} disabled={saving}
            style={{ flex: 2, padding: "10px", borderRadius: "8px", border: "none", background: "#1a1a2e", color: "#fff", cursor: saving ? "not-allowed" : "pointer", fontSize: "14px", fontWeight: 700, opacity: saving ? 0.7 : 1 }}>
            {saving ? "Guardando..." : "💾 Guardar Cambios"}
          </button>
        </div>
      </div>
    </div>
  );
}
