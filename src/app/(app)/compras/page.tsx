"use client";

import { useEffect, useState } from "react";
import { fetchJson, postJson, deleteJson } from "../../lib";
import * as XLSX from "xlsx";
import { Card, Badge, PageTitle, Loading, Empty } from "../../components/shared/UI";
import AttributeAllocationModal from "../../components/AttributeAllocationModal";

type PO = { id: number; order_number: string; provider_name: string; subtotal: number; discount_value: number; delivery_fee: number; total: number; payment_paid?: number; payment_pending?: number; status_name: string; status_color: string; payment_status_name: string; payment_status_color: string; notes: string; created_at: string; items?: any[]; };
type PS = { id: number; name: string; color: string; };
type Pst = { id: number; name: string; color: string; };
type Product = { id: number; name: string; price: number; stock_quantity: number; };
type InputItem = { id: number; name: string; unit: string; default_cost: number; stock_quantity: number; last_cost: number; };
type Provider = { id: number; name: string; business_name: string; tax_id: string; phone: string; whatsapp: string; email: string; };
type Stat = { total_count: number; total_amount: number; };
type Period = "today" | "week" | "month" | "custom";

function FieldInput({ label, value, onChange, placeholder, type = "text" }: any) {
  return (
    <div>
      <label style={{ fontSize: "12px", fontWeight: 700, color: "#666", display: "block", marginBottom: "2px" }}>{label}</label>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} type={type} style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "13px" }} />
    </div>
  );
}

function FieldSelect({ label, value, onChange, options }: any) {
  return (
    <div>
      <label style={{ fontSize: "12px", fontWeight: 700, color: "#666", display: "block", marginBottom: "2px" }}>{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "13px" }}>
        <option value="">Seleccionar...</option>
        {options.map((o: any) => <option key={o.id} value={o.id}>{o.name}</option>)}
      </select>
    </div>
  );
}

export default function ComprasPage() {
  const [orders, setOrders] = useState<PO[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPayment, setFilterPayment] = useState("");
  const [period, setPeriod] = useState<Period>("month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [stats, setStats] = useState<Stat | null>(null);
  const [ps, setPS] = useState<PS[]>([]);
  const [pst, setPst] = useState<Pst[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [receiveAllocationModal, setReceiveAllocationModal] = useState<{ orderId: number; items: any[] } | null>(null);
  const [hasOpenCashSession, setHasOpenCashSession] = useState(false);
  const [detailId, setDetailId] = useState<number | null>(null);

  const [refreshKey, setRefreshKey] = useState(0);

  function load() {
    setLoading(true);
    Promise.all([
      fetchJson<PO[]>("/purchase-orders?period=" + period + (period === "custom" && customFrom && customTo ? "&from=" + customFrom + "&to=" + customTo : "")),
      fetchJson<PS[]>("/purchase-statuses"),
      fetchJson<Pst[]>("/payment-statuses"),
      fetchJson<Stat>("/purchase-orders/stats?period=" + period + (period === "custom" && customFrom && customTo ? "&from=" + customFrom + "&to=" + customTo : "")),
    ]).then(([o, p, pt, st]) => {
      setOrders(o); setPS(p); setPst(pt); setStats(st);
    }).catch(console.error).finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [refreshKey, period, customFrom, customTo]);


  function handleExportExcel() {
    const data = filtered.map(o => ({
      "NP": o.order_number,
      "Fecha": new Date(o.created_at).toLocaleDateString("es-AR"),
      "Proveedor": o.provider_name || "-",
      "Total": Number(o.total || 0),
      "Pagado": Number(o.payment_paid || 0),
      "Saldo": Number(o.payment_pending || 0),
      "Estado Pago": o.payment_status_name || "-",
      "Status": o.status_name || "-",
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Compras");
    const from = customFrom || "todas";
    const to = customTo || "todas";
    XLSX.writeFile(wb, "Compras_" + from + "_" + to + ".xlsx");
  }

  const filtered = orders.filter(o => {
    if (search && !o.provider_name?.toLowerCase().includes(search.toLowerCase()) && !o.order_number?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterStatus && o.status_name !== filterStatus) return false;
    if (filterPayment && o.payment_status_name !== filterPayment) return false;
    return true;
  });

  async function handleReceive(orderId: number) {
    try {
      const [order, products] = await Promise.all([fetchJson<any>("/purchase-orders/" + orderId), fetchJson<any[]>("/products")]);
      const productMap = new Map(products.map((p: any) => [Number(p.id), p]));
      const itemsNeedingAllocation = [];
      for (const item of (order.items || [])) {
        const product = productMap.get(Number(item.product_id));
        if (product?.requires_stock && product?.has_attributes) {
          const attrs = await fetchJson<any[]>(`/products/${item.product_id}/attributes`);
          itemsNeedingAllocation.push({
            key: String(item.id),
            purchase_item_id: item.id,
            title: item.product_name,
            totalQuantity: Number(item.quantity || 0),
            options: attrs.map((a: any) => ({ attribute_value_id: a.attribute_value_id, value: a.value, stock_quantity: a.stock_quantity })),
            allocations: [],
            showStock: false,
          });
        }
      }
      if (!itemsNeedingAllocation.length) {
        if (!confirm("Recibir NP e incrementar stock?")) return;
        await postJson("/purchase-orders/" + orderId + "/receive", { allocations: [] });
        setRefreshKey(k => k + 1);
        return;
      }
      setReceiveAllocationModal({ orderId, items: itemsNeedingAllocation });
    } catch (e: any) { alert("Error: " + (e?.message || "No se pudo preparar la recepción")); }
  }

  async function handleDelete(id: number) {
    if (!confirm("Eliminar NP?")) return;
    try {
      await deleteJson("/purchase-orders/" + id);
      setRefreshKey(k => k + 1);
    } catch (e: any) {
      console.error(e);
      const body = e?.body || (typeof e === "object" ? e : null);
      if (body?.payments?.length > 0) {
        const paymentList = body.payments.map((p: any) => "  $" + Number(p.amount).toLocaleString("es-AR", {minimumFractionDigits:2}) + " - " + (p.method || "-") + " (" + new Date(p.paid_at).toLocaleDateString("es-AR") + ")").join("\n");
        alert("No se puede eliminar: la compra tiene pagos asociados.\n\nEliminá los pagos primero:\n" + paymentList);
      } else {
        alert("No se pudo eliminar");
      }
    }
  }

  return (
    <div>
      <PageTitle>📥 Compras</PageTitle>
      <p style={{ fontSize: "13px", color: "#888", margin: "2px 0 16px" }}>Notas de pedido a proveedores. Stock aumenta al recibir.</p>

      {stats && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "10px", marginBottom: "16px" }}>
          <div style={{ background: "#1a1a2e", borderRadius: "12px", padding: "14px", color: "#fff" }}>
            <div style={{ fontSize: "11px", color: "#aaa", marginBottom: "4px" }}>NPs del periodo</div>
            <div style={{ fontSize: "24px", fontWeight: 800 }}>{stats.total_count}</div>
          </div>
          <div style={{ background: "#fff", borderRadius: "12px", padding: "14px", border: "1px solid #eee" }}>
            <div style={{ fontSize: "11px", color: "#888", marginBottom: "4px" }}>Total comprado</div>
            <div style={{ fontSize: "22px", fontWeight: 800, color: "#e74c3c" }}>${stats.total_amount.toLocaleString("es-AR")}</div>
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

      <div style={{ display: "flex", gap: "8px", marginBottom: "12px", flexWrap: "wrap" }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar NP o proveedor..." style={{ flex: 1, minWidth: "160px", padding: "8px 12px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "13px" }} />
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ padding: "8px 10px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "13px", minWidth: "140px" }}>
          <option value="">Estado compra: Todos</option>
          {ps.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
        </select>
        <select value={filterPayment} onChange={e => setFilterPayment(e.target.value)} style={{ padding: "8px 10px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "13px", minWidth: "150px" }}>
          <option value="">Estado pago: Todos</option>
          {pst.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
        </select>
        <button onClick={() => setShowNew(true)} style={{ padding: "8px 16px", borderRadius: "8px", border: "none", background: "#27ae60", color: "#fff", cursor: "pointer", fontSize: "13px", fontWeight: 700 }}>➕ Nueva Compra</button>
        <button onClick={handleExportExcel} style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid #ddd", background: "#fff", color: "#1a1a2e", cursor: "pointer", fontSize: "13px", fontWeight: 700 }}>📥 Excel</button>
      </div>

      {loading ? <Loading /> : filtered.length === 0 ? <Empty message="Sin notas de pedido" /> : (
        <div style={{ display: "grid", gap: "10px" }}>
          {filtered.map(o => (
            <Card key={o.id} onClick={() => setDetailId(o.id)} style={{ cursor: "pointer" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px", flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 800, fontSize: "14px" }}>{o.order_number}</span>
                    {o.provider_name && <span style={{ fontSize: "12px", color: "#888" }}>{o.provider_name}</span>}
                  </div>
                  <div style={{ fontSize: "12px", color: "#888" }}>{new Date(o.created_at).toLocaleDateString("es-AR")}</div>
                  <div style={{ fontSize: "17px", fontWeight: 800, color: "#1a1a2e", marginTop: "4px" }}>
                    ${Number(o.total).toLocaleString("es-AR")}
                    {o.payment_paid > 0 && Number(o.payment_paid) < Number(o.total) && (
                      <span style={{ fontSize: "12px", color: "#f39c12", fontWeight: 400 }}>
                        ${Number(o.payment_paid).toLocaleString("es-AR")} pagado
                        <span style={{ color: "#e74c3c" }}> (resta ${Number(o.total - o.payment_paid).toLocaleString("es-AR")})</span>
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: "6px", marginTop: "6px", flexWrap: "wrap" }}>
                    {o.status_name && <Badge color={o.status_color || "#888"}>{o.status_name}</Badge>}
                    {o.payment_status_name && <Badge color={o.payment_status_color || "#888"}>{o.payment_status_name}</Badge>}
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
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <button onClick={e => { e.stopPropagation(); setDetailId(o.id); }} style={{ padding: "5px 8px", borderRadius: "6px", border: "1px solid #ddd", background: "#fff", color: "#1a1a2e", cursor: "pointer", fontSize: "12px" }}>👁️</button>
                  {o.status_name !== "Recibido" && (
                    <button onClick={e => { e.stopPropagation(); handleReceive(o.id); }} style={{ padding: "5px 8px", borderRadius: "6px", border: "1px solid #27ae60", background: "#fff", color: "#27ae60", cursor: "pointer", fontSize: "12px", fontWeight: 700 }}>✅ Recibir</button>
                  )}
                  <button onClick={e => { e.stopPropagation(); handleDelete(o.id); }} style={{ padding: "5px 8px", borderRadius: "6px", border: "1px solid #ddd", background: "#fff", cursor: "pointer", fontSize: "12px", color: "#e74c3c" }}>🗑️</button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {showNew && <NewNPModal onClose={() => setShowNew(false)} onCreated={() => { setShowNew(false); setRefreshKey(k => k + 1); }} />}
      {detailId && <NPDetailModal orderId={detailId} onClose={() => setDetailId(null)} onUpdated={() => setRefreshKey(k => k + 1)} />}
      {receiveAllocationModal && (
        <AttributeAllocationModal
          title="Repartir compra por atributos"
          items={receiveAllocationModal.items}
          onClose={() => setReceiveAllocationModal(null)}
          onSave={async (result) => {
            try {
              await postJson("/purchase-orders/" + receiveAllocationModal.orderId + "/receive", {
                allocations: receiveAllocationModal.items.map((item: any) => ({
                  purchase_item_id: Number(item.purchase_item_id),
                  allocations: result[item.key] || [],
                })),
              });
              setReceiveAllocationModal(null);
              setRefreshKey(k => k + 1);
            } catch (e: any) {
              alert("Error: " + (e?.message || "No se pudo recibir"));
            }
          }}
        />
      )}
    </div>
  );
}

function NewNPModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ provider_id: "", notes: "", delivery_fee: "0", discount_type: "", discount_value: "" });
  const [items, setItems] = useState<any[]>([]);
  const [isPaid, setIsPaid] = useState(false);
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [providers, setProviders] = useState<Provider[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [inputItems, setInputItems] = useState<InputItem[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [pSearch, setPSearch] = useState("");
  const [iiSearch, setIiSearch] = useState("");

  const [provSearch, setProvSearch] = useState("");
  const [providerAdvances, setProviderAdvances] = useState<{ id: number; amount: number; remaining: number; notes: string; created_at: string }[]>([]);
  const [advanceSeleccionado, setAdvanceSeleccionado] = useState<{ id: number; remaining: number } | null>(null);
  const [advanceMontoUsar, setAdvanceMontoUsar] = useState("");
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [showProviderDropdown, setShowProviderDropdown] = useState(false);
  const [showProductsDropdown, setShowProductsDropdown] = useState(false);
  const [showInputItemsDropdown, setShowInputItemsDropdown] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<"products" | "insumos">("products");

  const [showNewProvider, setShowNewProvider] = useState(false);
  const [showNewProduct, setShowNewProduct] = useState(false);
  const [showNewInsumo, setShowNewInsumo] = useState(false);
  const [newProvider, setNewProvider] = useState({ name: "", business_name: "", tax_id: "", phone: "", whatsapp: "", email: "" });
  const [newProduct, setNewProduct] = useState({ name: "", price: "" });
  const [newInsumo, setNewInsumo] = useState({ name: "", unit: "", default_cost: "" });

  useEffect(() => {
    fetchJson<Product[]>("/products").then(setProducts).catch(() => setProducts([]));
    fetchJson<any[]>("/payment-methods").then(setPaymentMethods).catch(() => setPaymentMethods([]));
    fetchJson<InputItem[]>("/input-items").then(setInputItems).catch(() => setInputItems([]));
  }, []);

  function loadProviders(q: string) {
    fetchJson<Provider[]>("/providers?q=" + encodeURIComponent(q)).then(setProviders).catch(() => setProviders([]));
  }

  function setF(field: string, value: string) { setForm(prev => ({ ...prev, [field]: value })); }

  function addItem(item: any, type: "product" | "input_item") {
    if (items.find(i => (type === "product" ? i.product_id : i.input_item_id) === item.id)) return;
    const name = type === "product" ? item.name : item.name + " (" + item.unit + ")";
    const price = type === "product" ? Number(item.price) : Number(item.default_cost);
    setItems([...items, {
      product_id: type === "product" ? item.id : null,
      input_item_id: type === "input_item" ? item.id : null,
      product_name: name,
      quantity: 1,
      unit_price: price,
      item_type: type,
    }]);
  }

  function remItem(idx: number) { setItems(items.filter((_, i) => i !== idx)); }
  function updateItemQty(idx: number, qty: number) { const v = [...items]; v[idx].quantity = qty; setItems(v); }
  function updateItemPrice(idx: number, price: number) { const v = [...items]; v[idx].unit_price = price; setItems(v); }

  const productQuery = pSearch.trim().toLowerCase();
  const inputQuery = iiSearch.trim().toLowerCase();
  const fp = products.filter(p => !productQuery || p.name.toLowerCase().includes(productQuery));
  const fi = inputItems.filter(i => !inputQuery || i.name.toLowerCase().includes(inputQuery));
  const filteredProviders = providers.filter(p => !provSearch.trim() || p.name.toLowerCase().includes(provSearch.toLowerCase()) || p.business_name?.toLowerCase().includes(provSearch.toLowerCase()));

  const subtotal = items.reduce((s, i) => s + i.quantity * i.unit_price, 0);
  let disc = 0;
  if (form.discount_type === "percent" && Number(form.discount_value)) disc = subtotal * (Number(form.discount_value) / 100);
  else if (form.discount_type === "fixed") disc = Number(form.discount_value);
  const total = Math.max(0, subtotal - disc + Number(form.delivery_fee || 0));

  useEffect(() => {
    if (form.provider_id) {
      fetchJson<any[]>("/advances?entity_type=provider&entity_id=" + form.provider_id)
        .then(setProviderAdvances)
        .catch(() => setProviderAdvances([]));
    } else {
      setProviderAdvances([]);
    }
  }, [form.provider_id]);

  async function saveProvider() {
    if (!newProvider.name) { alert("El nombre es obligatorio"); return; }
    try {
      const created = await postJson<Provider>("/providers", newProvider);
      setForm(prev => ({ ...prev, provider_id: String(created.id) }));
      setProvSearch(created.name);
      setShowNewProvider(false);
      setNewProvider({ name: "", business_name: "", tax_id: "", phone: "", whatsapp: "", email: "" });
    } catch (e) { alert("Error al crear proveedor"); }
  }

  async function saveProduct() {
    if (!newProduct.name || !newProduct.price) { alert("Nombre y precio son obligatorios"); return; }
    try {
      const created = await postJson<Product>("/products", { name: newProduct.name, price: Number(newProduct.price) });
      setProducts(prev => [...prev, created]);
      addItem(created, "product");
      setShowNewProduct(false);
      setNewProduct({ name: "", price: "" });
    } catch (e) { alert("Error al crear producto"); }
  }

  async function saveInsumo() {
    if (!newInsumo.name) { alert("El nombre es obligatorio"); return; }
    try {
      const created = await postJson<InputItem>("/input-items", { name: newInsumo.name, unit: newInsumo.unit, default_cost: Number(newInsumo.default_cost) || 0 });
      setInputItems(prev => [...prev, created]);
      addItem(created, "input_item");
      setShowNewInsumo(false);
      setNewInsumo({ name: "", unit: "", default_cost: "" });
    } catch (e) { alert("Error al crear insumo"); }
  }

  async function handleSave() {
    if (items.length === 0) { alert("Agregá al menos un producto o insumo"); return; }
    setSaving(true);
    try {
      const payload: any = {
        provider_id: form.provider_id ? Number(form.provider_id) : undefined,
        notes: form.notes || undefined,
        delivery_fee: Number(form.delivery_fee) || 0,
        discount_type: form.discount_type || undefined,
        discount_value: form.discount_value ? Number(form.discount_value) : undefined,
        items: items.map(i => ({ product_id: i.product_id, input_item_id: i.input_item_id, product_name: i.product_name, quantity: i.quantity, unit_price: i.unit_price })),
      };
      if (isPaid && paymentMethodId && paymentAmount) {
        payload.payment_method_id = Number(paymentMethodId);
        payload.payment_amount = Number(paymentAmount);
      }
      if (advanceSeleccionado && advanceMontoUsar && Number(advanceMontoUsar) > 0) {
        payload.advance_id = advanceSeleccionado.id;
        payload.advance_amount = Number(advanceMontoUsar);
      }
      const newOrder = await postJson<any>("/purchase-orders", payload);
      onCreated();
    } catch (e: any) { alert("Error: " + (e?.response?.data?.error || e?.message || "No se pudo crear")); }
    finally { setSaving(false); }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "#fff", borderRadius: "16px", padding: "24px", width: "100%", maxWidth: "600px", maxHeight: "90vh", overflowY: "auto" }}>
        <h2 style={{ margin: "0 0 16px", fontSize: "18px", fontWeight: 800 }}>📥 Nueva Compra</h2>

        {/* Proveedor */}
        {!showNewProvider ? (
          <div style={{ marginBottom: "12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
              <label style={{ fontSize: "12px", fontWeight: 700, color: "#666" }}>Proveedor</label>
              <button onClick={() => setShowNewProvider(true)} style={{ fontSize: "11px", background: "none", border: "1px solid #27ae60", color: "#27ae60", padding: "2px 8px", borderRadius: "4px", cursor: "pointer" }}>➕ Nuevo</button>
            </div>
            <div style={{ position: "relative" }}>
              <div style={{ display: "flex", gap: "6px" }}>
                <input value={provSearch} onChange={e => { setProvSearch(e.target.value); setShowProviderDropdown(true); loadProviders(e.target.value); }} onFocus={() => { setShowProviderDropdown(true); if (!providers.length) loadProviders(""); }} placeholder="Buscar proveedor..." style={{ flex: 1, padding: "8px 12px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "13px" }} />
                <button onClick={() => { const next = !showProviderDropdown; setShowProviderDropdown(next); if (next && !providers.length) loadProviders(""); }} title="Ver todos los proveedores" style={{ padding: "8px 10px", borderRadius: "8px", border: "1px solid #ddd", background: "#fff", cursor: "pointer", fontSize: "14px" }}>
                  🔍
                </button>
              </div>
              {showProviderDropdown && (
                <div style={{ position: "absolute", top: "100%", left: 0, right: 0, border: "1px solid #ddd", borderRadius: "8px", marginTop: "4px", maxHeight: "200px", overflowY: "auto", background: "#fff", zIndex: 20, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
                  {filteredProviders.length > 0 ? filteredProviders.slice(0, 15).map(p => (
                    <div key={p.id} onClick={() => { setF("provider_id", String(p.id)); setProvSearch(p.name); setShowProviderDropdown(false); }} style={{ padding: "10px 14px", borderBottom: "1px solid #f0", cursor: "pointer", fontSize: "13px", display: "flex", justifyContent: "space-between" }} onMouseEnter={e => (e.currentTarget.style.background = "#f5f5f5")} onMouseLeave={e => (e.currentTarget.style.background = "none")}>
                      <span><b>{p.name}</b>{p.business_name && <span style={{ color: "#888", marginLeft: "6px" }}>· {p.business_name}</span>}</span>
                      <span style={{ color: "#888" }}>{p.tax_id || ""}</span>
                    </div>
                  )) : (
                    <div style={{ padding: "12px", color: "#999", fontSize: "12px", textAlign: "center" }}>No se encontraron proveedores</div>
                  )}
                </div>
              )}
              {!!form.provider_id && (() => {
                const totalRemaining = providerAdvances.reduce((s, a) => s + Number(a.remaining || 0), 0);
                return totalRemaining > 0 && !advanceSeleccionado ? (
                  <div style={{ marginTop: "8px", fontSize: "11px", background: "#6c63ff", color: "#fff", padding: "2px 8px", borderRadius: "4px", fontWeight: 700, display: "inline-block" }}>
                    💳 {totalRemaining.toLocaleString("es-AR")} anticipo disp.
                  </div>
                ) : null;
              })()}
            </div>
          </div>
        ) : (
          <div style={{ marginBottom: "12px", padding: "12px", background: "#f8fff8", borderRadius: "8px", border: "1px solid #27ae60" }}>
            <div style={{ fontWeight: 700, fontSize: "13px", marginBottom: "8px" }}>➕ Nuevo Proveedor</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              <FieldInput label="Nombre *" value={newProvider.name} onChange={v => setNewProvider(p => ({ ...p, name: v }))} placeholder="ej: Florería San Juan" />
              <FieldInput label="Razón Social" value={newProvider.business_name} onChange={v => setNewProvider(p => ({ ...p, business_name: v }))} placeholder="ej: Florería SJ SRL" />
              <FieldInput label="CUIT" value={newProvider.tax_id} onChange={v => setNewProvider(p => ({ ...p, tax_id: v }))} placeholder="XX-XXXXXXXX-X" />
              <FieldInput label="Teléfono" value={newProvider.phone} onChange={v => setNewProvider(p => ({ ...p, phone: v }))} placeholder="264XXXXXXX" />
              <FieldInput label="WhatsApp" value={newProvider.whatsapp} onChange={v => setNewProvider(p => ({ ...p, whatsapp: v }))} placeholder="549264..." />
              <FieldInput label="Email" value={newProvider.email} onChange={v => setNewProvider(p => ({ ...p, email: v }))} placeholder="info@floreria.com" />
            </div>
            <div style={{ display: "flex", gap: "6px", marginTop: "8px" }}>
              <button onClick={() => setShowNewProvider(false)} style={{ flex: 1, padding: "6px", borderRadius: "6px", border: "1px solid #ddd", background: "#fff", cursor: "pointer", fontSize: "12px" }}>Cancelar</button>
              <button onClick={saveProvider} style={{ flex: 2, padding: "6px", borderRadius: "6px", border: "none", background: "#27ae60", color: "#fff", cursor: "pointer", fontSize: "12px", fontWeight: 700 }}>✅ Crear</button>
            </div>
          </div>
        )}

        {/* Items — tabs */}
        <div style={{ display: "flex", gap: "4px", marginBottom: "8px" }}>
          <button onClick={() => setTab("products")} style={{ flex: 1, padding: "8px", borderRadius: "8px", border: "2px solid", borderColor: tab === "products" ? "#1a1a2e" : "#ddd", background: tab === "products" ? "#1a1a2e" : "#fff", color: tab === "products" ? "#fff" : "#666", cursor: "pointer", fontWeight: 700, fontSize: "13px" }}>📦 Productos</button>
          <button onClick={() => setTab("insumos")} style={{ flex: 1, padding: "8px", borderRadius: "8px", border: "2px solid", borderColor: tab === "insumos" ? "#1a1a2e" : "#ddd", background: tab === "insumos" ? "#1a1a2e" : "#fff", color: tab === "insumos" ? "#fff" : "#666", cursor: "pointer", fontWeight: 700, fontSize: "13px" }}>🧴 Insumos</button>
        </div>

        {tab === "products" && !showNewProduct && (
          <div style={{ marginBottom: "12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
              <label style={{ fontSize: "12px", fontWeight: 700, color: "#666" }}>Productos</label>
              <button onClick={() => setShowNewProduct(true)} style={{ fontSize: "11px", background: "none", border: "1px solid #27ae60", color: "#27ae60", padding: "2px 8px", borderRadius: "4px", cursor: "pointer" }}>➕ Nuevo</button>
            </div>
            <div style={{ position: "relative" }}>
              <div style={{ display: "flex", gap: "6px" }}>
                <input
                  value={pSearch}
                  onChange={e => { setPSearch(e.target.value); setShowProductsDropdown(true); }}
                  onFocus={() => setShowProductsDropdown(true)}
                  placeholder={`Buscar entre ${products.length} productos...`}
                  style={{ flex: 1, padding: "8px 12px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "13px" }}
                />
                <button onClick={() => setShowProductsDropdown(!showProductsDropdown)} title="Ver todos los productos" style={{ padding: "8px 10px", borderRadius: "8px", border: "1px solid #ddd", background: "#fff", cursor: "pointer", fontSize: "14px" }}>
                  🔍
                </button>
              </div>
              {showProductsDropdown && (
                <div style={{ position: "absolute", top: "100%", left: 0, right: 0, border: "1px solid #ddd", borderRadius: "8px", marginTop: "4px", maxHeight: "200px", overflowY: "auto", background: "#fff", zIndex: 20, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
                  {fp.length > 0 ? fp.slice(0, 15).map(p => (
                    <div key={p.id} onClick={() => { addItem(p, "product"); setPSearch(""); setShowProductsDropdown(false); }} style={{ padding: "10px 14px", borderBottom: "1px solid #f0", cursor: "pointer", display: "flex", justifyContent: "space-between", fontSize: "13px" }} onMouseEnter={e => (e.currentTarget.style.background = "#f5f5f5")} onMouseLeave={e => (e.currentTarget.style.background = "none")}>
                      <span>{p.name}</span>
                      <span style={{ fontWeight: 700, color: "#888" }}>${Number(p.price).toLocaleString("es-AR")}</span>
                    </div>
                  )) : (
                    <div style={{ padding: "12px", color: "#999", fontSize: "12px", textAlign: "center" }}>No se encontraron productos</div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {tab === "products" && showNewProduct && (
          <div style={{ marginBottom: "12px", padding: "12px", background: "#f8fff8", borderRadius: "8px", border: "1px solid #27ae60" }}>
            <div style={{ fontWeight: 700, fontSize: "13px", marginBottom: "8px" }}>➕ Nuevo Producto</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              <FieldInput label="Nombre *" value={newProduct.name} onChange={v => setNewProduct({ name: v, price: newProduct.price })} placeholder="ej: Ramo de rosas" />
              <FieldInput label="Precio *" value={newProduct.price} onChange={v => setNewProduct({ name: newProduct.name, price: v })} placeholder="0.00" type="number" />
            </div>
            <div style={{ display: "flex", gap: "6px", marginTop: "8px" }}>
              <button onClick={() => setShowNewProduct(false)} style={{ flex: 1, padding: "6px", borderRadius: "6px", border: "1px solid #ddd", background: "#fff", cursor: "pointer", fontSize: "12px" }}>Cancelar</button>
              <button onClick={saveProduct} style={{ flex: 2, padding: "6px", borderRadius: "6px", border: "none", background: "#27ae60", color: "#fff", cursor: "pointer", fontSize: "12px", fontWeight: 700 }}>✅ Crear</button>
            </div>
          </div>
        )}

        {tab === "insumos" && !showNewInsumo && (
          <div style={{ marginBottom: "12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
              <label style={{ fontSize: "12px", fontWeight: 700, color: "#666" }}>Insumos</label>
              <button onClick={() => setShowNewInsumo(true)} style={{ fontSize: "11px", background: "none", border: "1px solid #27ae60", color: "#27ae60", padding: "2px 8px", borderRadius: "4px", cursor: "pointer" }}>➕ Nuevo</button>
            </div>
            <div style={{ position: "relative" }}>
              <div style={{ display: "flex", gap: "6px" }}>
                <input
                  value={iiSearch}
                  onChange={e => { setIiSearch(e.target.value); setShowInputItemsDropdown(true); }}
                  onFocus={() => setShowInputItemsDropdown(true)}
                  placeholder={`Buscar entre ${inputItems.length} insumos...`}
                  style={{ flex: 1, padding: "8px 12px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "13px" }}
                />
                <button onClick={() => setShowInputItemsDropdown(!showInputItemsDropdown)} title="Ver todos los insumos" style={{ padding: "8px 10px", borderRadius: "8px", border: "1px solid #ddd", background: "#fff", cursor: "pointer", fontSize: "14px" }}>
                  🔍
                </button>
              </div>
              {showInputItemsDropdown && (
                <div style={{ position: "absolute", top: "100%", left: 0, right: 0, border: "1px solid #ddd", borderRadius: "8px", marginTop: "4px", maxHeight: "200px", overflowY: "auto", background: "#fff", zIndex: 20, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
                  {fi.length > 0 ? fi.slice(0, 15).map(i => (
                    <div key={i.id} onClick={() => { addItem(i, "input_item"); setIiSearch(""); setShowInputItemsDropdown(false); }} style={{ padding: "10px 14px", borderBottom: "1px solid #f0", cursor: "pointer", display: "flex", justifyContent: "space-between", fontSize: "13px" }} onMouseEnter={e => (e.currentTarget.style.background = "#f5f5f5")} onMouseLeave={e => (e.currentTarget.style.background = "none")}>
                      <span>{i.name} <span style={{ fontSize: "11px", color: "#888" }}>({i.unit})</span></span>
                      <span style={{ fontWeight: 700, color: "#888" }}>${Number(i.default_cost).toLocaleString("es-AR")}</span>
                    </div>
                  )) : (
                    <div style={{ padding: "12px", color: "#999", fontSize: "12px", textAlign: "center" }}>No se encontraron insumos</div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {tab === "insumos" && showNewInsumo && (
          <div style={{ marginBottom: "12px", padding: "12px", background: "#f8fff8", borderRadius: "8px", border: "1px solid #27ae60" }}>
            <div style={{ fontWeight: 700, fontSize: "13px", marginBottom: "8px" }}>➕ Nuevo Insumo</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
              <FieldInput label="Nombre *" value={newInsumo.name} onChange={v => setNewInsumo({ ...newInsumo, name: v })} placeholder="ej: Tela de rosas" />
              <FieldInput label="Unidad" value={newInsumo.unit} onChange={v => setNewInsumo({ ...newInsumo, unit: v })} placeholder="ej: Metro" />
              <FieldInput label="Costo default" value={newInsumo.default_cost} onChange={v => setNewInsumo({ ...newInsumo, default_cost: v })} placeholder="0.00" type="number" />
            </div>
            <div style={{ display: "flex", gap: "6px", marginTop: "8px" }}>
              <button onClick={() => setShowNewInsumo(false)} style={{ flex: 1, padding: "6px", borderRadius: "6px", border: "1px solid #ddd", background: "#fff", cursor: "pointer", fontSize: "12px" }}>Cancelar</button>
              <button onClick={saveInsumo} style={{ flex: 2, padding: "6px", borderRadius: "6px", border: "none", background: "#27ae60", color: "#fff", cursor: "pointer", fontSize: "12px", fontWeight: 700 }}>✅ Crear</button>
            </div>
          </div>
        )}

        {/* Items agregados */}
        {items.length > 0 && (
          <div style={{ marginBottom: "12px", background: "#f8f8f8", borderRadius: "8px", padding: "8px" }}>
            <div style={{ fontSize: "12px", fontWeight: 700, color: "#666", marginBottom: "4px" }}>Items agregados ({items.length})</div>
            {items.map((item, idx) => (
              <div key={idx} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "4px 0", borderBottom: "1px solid #eee", fontSize: "13px" }}>
                <span style={{ fontSize: "12px" }}>{item.item_type === "product" ? "📦" : "🧴"}</span>
                <span style={{ flex: 1 }}>{item.product_name}</span>
                <input type="number" value={item.quantity} min={1} onChange={e => updateItemQty(idx, Number(e.target.value))} style={{ width: "50px", padding: "4px", borderRadius: "6px", border: "1px solid #ddd", fontSize: "12px", textAlign: "center" }} />
                <span style={{ fontWeight: 700 }}>$</span>
                <input type="number" value={item.unit_price} onChange={e => updateItemPrice(idx, Number(e.target.value))} style={{ width: "70px", padding: "4px", borderRadius: "6px", border: "1px solid #ddd", fontSize: "12px", textAlign: "right" }} />
                <span style={{ fontWeight: 700, minWidth: "80px", textAlign: "right" }}>${(item.quantity * item.unit_price).toLocaleString("es-AR")}</span>
                <button onClick={() => remItem(idx)} style={{ background: "none", border: "none", color: "#e74c3c", cursor: "pointer", fontSize: "14px" }}>✕</button>
              </div>
            ))}
          </div>
        )}

        {/* Descuentos y envío */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: "12px" }}>
          <FieldSelect label="Tipo Descuento" value={form.discount_type} onChange={v => setF("discount_type", v)} options={[{ id: "", name: "Sin descuento" }, { id: "percent", name: "%" }, { id: "fixed", name: "$" }]} />
          {form.discount_type && <FieldInput label="Monto" value={form.discount_value} onChange={v => setF("discount_value", v)} placeholder="0" type="number" />}
          <FieldInput label="Costo envío" value={form.delivery_fee} onChange={v => setF("delivery_fee", v)} placeholder="0.00" type="number" />
        </div>

        {/* Notas */}
        <div style={{ marginBottom: "12px" }}>
          <label style={{ fontSize: "12px", fontWeight: 700, color: "#666" }}>Notas</label>
          <textarea value={form.notes} onChange={e => setF("notes", e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "13px", minHeight: "60px", resize: "vertical" }} />
        </div>

        {/* Pagado checkbox */}
        <div style={{ marginBottom: "12px", padding: "12px", background: isPaid ? "#f0fff4" : "#f8f8f8", borderRadius: "8px", border: "1px solid " + (isPaid ? "#27ae60" : "#ddd"), transition: "all 0.2s" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
            <input type="checkbox" checked={isPaid} onChange={e => setIsPaid(e.target.checked)} style={{ width: "18px", height: "18px" }} />
            <span style={{ fontWeight: 700, fontSize: "14px", color: isPaid ? "#27ae60" : "#666" }}>✅ Pagado en el acto</span>
          </label>
          {isPaid && (
            <div style={{ marginTop: "10px", display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                <FieldSelect label="Método de pago" value={paymentMethodId} onChange={setPaymentMethodId} options={paymentMethods} />
                <FieldInput label="Monto pagado" value={paymentAmount} onChange={setPaymentAmount} placeholder="0.00" type="number" />
              </div>
              {/* Anticipo rows */}
              {advanceSeleccionado && (
                <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: "8px", alignItems: "center", background: "#f0f0ff", padding: "8px", borderRadius: "8px" }}>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "#6c63ff" }}>💳 Anticipo #{advanceSeleccionado.id}</span>
                  <input type="number" value={advanceMontoUsar} onChange={e => setAdvanceMontoUsar(e.target.value)}
                    style={{ padding: "4px 8px", borderRadius: "6px", border: "1px solid #ddd", fontSize: "12px", textAlign: "right" }}
                    max={advanceSeleccionado.remaining} min={0} />
                  <button onClick={() => { setAdvanceSeleccionado(null); setAdvanceMontoUsar(""); }}
                    style={{ background: "none", border: "none", color: "#e74c3c", cursor: "pointer", fontSize: "14px", padding: "0 4px" }}>✕</button>
                </div>
              )}
              {/* Botón agregar anticipo */}
              {providerAdvances.filter(a => Number(a.remaining) > 0).length > 0 && !advanceSeleccionado && (
                <button onClick={() => setShowAdvanceModal(true)}
                  style={{ fontSize: "12px", background: "none", border: "1px dashed #6c63ff", color: "#6c63ff", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontWeight: 700 }}>
                  💳 Usar anticipo del proveedor
                </button>
              )}
            </div>
          )}
        </div>

        {/* Anticipo modal */}
        {showAdvanceModal && providerAdvances.length > 0 && (
          <div style={{ marginBottom: "12px", padding: "12px", background: "#f8f8ff", borderRadius: "8px", border: "1px solid #6c63ff" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <span style={{ fontWeight: 700, fontSize: "13px" }}>💳 Usar anticipo del proveedor</span>
              <button onClick={() => setShowAdvanceModal(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "16px" }}>✕</button>
            </div>
            {providerAdvances.filter(a => Number(a.remaining) > 0).length === 0 && (
              <div style={{ fontSize: "12px", color: "#888" }}>No hay anticipos disponibles</div>
            )}
            {providerAdvances.filter(a => Number(a.remaining) > 0).map(adv => (
              <div key={adv.id} onClick={() => {
                setAdvanceSeleccionado({ id: adv.id, remaining: Number(adv.remaining) });
                setAdvanceMontoUsar(String(Math.min(Number(adv.remaining), total)));
                setShowAdvanceModal(false);
              }} style={{ padding: "8px", borderBottom: "1px solid #eee", cursor: "pointer", fontSize: "13px" }} onMouseEnter={e => (e.currentTarget.style.background = "#f0f0ff")} onMouseLeave={e => (e.currentTarget.style.background = "none")}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Anticipo #{adv.id}</span>
                  <span style={{ fontWeight: 700, color: "#27ae60" }}>${Number(adv.remaining).toLocaleString("es-AR")} disponible</span>
                </div>
                {adv.notes && <div style={{ fontSize: "11px", color: "#888" }}>{adv.notes}</div>}
              </div>
            ))}
            {advanceSeleccionado && (
              <div style={{ marginTop: "8px", display: "flex", gap: "6px", alignItems: "center" }}>
                <span style={{ fontSize: "12px", fontWeight: 700 }}>Monto a usar:</span>
                <input type="number" value={advanceMontoUsar} onChange={e => setAdvanceMontoUsar(e.target.value)} style={{ flex: 1, padding: "6px", borderRadius: "6px", border: "1px solid #ddd", fontSize: "13px" }} max={advanceSeleccionado.remaining} min={0} />
                <button onClick={() => { setAdvanceSeleccionado(null); setAdvanceMontoUsar(""); }} style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid #e74c3c", background: "#fff", color: "#e74c3c", cursor: "pointer", fontSize: "12px" }}>Quitar</button>
              </div>
            )}
          </div>
        )}

        {/* Total */}
        <div style={{ borderTop: "2px solid #1a1a2e", paddingTop: "12px", marginBottom: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "18px", fontWeight: 800, color: "#1a1a2e" }}>
            <span>Total:</span><span>${total.toLocaleString("es-AR")}</span>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: "8px" }}>
          <button onClick={onClose} style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "1px solid #ddd", background: "#fff", cursor: "pointer" }}>Cancelar</button>
          <button onClick={handleSave} disabled={saving} style={{ flex: 2, padding: "10px", borderRadius: "8px", border: "none", background: "#27ae60", color: "#fff", cursor: saving ? "not-allowed" : "pointer", fontWeight: 700, opacity: saving ? 0.7 : 1 }}>{saving ? "Guardando..." : "✅ Crear Compra"}</button>
      </div>
    </div>
    </div>
  );
}

function NPDetailModal({ orderId, onClose, onUpdated }: any) {
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [allocationModal, setAllocationModal] = useState<{ orderId: number; items: any[] } | null>(null);

  useEffect(() => {
    fetchJson("/purchase-orders/" + orderId)
      .then(setOrder)
      .catch(() => setError("No se pudo cargar la compra"))
      .finally(() => setLoading(false));
  }, [orderId]);

  async function handleReceive() {
    try {
      const products = await fetchJson<any[]>("/products");
      const productMap = new Map(products.map((p: any) => [Number(p.id), p]));
      const itemsNeedingAllocation = [];
      for (const item of (order.items || [])) {
        const product = productMap.get(Number(item.product_id));
        if (product?.requires_stock && product?.has_attributes) {
          const attrs = await fetchJson<any[]>(`/products/${item.product_id}/attributes`);
          itemsNeedingAllocation.push({
            key: String(item.id),
            purchase_item_id: item.id,
            title: item.product_name,
            totalQuantity: Number(item.quantity || 0),
            options: attrs.map((a: any) => ({ attribute_value_id: a.attribute_value_id, value: a.value, stock_quantity: a.stock_quantity })),
            allocations: [],
            showStock: false,
          });
        }
      }
      if (!itemsNeedingAllocation.length) {
        if (!confirm("Marcar como Recibida e incrementar stock?")) return;
        await postJson("/purchase-orders/" + orderId + "/receive", { allocations: [] });
        onUpdated();
        return;
      }
      setAllocationModal({ orderId, items: itemsNeedingAllocation });
    } catch (e: any) {
      alert("Error: " + (e?.message || "No se pudo preparar la recepción"));
    }
  }

  if (loading) return (
    <div style={{ background: "#fff", borderRadius: "16px", padding: "40px", textAlign: "center", width: "100%", maxWidth: "600px" }}>
      <Loading />
    </div>
  );

  if (error || !order) return (
    <div style={{ background: "#fff", borderRadius: "16px", padding: "40px", textAlign: "center", width: "100%", maxWidth: "600px" }}>
      <p style={{ color: "#e74c3c" }}>{error || "No se pudo cargar la compra"}</p>
      <button onClick={onClose} style={{ padding: "8px 20px", borderRadius: "8px", border: "none", background: "#333", color: "#fff", cursor: "pointer" }}>Cerrar</button>
    </div>
  );

  const remaining = Number(order.total) - Number(order.payment_paid || 0);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "#fff", borderRadius: "16px", padding: "24px", width: "100%", maxWidth: "700px", maxHeight: "90vh", overflowY: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 800 }}>{order.order_number}</h2>
          <div style={{ fontSize: "12px", color: "#888", marginTop: "2px" }}>
            {order.provider_name || "Sin proveedor"}
          </div>
          <div style={{ fontSize: "12px", color: "#888" }}>
            {new Date(order.created_at).toLocaleDateString("es-AR", { day: "2-digit", month: "long", year: "numeric" })}
          </div>
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", padding: "4px 8px" }}>✕</button>
      </div>

      <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
        {order.status_name && <Badge color={order.status_color}>{order.status_name}</Badge>}
        {order.payment_status_name && <Badge color={order.payment_status_color}>{order.payment_status_name}</Badge>}
        <span style={{ padding: "6px 10px", borderRadius: "8px", background: "#f0f0f0", fontSize: "13px", color: "#666" }}>📍 Compra</span>
        {order.status_name !== "Recibido" && (
            <button onClick={handleReceive} style={{ padding: "6px 14px", borderRadius: "8px", border: "none", background: "#27ae60", color: "#fff", cursor: "pointer", fontSize: "13px", fontWeight: 700 }}>
            Marcar Recibida
          </button>
        )}
      </div>

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

      <div style={{ background: "#f8f8f8", borderRadius: "10px", padding: "12px", marginBottom: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
          <span style={{ fontWeight: 700, fontSize: "13px" }}>💰 Pagos</span>
          <span style={{ fontSize: "12px", color: "#888" }}>{order.payments?.length || 0} imputado(s)</span>
        </div>
        {order.payments && order.payments.length > 0 ? (
          <div>
            {order.payments.map((p: any) => (
              <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid #e0e0e0", fontSize: "13px" }}>
                <span>
                  <b>${Number(p.amount).toLocaleString("es-AR")}</b>
                  {p.account_name && <span style={{ color: "#888", marginLeft: "6px" }}>{p.account_name}</span>}
                  <span style={{ color: "#aaa", fontSize: "11px", marginLeft: "6px" }}>
                    {new Date(p.created_at).toLocaleDateString("es-AR")}
                  </span>
                  {p.notes && <span style={{ color: "#666", marginLeft: "6px" }}>· {p.notes}</span>}
                </span>
              </div>
            ))}
          </div>
        ) : <div style={{ fontSize: "12px", color: "#999" }}>Sin pagos registrados</div>}

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px", fontSize: "13px", fontWeight: 700 }}>
          <span>Pagado: <span style={{ color: "#27ae60" }}>${Number(order.payment_paid || 0).toLocaleString("es-AR")}</span></span>
          {remaining > 0 && <span style={{ color: "#f39c12" }}>Pendiente: ${remaining.toLocaleString("es-AR")}</span>}
          {remaining <= 0 && <span style={{ color: "#27ae60" }}>✓ Cancelado</span>}
        </div>
      </div>

      <div style={{ marginBottom: "16px" }}>
        <div style={{ fontWeight: 700, fontSize: "13px", marginBottom: "6px" }}>📦 Items</div>
        {order.items && order.items.length > 0 ? (
          <div style={{ border: "1px solid #eee", borderRadius: "8px", overflow: "hidden" }}>
            {order.items.map((item: any, idx: number) => (
              <div key={idx} style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", borderBottom: idx < order.items.length - 1 ? "1px solid #f0f0f0" : "none", fontSize: "13px" }}>
                <span>
                  {item.quantity} × {item.product_name}
                  {item.attribute_value_name ? <span style={{display:'inline-flex',alignItems:'center',gap:'4px',background:'#1a56db',color:'#fff',padding:'2px 10px',borderRadius:'20px',fontSize:'11px',fontWeight:700,marginLeft:'8px'}}>Talle: {item.attribute_value_name}</span> : null}
                  {item.attribute_allocations && item.attribute_allocations.length > 0 ? (
                    <div style={{display:'flex',flexDirection:'column',gap:'2px',marginTop:'3px',marginLeft:'20px'}}>
                      {item.attribute_allocations.map((a,i)=><span key={i} style={{fontSize:'11px',color:'#555'}}>Talle: <b>{a.attribute_value_name || a.attribute_value_id}</b> x{a.quantity}</span>)}
                    </div>
                  ) : null}
                </span>
                <span style={{ fontWeight: 700 }}>${Number(item.subtotal).toLocaleString("es-AR")}</span>
              </div>
            ))}
          </div>
        ) : <div style={{ fontSize: "12px", color: "#999" }}>Sin items</div>}
      </div>

      {order.notes && (
        <div style={{ fontSize: "13px", color: "#666", fontStyle: "italic", padding: "8px 0", borderTop: "1px solid #eee" }}>
          {order.notes}
        </div>
      )}

      <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
        {remaining > 0 && (
          <button
            onClick={() => { window.location.href = `/pagos?purchase_order_id=${order.id}`; }}
            style={{ flex: 2, padding: "10px", borderRadius: "8px", border: "none", background: "#e74c3c", color: "#fff", cursor: "pointer", fontSize: "14px", fontWeight: 700 }}
          >
            💸 Pagar compra
          </button>
        )}
        <button onClick={onClose}
          style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "none", background: "#1a1a2e", color: "#fff", cursor: "pointer", fontSize: "14px", fontWeight: 700 }}>
          Cerrar
        </button>
      </div>
      </div>
    </div>
  );
}
