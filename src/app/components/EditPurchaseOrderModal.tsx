"use client";
import { useEffect, useState } from "react";
import { fetchJson, postJson, putJson } from "../lib";

type Props = {
  orderId: number;
  onClose: () => void;
  onUpdated: () => void;
};

type Provider = { id: number; name: string; business_name: string; tax_id: string; phone: string; whatsapp: string; email: string; };
type Product = { id: number; name: string; price: number; stock_quantity: number; };
type InputItem = { id: number; name: string; unit: string; default_cost: number; stock_quantity: number; last_cost: number; };

function FieldInput({ label, value, onChange, placeholder, type = "text" }: any) {
  return (
    <div>
      <label style={{ fontSize: "12px", fontWeight: 700, color: "#666", display: "block", marginBottom: "2px" }}>{label}</label>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} type={type} style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "13px" }} />
    </div>
  );
}

export default function EditPurchaseOrderModal({ orderId, onClose, onUpdated }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ provider_id: "", notes: "", delivery_fee: "0", discount_type: "", discount_value: "" });
  const [items, setItems] = useState<any[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [inputItems, setInputItems] = useState<InputItem[]>([]);
  const [provSearch, setProvSearch] = useState("");
  const [pSearch, setPSearch] = useState("");
  const [iiSearch, setIiSearch] = useState("");
  const [showProviderDropdown, setShowProviderDropdown] = useState(false);
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [showInputDropdown, setShowInputDropdown] = useState(false);
  const [tab, setTab] = useState<"products" | "insumos">("products");
  const [showNewProvider, setShowNewProvider] = useState(false);
  const [showNewProduct, setShowNewProduct] = useState(false);
  const [showNewInsumo, setShowNewInsumo] = useState(false);
  const [newProvider, setNewProvider] = useState({ name: "", business_name: "", tax_id: "", phone: "", whatsapp: "", email: "" });
  const [newProduct, setNewProduct] = useState({ name: "", price: "" });
  const [newInsumo, setNewInsumo] = useState({ name: "", unit: "", default_cost: "" });

  useEffect(() => {
    Promise.all([
      fetchJson<any[]>("/products"),
      fetchJson<any[]>("/input-items"),
      fetchJson<Provider[]>("/providers"),
    ]).then(([prods, ins, provs]) => {
      setProducts(prods);
      setInputItems(ins);
      setProviders(provs);
    });
    fetchJson<any>("/purchase-orders/" + orderId).then(order => {
      setForm({
        provider_id: order.provider_id ? String(order.provider_id) : "",
        notes: order.notes || "",
        delivery_fee: String(order.delivery_fee || "0"),
        discount_type: order.discount_type || "",
        discount_value: String(order.discount_value || ""),
      });
      setProvSearch(order.provider_name || "");
      setShowProviderDropdown(false);
      if (order.items) {
        setItems(order.items.map((i: any) => ({
          id: i.id,
          product_id: i.product_id,
          input_item_id: i.input_item_id,
          product_name: i.product_name,
          quantity: i.quantity,
          unit_price: i.unit_price,
          item_type: i.product_id ? "product" : "input_item",
        })));
      }
      setLoading(false);
    }).catch(() => { alert("Error cargando NP"); setLoading(false); });
  }, [orderId]);

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

  async function saveProvider() {
    if (!newProvider.name) { alert("El nombre es obligatorio"); return; }
    try {
      const created = await postJson<Provider>("/providers", newProvider);
      setForm(prev => ({ ...prev, provider_id: String(created.id) }));
      setProvSearch(created.name);
      setShowProviderDropdown(false);
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
      await putJson("/purchase-orders/" + orderId, {
        provider_id: form.provider_id ? Number(form.provider_id) : null,
        notes: form.notes || null,
        delivery_fee: Number(form.delivery_fee) || 0,
        discount_type: form.discount_type || null,
        discount_value: form.discount_value ? Number(form.discount_value) : 0,
        items: items.map(i => ({ product_id: i.product_id, input_item_id: i.input_item_id, product_name: i.product_name, quantity: i.quantity, unit_price: i.unit_price })),
      });
      onUpdated();
      onClose();
    } catch (e: any) { alert("Error: " + (e?.response?.data?.error || e?.message || "No se pudo actualizar")); }
    finally { setSaving(false); }
  }

  if (loading) return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#fff", borderRadius: "16px", padding: "40px", textAlign: "center" }}>Cargando...</div>
    </div>
  );

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "#fff", borderRadius: "16px", padding: "24px", width: "100%", maxWidth: "600px", maxHeight: "90vh", overflowY: "auto" }}>
        <h2 style={{ margin: "0 0 16px", fontSize: "18px", fontWeight: 800 }}>✏️ Editar Nota de Pedido</h2>

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
                      <span style={{ color: "#888" }}>{p.business_name || ""}</span>
                    </div>
                  )) : (
                    <div style={{ padding: "12px", color: "#999", fontSize: "12px", textAlign: "center" }}>No se encontraron proveedores</div>
                  )}
                </div>
              )}
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
            </div>
            <div style={{ display: "flex", gap: "6px", marginTop: "8px" }}>
              <button onClick={() => setShowNewProvider(false)} style={{ flex: 1, padding: "6px", borderRadius: "6px", border: "1px solid #ddd", background: "#fff", cursor: "pointer", fontSize: "12px" }}>Cancelar</button>
              <button onClick={saveProvider} style={{ flex: 2, padding: "6px", borderRadius: "6px", border: "none", background: "#27ae60", color: "#fff", cursor: "pointer", fontSize: "12px", fontWeight: 700 }}>✅ Crear</button>
            </div>
          </div>
        )}

        {/* Items */}
        <div style={{ display: "flex", gap: "4px", marginBottom: "8px" }}>
          <button onClick={() => setTab("products")} style={{ flex: 1, padding: "8px", borderRadius: "8px", border: "2px solid", borderColor: tab === "products" ? "#1a1a2e" : "#ddd", background: tab === "products" ? "#1a1a2e" : "#fff", color: tab === "products" ? "#fff" : "#666", cursor: "pointer", fontWeight: 700, fontSize: "13px" }}>📦 Productos</button>
          <button onClick={() => setTab("insumos")} style={{ flex: 1, padding: "8px", borderRadius: "8px", border: "2px solid", borderColor: tab === "insumos" ? "#1a1a2e" : "#ddd", background: tab === "insumos" ? "#1a1a2e" : "#fff", color: tab === "insumos" ? "#fff" : "#666", cursor: "pointer", fontWeight: 700, fontSize: "13px" }}>🧴 Insumos</button>
        </div>

        {tab === "products" && !showNewProduct && (
          <div style={{ marginBottom: "12px" }}>
            <button onClick={() => setShowNewProduct(true)} style={{ fontSize: "11px", background: "none", border: "1px solid #27ae60", color: "#27ae60", padding: "2px 8px", borderRadius: "4px", cursor: "pointer", marginBottom: "4px" }}>➕ Nuevo</button>
            <div style={{ position: "relative" }}>
              <div style={{ display: "flex", gap: "6px" }}>
                <input value={pSearch} onChange={e => { setPSearch(e.target.value); setShowProductDropdown(true); }} onFocus={() => setShowProductDropdown(true)} placeholder={`Buscar entre ${products.length} productos...`} style={{ flex: 1, padding: "8px 12px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "13px" }} />
                <button onClick={() => setShowProductDropdown(!showProductDropdown)} title="Ver todos los productos" style={{ padding: "8px 10px", borderRadius: "8px", border: "1px solid #ddd", background: "#fff", cursor: "pointer", fontSize: "14px" }}>
                  🔍
                </button>
              </div>
              {showProductDropdown && (
                <div style={{ position: "absolute", top: "100%", left: 0, right: 0, border: "1px solid #ddd", borderRadius: "8px", marginTop: "4px", maxHeight: "200px", overflowY: "auto", background: "#fff", zIndex: 20, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
                  {fp.length > 0 ? fp.slice(0, 15).map(p => (
                    <div key={p.id} onClick={() => { addItem(p, "product"); setPSearch(""); setShowProductDropdown(false); }} style={{ padding: "10px 14px", borderBottom: "1px solid #f0", cursor: "pointer", display: "flex", justifyContent: "space-between", fontSize: "13px" }} onMouseEnter={e => (e.currentTarget.style.background = "#f5f5f5")} onMouseLeave={e => (e.currentTarget.style.background = "none")}>
                      <span>{p.name}</span><span style={{ fontWeight: 700, color: "#888" }}>${Number(p.price).toLocaleString("es-AR")}</span>
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
            <button onClick={() => setShowNewInsumo(true)} style={{ fontSize: "11px", background: "none", border: "1px solid #27ae60", color: "#27ae60", padding: "2px 8px", borderRadius: "4px", cursor: "pointer", marginBottom: "4px" }}>➕ Nuevo</button>
            <div style={{ position: "relative" }}>
              <div style={{ display: "flex", gap: "6px" }}>
                <input value={iiSearch} onChange={e => { setIiSearch(e.target.value); setShowInputDropdown(true); }} onFocus={() => setShowInputDropdown(true)} placeholder={`Buscar entre ${inputItems.length} insumos...`} style={{ flex: 1, padding: "8px 12px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "13px" }} />
                <button onClick={() => setShowInputDropdown(!showInputDropdown)} title="Ver todos los insumos" style={{ padding: "8px 10px", borderRadius: "8px", border: "1px solid #ddd", background: "#fff", cursor: "pointer", fontSize: "14px" }}>
                  🔍
                </button>
              </div>
              {showInputDropdown && (
                <div style={{ position: "absolute", top: "100%", left: 0, right: 0, border: "1px solid #ddd", borderRadius: "8px", marginTop: "4px", maxHeight: "200px", overflowY: "auto", background: "#fff", zIndex: 20, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
                  {fi.length > 0 ? fi.slice(0, 15).map(i => (
                    <div key={i.id} onClick={() => { addItem(i, "input_item"); setIiSearch(""); setShowInputDropdown(false); }} style={{ padding: "10px 14px", borderBottom: "1px solid #f0", cursor: "pointer", display: "flex", justifyContent: "space-between", fontSize: "13px" }} onMouseEnter={e => (e.currentTarget.style.background = "#f5f5f5")} onMouseLeave={e => (e.currentTarget.style.background = "none")}>
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

        {/* Items cargados */}
        {items.length > 0 && (
          <div style={{ marginBottom: "12px", border: "1px solid #eee", borderRadius: "8px", overflow: "hidden" }}>
            {items.map((item, idx) => (
              <div key={idx} style={{ display: "flex", gap: "6px", padding: "8px 12px", borderBottom: "1px solid #f0", alignItems: "center" }}>
                <span style={{ flex: 1, fontSize: "13px" }}>{item.product_name}</span>
                <input type="number" value={item.quantity} min={1} onChange={e => updateItemQty(idx, Number(e.target.value))} style={{ width: "50px", padding: "4px", borderRadius: "4px", border: "1px solid #ddd", fontSize: "12px" }} />
                <input type="number" value={item.unit_price} onChange={e => updateItemPrice(idx, Number(e.target.value))} style={{ width: "70px", padding: "4px", borderRadius: "4px", border: "1px solid #ddd", fontSize: "12px" }} />
                <span style={{ fontSize: "12px", color: "#888", width: "70px", textAlign: "right" }}>${(item.quantity * item.unit_price).toLocaleString("es-AR")}</span>
                <button onClick={() => remItem(idx)} style={{ padding: "4px 6px", borderRadius: "4px", border: "1px solid #e74c3c", background: "#fff", cursor: "pointer", fontSize: "11px", color: "#e74c3c" }}>✕</button>
              </div>
            ))}
          </div>
        )}

        {/* Totales y descuento */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "8px" }}>
          <FieldInput label="Tipo Descuento" value={form.discount_type} onChange={v => setF("discount_type", v)} placeholder="%" />
          {form.discount_type && <FieldInput label="Monto" value={form.discount_value} onChange={v => setF("discount_value", v)} placeholder="0" type="number" />}
        </div>
        <FieldInput label="Costo envío" value={form.delivery_fee} onChange={v => setF("delivery_fee", v)} placeholder="0.00" type="number" />

        <div style={{ marginTop: "12px", padding: "10px", background: "#f8f8f8", borderRadius: "8px", marginBottom: "12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "4px" }}>
            <span>Subtotal:</span><span>${subtotal.toLocaleString("es-AR")}</span>
          </div>
          {disc > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "4px", color: "#27ae60" }}>
              <span>Descuento:</span><span>-${disc.toLocaleString("es-AR")}</span>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: "15px", borderTop: "1px solid #ddd", paddingTop: "6px" }}>
            <span>Total:</span><span>${total.toLocaleString("es-AR")}</span>
          </div>
        </div>

        {/* Notas */}
        <textarea value={form.notes} onChange={e => setF("notes", e.target.value)} placeholder="Notas..." rows={2} style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "13px", resize: "vertical", marginBottom: "12px", fontFamily: "inherit" }} />

        {/* Acciones */}
        <div style={{ display: "flex", gap: "8px" }}>
          <button onClick={onClose} disabled={saving} style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "1px solid #ddd", background: "#fff", cursor: "pointer", fontSize: "14px" }}>Cancelar</button>
          <button onClick={handleSave} disabled={saving} style={{ flex: 2, padding: "10px", borderRadius: "8px", border: "none", background: "#1a1a2e", color: "#fff", cursor: saving ? "not-allowed" : "pointer", fontSize: "14px", fontWeight: 700, opacity: saving ? 0.6 : 1 }}>{saving ? "Guardando..." : "💾 Guardar cambios"}</button>
        </div>
      </div>
    </div>
  );
}
