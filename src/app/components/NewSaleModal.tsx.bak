"use client";

import { useEffect, useState } from "react";
import { fetchJson, postJson } from "../lib";
import type { Contact, Product, SaleChannel, OrderStatus, PaymentStatus, User } from "../types";

type SaleChannel = { id: number; name: string; sort_order: number };
type OrderStatus = { id: number; name: string; color: string; sort_order: number };
type PaymentStatus = { id: number; name: string; color: string; sort_order: number };
type PaymentMethod = { id: number; name: string; is_cash: boolean };
type User = { id: number; name: string; username: string };

type ItemDraft = { product_id: number; product_name: string; quantity: number; unit_price: number };

type Props = {
  saleChannels: SaleChannel[];
  orderStatuses: OrderStatus[];
  paymentStatuses: PaymentStatus[];
  onClose: () => void;
  onCreated: () => void;
};

export default function NewSaleModal({ saleChannels, orderStatuses, paymentStatuses, onClose, onCreated }: Props) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [saving, setSaving] = useState(false);
  const [hasOpenCashSession, setHasOpenCashSession] = useState(false);

  // Client search
  const [contactSearch, setContactSearch] = useState("");
  const [showContactDropdown, setShowContactDropdown] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

  // Product search
  const [productSearch, setProductSearch] = useState("");
  const [showProductDropdown, setShowProductDropdown] = useState(false);

  const [form, setForm] = useState({
    seller_id: "",
    sale_channel_id: "",
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
      fetchJson<Contact[]>("/contacts"),
      fetchJson<Product[]>("/products"),
      fetchJson<User[]>("/users"),
      fetchJson<PaymentMethod[]>("/payment-methods"),
      fetchJson<any>("/cash-sessions/current").catch(() => null),
    ]).then(([c, p, u, pm, sess]) => {
      setContacts(c);
      setProducts(p);
      setUsers(u.filter((user: any) => user.is_active !== false));
      setPaymentMethods(pm);
      setHasOpenCashSession(Boolean(sess));
    }).catch(console.error);
  }, []);

  // Paga en el acto
  const [pagaEnElActo, setPagaEnElActo] = useState(false);
  const [pagoAccountId, setPagoAccountId] = useState("");
  const [montoPagado, setMontoPagado] = useState("");
  const [clienteAdvances, setClienteAdvances] = useState<{ id: number; amount: number; remaining: number; notes: string; created_at: string }[]>([]);
  const [advanceModalOpen, setAdvanceModalOpen] = useState(false);
  const [advanceSeleccionado, setAdvanceSeleccionado] = useState<{ id: number; remaining: number } | null>(null);
  const [advanceMontoUsar, setAdvanceMontoUsar] = useState("");

  // Load advances when contact selected
  useEffect(() => {
    if (selectedContact) {
      fetchJson<any[]>("/advances?entity_type=client&entity_id=" + selectedContact.id)
        .then(setClienteAdvances)
        .catch(console.error);
      // Auto-fill montoPagado with total
      setMontoPagado(String(total));
      // Reset advance selection
      setAdvanceSeleccionado(null);
      setAdvanceMontoUsar("");
    } else {
      setClienteAdvances([]);
      setAdvanceSeleccionado(null);
    }
  }, [selectedContact?.id]);

  const isLocalChannel = saleChannels.find(c => String(c.id) === form.sale_channel_id)?.name?.toLowerCase().includes("local");

  const filteredContacts = selectedContact
    ? [selectedContact]
    : contacts.filter(co =>
        !contactSearch || co.name?.toLowerCase().includes(contactSearch.toLowerCase()) ||
        co.phone?.includes(contactSearch) || co.email?.toLowerCase().includes(contactSearch.toLowerCase())
      );

  const filteredProducts = products.filter(pr =>
    (!productSearch || pr.name?.toLowerCase().includes(productSearch.toLowerCase())) &&
    pr.discontinued !== 1
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

  // Update montoPagado when total changes and pagaEnElActo
  useEffect(() => {
    if (pagaEnElActo && total > 0 && !advanceSeleccionado) {
      setMontoPagado(String(total));
    }
  }, [total, pagaEnElActo, advanceSeleccionado]);

  function addProduct(p: Product) {
    if (items.find(i => i.product_id === p.id)) return;
    setItems([...items, { product_id: p.id, product_name: p.name, quantity: 1, unit_price: Number(p.price) || 0 }]);
    setProductSearch("");
    setShowProductDropdown(false);
  }

  function updateItem(idx: number, field: keyof ItemDraft, value: any) {
    setItems(items.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  }

  function removeItem(idx: number) {
    setItems(items.filter((_, i) => i !== idx));
  }

  async function handleSave() {
    if (!selectedContact) { alert("Seleccioná un cliente"); return; }
    if (items.length === 0) { alert("Agregá al menos un producto"); return; }
    if (pagaEnElActo && !hasOpenCashSession) { alert("Necesitás abrir una caja para marcar la venta como cobrada en el momento"); return; }
    setSaving(true);
    try {
      const orderResult = await postJson<{ id: number }>("/orders", {
        contact_id: selectedContact.id,
        seller_id: form.seller_id ? Number(form.seller_id) : undefined,
        sale_channel_id: form.sale_channel_id ? Number(form.sale_channel_id) : undefined,
        payment_method_id: form.payment_method_id ? Number(form.payment_method_id) : undefined,
        discount_type: form.discount_type || undefined,
        discount_value: form.discount_value ? Number(form.discount_value) : undefined,
        delivery_fee: deliveryFee,
        notes: form.notes || undefined,
        items: items.map(i => ({
          product_id: i.product_id,
          quantity: i.quantity,
          unit_price: i.unit_price,
        })),
        delivery: (!isLocalChannel && (form.delivery_address || form.scheduled_date)) ? {
          address: form.delivery_address,
          location: form.delivery_location,
          scheduled_date: form.scheduled_date,
          scheduled_time: form.scheduled_time,
          notes: "",
        } : undefined,
      });

      // Si "Paga en el acto" está activado, registrar el cobro
      if (pagaEnElActo && montoPagado && Number(montoPagado) > 0) {
        try {
          // Si se usó anticipo, registrar el uso (NO crea cash-movement, ya entró cuando se generó el anticipo)
          if (advanceSeleccionado && advanceMontoUsar && Number(advanceMontoUsar) > 0) {
            await postJson(`/advances/${advanceSeleccionado.id}/use`, {
              amount: Number(advanceMontoUsar),
              order_id: orderResult.id,
            });
          }

          // Solo crear cash-movement para el monto PAGADO EN EFECTIVO (montoPagado es efectivo, advance es adicional)
          const efectivoMonto = Number(montoPagado);
          if (efectivoMonto > 0) {
            await postJson("/cash-movements", {
              financial_account_id: Number(pagoAccountId),
              type: "in",
              reason: "nv_payment",
              order_id: orderResult.id,
              client_id: selectedContact.id,
              amount: efectivoMonto,
              notes: "Cobro en el acto",
            });
          }
        } catch (e: any) {
          console.error("Error registrando cobro:", e);
          alert("La venta se creó, pero el cobro en el acto falló. La NV quedó impaga. Abrí una caja y registrá el cobro manualmente.");
        }
      }

      onCreated();
    } catch (e: any) {
      alert("Error: " + (e?.message || "No se pudo crear la venta"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ background: "#fff", borderRadius: "16px", padding: "24px", width: "100%", maxWidth: "720px", maxHeight: "90vh", overflowY: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 800 }}>🧾 Nueva Venta</h2>
        <button onClick={onClose} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", padding: "4px 8px" }}>✕</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>

        {/* Cliente */}
        <div style={{ gridColumn: "1/-1" }}>
          <label style={{ fontSize: "12px", fontWeight: 700, color: "#666", display: "block", marginBottom: "4px" }}>
            Cliente *
          </label>
          {selectedContact ? (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 12px", background: "#f0fff4", borderRadius: "8px", border: "1px solid #27ae60" }}>
              <span style={{ flex: 1, fontSize: "14px", fontWeight: 700 }}>{selectedContact.name}</span>
              {selectedContact.phone && <span style={{ fontSize: "12px", color: "#666" }}>{selectedContact.phone}</span>}
              {(() => {
                const totalRemaining = clienteAdvances.reduce((s, a) => s + a.remaining, 0) - (advanceSeleccionado ? Number(advanceMontoUsar) : 0);
                return totalRemaining > 0 ? (
                  <span style={{ fontSize: "11px", background: "#6c63ff", color: "#fff", padding: "2px 8px", borderRadius: "4px", fontWeight: 700 }}>
                    💳 {totalRemaining.toLocaleString("es-AR")} anticipo
                  </span>
                ) : null;
              })()}
              <button onClick={() => { setSelectedContact(null); setContactSearch(""); }}
                style={{ background: "none", border: "none", color: "#e74c3c", cursor: "pointer", fontSize: "13px" }}>✕</button>
            </div>
          ) : (
            <div style={{ position: "relative" }}>
              <div style={{ display: "flex", gap: "6px" }}>
                <input
                  value={contactSearch}
                  onChange={e => { setContactSearch(e.target.value); setShowContactDropdown(true); }}
                  onFocus={() => setShowContactDropdown(true)}
                  placeholder="Buscar cliente..."
                  style={{ flex: 1, padding: "8px 12px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "13px" }}
                />
                <button onClick={() => setShowContactDropdown(!showContactDropdown)}
                  title="Ver todos los clientes"
                  style={{ padding: "8px 10px", borderRadius: "8px", border: "1px solid #ddd", background: "#fff", cursor: "pointer", fontSize: "14px" }}>
                  🔍
                </button>
              </div>
              {showContactDropdown && (
                <div style={{ position: "absolute", top: "100%", left: 0, right: 0, border: "1px solid #ddd", borderRadius: "8px", marginTop: "4px", maxHeight: "200px", overflowY: "auto", background: "#fff", zIndex: 10, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
                  {filteredContacts.length === 0 ? (
                    <div style={{ padding: "12px", fontSize: "12px", color: "#999", textAlign: "center" }}>Sin resultados</div>
                  ) : filteredContacts.slice(0, 15).map(c => (
                    <div key={c.id} onClick={() => { setSelectedContact(c); setShowContactDropdown(false); setContactSearch(""); }}
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

        {/* Vendedor */}
        <div>
          <label style={{ fontSize: "12px", fontWeight: 700, color: "#666", display: "block", marginBottom: "4px" }}>Vendedor</label>
          <select value={form.seller_id} onChange={e => setForm(f => ({ ...f, seller_id: e.target.value }))}
            style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "13px" }}>
            <option value="">— Asignar vendedor —</option>
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

        {/* Productos */}
        <div style={{ gridColumn: "1/-1" }}>
          <label style={{ fontSize: "12px", fontWeight: 700, color: "#666", display: "block", marginBottom: "4px" }}>Productos</label>
          <div style={{ position: "relative" }}>
            <div style={{ display: "flex", gap: "6px" }}>
              <input
                value={productSearch}
                onChange={e => { setProductSearch(e.target.value); setShowProductDropdown(true); }}
                onFocus={() => setShowProductDropdown(true)}
                placeholder="Buscar producto..."
                style={{ flex: 1, padding: "8px 12px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "13px" }}
              />
              <button onClick={() => setShowProductDropdown(!showProductDropdown)}
                title="Ver todos los productos"
                style={{ padding: "8px 10px", borderRadius: "8px", border: "1px solid #ddd", background: "#fff", cursor: "pointer", fontSize: "14px" }}>
                🔍
              </button>
            </div>
            {showProductDropdown && (
              <div style={{ position: "absolute", top: "100%", left: 0, right: 0, border: "1px solid #ddd", borderRadius: "8px", marginTop: "4px", maxHeight: "200px", overflowY: "auto", background: "#fff", zIndex: 10, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
                {filteredProducts.slice(0, 15).map(p => (
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

          {items.length > 0 && (
            <div style={{ marginTop: "8px", border: "1px solid #eee", borderRadius: "8px", overflow: "hidden" }}>
              {items.map((item, idx) => (
                <div key={idx} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 12px", borderBottom: "1px solid #f0", fontSize: "13px" }}>
                  <span style={{ flex: 1 }}>{item.product_name}</span>
                  <input type="number" value={item.quantity} min={1}
                    onChange={e => updateItem(idx, "quantity", Number(e.target.value))}
                    style={{ width: "50px", padding: "4px 6px", borderRadius: "6px", border: "1px solid #ddd", fontSize: "12px", textAlign: "center" }} />
                  <span style={{ color: "#888", fontSize: "12px" }}>×</span>
                  <span style={{ fontWeight: 700, minWidth: "80px", textAlign: "right", color: "#1a1a2e" }}>
                    ${item.unit_price.toLocaleString("es-AR")}
                  </span>
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
          )}
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

        {/* Costo envío - hidden si es canal local */}
        {!isLocalChannel && (
          <div>
            <label style={{ fontSize: "12px", fontWeight: 700, color: "#666", display: "block", marginBottom: "4px" }}>Costo de Envío</label>
            <input type="number" value={form.delivery_fee} min={0}
              onChange={e => setForm(f => ({ ...f, delivery_fee: e.target.value }))}
              style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "13px" }} />
          </div>
        )}

        {/* Método de pago */}
        <div>
          <label style={{ fontSize: "12px", fontWeight: 700, color: "#666", display: "block", marginBottom: "4px" }}>Método de Pago</label>
          <select value={form.payment_method_id} onChange={e => setForm(f => ({ ...f, payment_method_id: e.target.value }))}
            style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "13px" }}>
            <option value="">— Seleccionar —</option>
            {paymentMethods.map(pm => <option key={pm.id} value={pm.id}>{pm.name}</option>)}
          </select>
        </div>

        {/* Entrega - hidden si es canal local */}
        {!isLocalChannel && (
          <div style={{ gridColumn: "1/-1", borderTop: "1px solid #eee", paddingTop: "12px", marginTop: "4px" }}>
            <label style={{ fontSize: "12px", fontWeight: 700, color: "#666", display: "block", marginBottom: "4px" }}>Dirección de Entrega</label>
            <input value={form.delivery_address} onChange={e => setForm(f => ({ ...f, delivery_address: e.target.value }))}
              placeholder="Dirección completa"
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
            placeholder="Observaciones..."
            style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "13px", minHeight: "60px", resize: "vertical" }} />
        </div>
      </div>

      {/* Paga en el acto */}
      <div style={{ marginTop: "16px", borderTop: "2px solid #1a1a2e", paddingTop: "12px" }}>
        <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", padding: "10px 0" }}>
          <input type="checkbox" checked={pagaEnElActo} disabled={!hasOpenCashSession} onChange={e => { setPagaEnElActo(e.target.checked); if (e.target.checked) setMontoPagado(String(total)); }}
            style={{ width: "18px", height: "18px" }} />
          <span style={{ fontWeight: 700, fontSize: "14px", color: hasOpenCashSession ? "#111" : "#888" }}>💰 Paga en el acto (cobrar ahora{!hasOpenCashSession ? ' · abrí caja primero' : ''})</span>
        </label>

        {pagaEnElActo && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "8px" }}>
            <div>
              <label style={{ fontSize: "12px", fontWeight: 700, color: "#666", display: "block", marginBottom: "4px" }}>Cuenta *</label>
              <select value={pagoAccountId} onChange={e => setPagoAccountId(e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "13px" }}>
                <option value="">Seleccionar cuenta</option>
                {paymentMethods.map(pm => <option key={pm.id} value={pm.id}>{pm.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: "12px", fontWeight: 700, color: "#666", display: "block", marginBottom: "4px" }}>Monto a cobrar *</label>
              <input type="number" value={montoPagado} onChange={e => setMontoPagado(e.target.value)} placeholder="0.00"
                style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "13px" }} />
            </div>
          </div>
        )}

        {pagaEnElActo && selectedContact && (
          <div style={{ marginTop: "8px" }}>
            {advanceSeleccionado ? (
              <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 12px", background: "#f0f4ff", borderRadius: "8px", border: "1px solid #6c63ff" }}>
                <span style={{ fontSize: "14px" }}>💳 Anticipo usado: <b>${Number(advanceMontoUsar).toLocaleString("es-AR")}</b></span>
                <span style={{ fontSize: "12px", color: "#666" }}>(resta: ${(advanceSeleccionado.remaining - Number(advanceMontoUsar)).toLocaleString("es-AR")})</span>
                <button onClick={() => { setAdvanceSeleccionado(null); setAdvanceMontoUsar(""); }} style={{ marginLeft: "auto", background: "none", border: "none", color: "#e74c3c", cursor: "pointer", fontSize: "13px" }}>✕</button>
              </div>
            ) : (
              <button onClick={() => setAdvanceModalOpen(true)} style={{ padding: "7px 14px", borderRadius: "8px", border: "1px solid #6c63ff", background: "#fff", color: "#6c63ff", cursor: "pointer", fontSize: "13px", fontWeight: 700 }}>
                💳 Usar anticipo del cliente
              </button>
            )}
          </div>
        )}
      </div>

      {/* Resumen y acciones */}
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
        <div style={{ display: "flex", gap: "8px", marginTop: "16px" }}>
          <button onClick={onClose} style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "1px solid #ddd", background: "#fff", cursor: "pointer", fontSize: "14px" }}>Cancelar</button>
          <button onClick={handleSave} disabled={saving}
            style={{ flex: 2, padding: "10px", borderRadius: "8px", border: "none", background: "#27ae60", color: "#fff", cursor: saving ? "not-allowed" : "pointer", fontSize: "14px", fontWeight: 700, opacity: saving ? 0.7 : 1 }}>
            {saving ? "Guardando..." : "✅ Crear Venta"}
          </button>
        </div>

        {/* Advance selection modal */}
        {advanceModalOpen && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }} onClick={e => e.target === e.currentTarget && setAdvanceModalOpen(false)}>
            <div style={{ background: "#fff", borderRadius: "16px", padding: "24px", width: "100%", maxWidth: "400px" }}>
              <h3 style={{ margin: "0 0 16px", fontSize: "16px", fontWeight: 800 }}>💳 Usar Anticipo del Cliente</h3>
              {clienteAdvances.length === 0 ? (
                <div style={{ textAlign: "center", padding: "20px", color: "#888", fontSize: "13px" }}>
                  Este cliente no tiene anticipos disponibles.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "12px", maxHeight: "280px", overflowY: "auto" }}>
                  {clienteAdvances.map(adv => {
                    const isSelected = advanceSeleccionado?.id === adv.id;
                    const effRemaining = isSelected ? adv.remaining - Number(advanceMontoUsar) : adv.remaining;
                    if (effRemaining <= 0) return null;
                    return (
                    <div key={adv.id} onClick={() => { setAdvanceSeleccionado({ id: adv.id, remaining: adv.remaining }); setAdvanceMontoUsar(String(Math.min(Number(montoPagado), adv.remaining))); setAdvanceModalOpen(false); }}
                      style={{ padding: "12px 16px", borderRadius: "10px", border: "2px solid #e0e0e0", cursor: "pointer" }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = "#6c63ff")}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = "#e0e0e0")}>
                      <div style={{ fontWeight: 700, fontSize: "14px", marginBottom: "4px" }}>
                        Anticipo #{adv.id}
                        <span style={{ marginLeft: "8px", fontSize: "12px", color: "#27ae60", fontWeight: 700 }}>
                          ${effRemaining.toLocaleString("es-AR")} disponible
                        </span>
                      </div>
                      {adv.notes && <div style={{ fontSize: "12px", color: "#888" }}>{adv.notes}</div>}
                      <div style={{ fontSize: "11px", color: "#aaa", marginTop: "2px" }}>{new Date(adv.created_at).toLocaleDateString("es-AR")}</div>
                    </div>
                    );
                  })}
                </div>
              )}
              <button onClick={() => setAdvanceModalOpen(false)} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #ddd", background: "#fff", cursor: "pointer", fontSize: "14px" }}>Cancelar</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
