"use client";

import { useEffect, useState } from "react";
import { fetchJson, postJson, putJson, deleteJson } from "../../lib";
import { Card, IconButton, Input, Select, PageTitle, Loading } from "../../components/shared/UI";
import StatsCards from "../../components/shared/StatsCards";

type InputItem = { id: number; name: string; unit: string; default_cost: number };
type ProductComponent = { id: number; input_item_id: number; input_item_name: string; input_unit: string; quantity: number; default_cost: number };
type Category = { id: number; name: string; auto_generate_sku: boolean; sku_counter: number };
type Product = {
  id: number; name: string; sku: string; sku_externo: string; description: string;
  commercial_description: string;
  price: number; cost_price: number; computed_cost: number; unit: string;
  stock_quantity: number; min_stock: number; requires_stock: boolean;
  is_premium: boolean; premium_level: number;
  category_id: number; category_name: string;
  brand_id: number; brand_name: string;
  is_active: boolean;
  image_url: string;
  genera_diseno: boolean;
  diseno_template_url: string;
  has_attributes: boolean;
};

export default function ProductosPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categoriesFull, setCategoriesFull] = useState<Category[]>([]);
  const [categories, setCategories] = useState<{id:number;name:string}[]>([]);
  const [brands, setBrands] = useState<{id:number;name:string}[]>([]);
  const [allInputs, setAllInputs] = useState<InputItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [period, setPeriod] = useState<"today"|"week"|"month">("today");
  const [editing, setEditing] = useState<Product | null>(null);
  const [components, setComponents] = useState<ProductComponent[]>([]);
  const [pendingComponents, setPendingComponents] = useState<{input_item_id: number, quantity: number, input_item_name: string}[]>([]);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [viewMode, setViewMode] = useState<"cards" | "list">("cards");
  const [productAttributes, setProductAttributes] = useState<any[]>([]);
  const [allAttributeValues, setAllAttributeValues] = useState<any[]>([]);
  const [newAttrValue, setNewAttrValue] = useState("");
  const [form, setForm] = useState({
    name: "", sku: "", sku_externo: "", description: "", commercial_description: "",
    price: "", unit: "unidad", category_id: "", brand_id: "",
    stock_quantity: "", min_stock: "", requires_stock: false,
    is_premium: false, premium_level: 5, cost_price: "", uses_inputs: false,
    image_url: "",
    genera_diseno: false,
    has_attributes: false,
    diseno_template_url: "",
    _pendingImage: "" as string | undefined,
    _hasComponents: false,
    _orig_image_url: "",   // original value when modal opened (for change detection)
    _orig_commercial_description: "",
  });
  const [selectedInput, setSelectedInput] = useState("");
  const [inputDisplay, setInputDisplay] = useState("");
  const [inputSearchFocus, setInputSearchFocus] = useState(false);
  const [catSearchFocus, setCatSearchFocus] = useState(false);
  const [catFilter, setCatFilter] = useState("");
  const [brandSearchFocus, setBrandSearchFocus] = useState(false);
  const [brandFilter, setBrandFilter] = useState("");
  const [inputQty, setInputQty] = useState("1");
  const [sortField, setSortField] = useState<"name" | "price" | "stock" | "sku" | "category" | "brand">("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  function load() {
    setLoading(true);
    Promise.all([
      fetchJson<Product[]>("/products", true),
      fetchJson<Category[]>("/product-categories"),
      fetchJson<{id:number;name:string}[]>("/product-brands"),
      fetchJson<InputItem[]>("/input-items"),
    ])
      .then(([p, c, b, i]) => {
        setProducts(p);
        setCategoriesFull(c);
        setCategories(c.map(x => ({id: x.id, name: x.name})));
        setBrands(b);
        setAllInputs(i);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function loadComponents(productId: number) {
    try {
      const comps = await fetchJson<ProductComponent[]>(`/products/${productId}/components`);
      setComponents(comps);
      setForm(f => ({ ...f, uses_inputs: comps.length > 0, _hasComponents: comps.length > 0 }));
    } catch { setComponents([]); setForm(f => ({ ...f, uses_inputs: false, _hasComponents: false })); }
  }

  function openNew() {
    setEditing(null);
    setForm({ name: "", sku: "", sku_externo: "", description: "", commercial_description: "", price: "", unit: "unidad", category_id: "", brand_id: "", stock_quantity: "", min_stock: "", requires_stock: false, is_premium: false, premium_level: 5, cost_price: "", uses_inputs: false, image_url: "", genera_diseno: false, diseno_template_url: "", _pendingImage: "", _orig_image_url: "", _orig_commercial_description: "" });
    setComponents([]);
    setPendingComponents([]);
    setSelectedInput("");
    setInputDisplay("");
    setInputQty("1");
    setShowForm(true);
  }

  function openEdit(p: Product) {
    setEditing(p);
    setForm({
      name: p.name || "", sku: p.sku || "", sku_externo: p.sku_externo || "", description: p.description || "",
      price: String(p.price || ""), unit: p.unit || "unidad", category_id: String(p.category_id || ""), brand_id: String(p.brand_id || ""),
      stock_quantity: String(p.stock_quantity || ""), min_stock: String(p.min_stock || ""),
      requires_stock: p.requires_stock || false,
      is_premium: p.is_premium || false, premium_level: p.premium_level || 5,
      cost_price: String(p.cost_price || ""), uses_inputs: false,
      image_url: p.image_url || "",
      commercial_description: p.commercial_description || "",
      genera_diseno: p.genera_diseno || false,
      diseno_template_url: p.diseno_template_url || "",
      has_attributes: p.has_attributes || false,
      _pendingImage: "",
      _hasComponents: false,
      _orig_image_url: p.image_url || "",
      _orig_commercial_description: p.commercial_description || "",
    });
    setSelectedInput("");
    setInputQty("1");
    setShowForm(true);
    loadComponents(p.id);
    Promise.all([
      fetchJson<any[]>("/products/" + p.id + "/attributes"),
      fetchJson<any[]>("/attribute-values"),
    ]).then(([attrs, attrVals]) => {
      setProductAttributes(attrs || []);
      setAllAttributeValues(attrVals || []);
    }).catch(console.error);
  }

  async function addComponent() {
    if (!selectedInput) return;
    const inputName = allInputs.find(i => String(i.id) === selectedInput)?.name || '';
    if (editing) {
      try {
        await postJson(`/products/${editing.id}/components`, { input_item_id: Number(selectedInput), quantity: Number(inputQty) });
        setSelectedInput("");
        setInputDisplay("");
        setInputQty("1");
        loadComponents(editing.id);
      } catch (e) { console.error(e); }
    } else {
      // New product - add to pending list
      setPendingComponents(prev => [...prev, { input_item_id: Number(selectedInput), quantity: Number(inputQty), input_item_name: inputName }]);
      setSelectedInput("");
      setInputDisplay("");
      setInputQty("1");
    }
  }

  async function removeComponent(compId: number) {
    console.log("DEBUG removeComponent:", { compId, editingId: editing?.id });
    if (editing) {
      try {
        const url = `/products/${editing.id}/components/${compId}`;
        console.log("DEBUG DELETE url:", url);
        await deleteJson(url);
        loadComponents(editing.id);
      } catch (e) { console.error(e); }
    } else {
      setPendingComponents(prev => prev.filter(c => c.input_item_id !== compId));
    }
  }

  async function handleSave() {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: form.name, sku: form.sku, sku_externo: form.sku_externo, description: form.description,
        price: Number(form.price) || 0, unit: form.unit, category_id: form.category_id ? Number(form.category_id) : null,
        brand_id: form.brand_id ? Number(form.brand_id) : null,
        stock_quantity: form.requires_stock ? (Number(form.stock_quantity) || 0) : 0,
        min_stock: form.requires_stock ? (Number(form.min_stock) || 0) : 0,
        requires_stock: form.requires_stock,
        has_attributes: form.has_attributes,
        is_premium: form.is_premium, premium_level: form.is_premium ? (Number(form.premium_level) || 5) : null,
        cost_price: form.uses_inputs ? 0 : (Number(form.cost_price) || 0),
        commercial_description: form.commercial_description,
      };
      // Image: if uploading a local file, let /image endpoint handle it (don't include image_url in this PUT)
      const hasLocalImage = !!(form as any)._pendingImage;
      if (!hasLocalImage) {
        payload.image_url = form.image_url;
      }
      payload.genera_diseno = form.genera_diseno;
      payload.diseno_template_url = form.diseno_template_url || null;
      let savedId = editing ? editing.id : null;
      if (editing) {
        await putJson(`/products/${editing.id}`, payload);
      } else {
        const created = await postJson<{id:number}>(`/products`, payload);
        savedId = created.id;
        // Create pending components for new products
        if (pendingComponents.length > 0 && savedId) {
          for (const comp of pendingComponents) {
            try {
              await postJson(`/products/${savedId}/components`, { input_item_id: comp.input_item_id, quantity: comp.quantity });
            } catch (e) { console.error(e); }
          }
          setPendingComponents([]);
        }
      }
      // Upload image if pending file (backend saves image to disk and updates DB with URL)
      if ((form as any)._pendingImage && savedId) {
        const api = (window as any).__API_URL__ || 'http://149.50.148.131:4100/api';
        const resImg = await fetch(`${api}/products/${savedId}/image`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
          body: JSON.stringify({ file: (form as any)._pendingImage }),
        });
        if (!resImg.ok) {
          const errText = await resImg.text();
          console.error('Image upload failed:', resImg.status, errText);
          throw new Error('Error subiendo imagen: ' + errText);
        }
      }
      setShowForm(false);
      load();
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  }

  async function toggleActive(p: Product) {
    try { await putJson(`/products/${p.id}`, { is_active: p.is_active === false }); load(); } catch (e) { console.error(e); }
  }

  async function handleDelete(id: number) {
    if (!confirm("Eliminar este producto?")) return;
    try { await deleteJson(`/products/${id}`); load(); } catch (e) { console.error(e); }
  }

  const computedCost = components.reduce((sum, c) => sum + (Number(c.quantity) * Number(c.default_cost)), 0);

  const filtered = (search
    ? products.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.sku || "").toLowerCase().includes(search.toLowerCase()) ||
        (p.sku_externo || "").toLowerCase().includes(search.toLowerCase())
      )
    : products.filter(p => showAll || p.is_active !== false));

  const grouped: Record<string, Product[]> = {};
  filtered.forEach(p => {
    const cat = p.category_name || "Sin categoria";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(p);
  });

  const discCount = products.filter(p => p.is_active === false).length;

  // Sort for list view
  const sortedList = [...filtered].sort((a, b) => {
    let cmp = 0;
    if (sortField === "name") cmp = (a.name || "").localeCompare(b.name || "");
    else if (sortField === "sku") cmp = (a.sku || "").localeCompare(b.sku || "");
    else if (sortField === "category") cmp = (a.category_name || "").localeCompare(b.category_name || "");
    else if (sortField === "brand") cmp = (a.brand_name || "").localeCompare(b.brand_name || "");
    else if (sortField === "price") cmp = (Number(a.price) || 0) - (Number(b.price) || 0);
    else if (sortField === "stock") cmp = (Number(a.stock_quantity) || 0) - (Number(b.stock_quantity) || 0);
    return sortDir === "asc" ? cmp : -cmp;
  });

  if (loading) return <Loading />;

  return (
    <>
      <style>{`
        @media (max-width: 768px) {
          .prod-table-header, .prod-table-row { grid-template-columns: 2fr 100px 100px 90px !important; }
          .prod-table-header > div:nth-child(2),
          .prod-table-header > div:nth-child(3),
          .prod-table-header > div:nth-child(4),
          .prod-table-row > div:nth-child(2),
          .prod-table-row > div:nth-child(3),
          .prod-table-row > div:nth-child(4) { display: none !important; }
        }
      `}</style>

    <div style={{ width: "100%" }}>
      <PageTitle>📦 PRODUCTOS DEBUG LU TESTEO</PageTitle>
      <div style={{ background: "linear-gradient(135deg, #6c63ff15, #1a1a2e08)", border: "1px solid #6c63ff30", borderRadius: "12px", padding: "14px 18px", marginBottom: "20px", fontSize: "12px", color: "#666", lineHeight: "1.5" }}>
        <strong style={{ color: "#6c63ff" }}>📦 Catalogo de productos</strong><br />
        Carga tus productos, asignales categoria y marca, defini precios y niveles premium.
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nombre, SKU, SKU externo..."
          style={{ flex: 1, maxWidth: "400px", padding: "8px 12px", border: "1px solid #ddd", borderRadius: "8px", fontSize: "13px" }} />
        <span style={{ color: "#888", fontSize: "13px" }}>
          {filtered.length}/{products.length}
          {discCount > 0 && <span style={{ color: "#e74c3c" }}> ({discCount} disc)</span>}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <IconButton variant={viewMode === "cards" ? "primary" : "ghost"} title="Vista tarjetas" onClick={() => setViewMode("cards")}>▦</IconButton>
          <IconButton variant={viewMode === "list" ? "primary" : "ghost"} title="Vista lista" onClick={() => setViewMode("list")}>☰</IconButton>
          <label style={{ fontSize: "12px", color: "#888", display: "flex", alignItems: "center", gap: "4px", marginLeft: "8px", cursor: "pointer" }}>
            <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} />
            Ver todos
          </label>
        </div>
        <IconButton variant="primary" title="Nuevo producto" onClick={openNew}>+</IconButton>
      </div>

      {products.length === 0 ? (
        <Card><div style={{ textAlign: "center", padding: "40px", color: "#aaa" }}>Sin productos cargados.</div></Card>
      ) : viewMode === "cards" ? (
        Object.entries(grouped).map(([catName, prods]) => (
          <div key={catName} style={{ marginBottom: "24px" }}>
            <div style={{ fontSize: "12px", fontWeight: 700, color: "#888", marginBottom: "10px", textTransform: "uppercase", letterSpacing: "1px" }}>{catName}</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "12px" }}>
              {prods.map(p => (
                <Card key={p.id} style={{ opacity: p.is_active === false ? 0.55 : 1, border: p.is_active === false ? "1px dashed #ccc" : undefined, minHeight: "180px" }}>
                  <div style={{ display: "flex", gap: "12px", cursor: "pointer", minHeight: "130px" }} onClick={() => openEdit(p)}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: "14px", marginBottom: "2px", textDecoration: p.is_active === false ? "line-through" : undefined, color: p.is_active === false ? "#aaa" : undefined }}>{p.name}</div>
                      {p.sku && <div style={{ fontSize: "11px", color: p.is_active === false ? "#ccc" : "#aaa" }}>SKU {p.sku}</div>}
                      {p.sku_externo && <div style={{ fontSize: "11px", color: p.is_active === false ? "#ccc" : "#aaa" }}>Ext: {p.sku_externo}</div>}
                      {p.is_active === false && <div style={{ fontSize: "11px", color: "#e74c3c", fontWeight: 700, marginBottom: "4px" }}>⏸ DISCONTINUADO</div>}
                      <div style={{ fontSize: "18px", fontWeight: 700, color: p.is_active === false ? "#ccc" : "#6c63ff", marginTop: "6px" }}>
                        ${Number(p.price).toLocaleString("es-AR")}
                      </div>
                      {p.cost_price > 0 && <div style={{ fontSize: "11px", color: "#888", marginTop: "2px" }}>Costo: ${Number(p.cost_price).toLocaleString("es-AR")}</div>}
                      <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", marginTop: "8px" }}>
                        {p.brand_name && <span style={{ fontSize: "11px", background: "#eee", padding: "2px 6px", borderRadius: "8px" }}>{p.brand_name}</span>}
                        {p.requires_stock && (
                          <span style={{ fontSize: "11px", background: (p.stock_quantity || 0) <= (p.min_stock || 0) ? "#e74c3c22" : "#27ae6022", color: (p.stock_quantity || 0) <= (p.min_stock || 0) ? "#e74c3c" : "#27ae60", padding: "2px 6px", borderRadius: "8px" }}>
                            {(p.stock_quantity || 0)} {p.unit}
                          </span>
                        )}
                        {p.is_premium && p.premium_level && (
                          <span style={{ fontSize: "10px", background: "#f39c1215", color: "#f39c12", padding: "2px 6px", borderRadius: "8px", fontWeight: 600 }}>{p.premium_level}/10</span>
                        )}
                      </div>
                    </div>
                    <div style={{ width: "95px", height: "95px", flexShrink: 0, borderRadius: "8px", overflow: "hidden", border: "1px solid #eee", background: "#f8f8f8", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {p.image_url ? (
                        <img src={p.image_url} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <div style={{ fontSize: "40px", opacity: 0.3 }}>📷</div>
                      )}
                    </div>
                  </div>
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: "2px", marginTop: "6px" }}>
                    <IconButton variant={p.is_active === false ? "primary" : "ghost"} title={p.is_active === false ? "Activar" : "Discontinuar"}
                      onClick={(e) => { e.stopPropagation(); toggleActive(p); }}>
                      {p.is_active === false ? "✓" : "⏸"}
                    </IconButton>
                    <IconButton variant="ghost" title="Editar" onClick={(e) => { e.stopPropagation(); openEdit(p); }}>✏️</IconButton>
                    <IconButton variant="danger" title="Eliminar" onClick={(e) => { e.stopPropagation(); handleDelete(p.id); }}>🗑️</IconButton>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ))
      ) : (
        <div style={{ border: "1px solid #eee", borderRadius: "12px", overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 100px 100px 90px", gap: "0", background: "#f8f8f8", padding: "8px 12px", className: "prod-table-header", fontSize: "11px", fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "1px", borderBottom: "1px solid #eee" }}>
            {[
              { key: "name" as const, label: "Producto" },
              { key: "sku" as const, label: "SKU" },
              { key: "category" as const, label: "Categoria" },
              { key: "brand" as const, label: "Marca" },
              { key: "price" as const, label: "Precio" },
              { key: "stock" as const, label: "Stock" },
            ].map(col => (
              <div key={col.key} onClick={() => { if (sortField === col.key) setSortDir(d => d === "asc" ? "desc" : "asc"); else { setSortField(col.key as typeof sortField); setSortDir("asc"); } }}
                style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
                title="Click para ordenar">
                {col.label}
                {sortField === col.key && (sortDir === "asc" ? " ↑" : " ↓")}
              </div>
            ))}
            <div>Acciones</div>
          </div>
          {sortedList.map(p => (
            <div key={p.id} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 100px 100px 90px", gap: "0", padding: "8px 12px", fontSize: "13px", className: "prod-table-row", alignItems: "center", borderBottom: "1px solid #f5f5f5", background: p.is_active === false ? "#fafafa" : "#fff", opacity: p.is_active === false ? 0.55 : 1 }}>
              <div style={{ fontWeight: 700, color: p.is_active === false ? "#aaa" : undefined, textDecoration: p.is_active === false ? "line-through" : undefined, cursor: "pointer" }} onClick={() => openEdit(p)}>{p.name}</div>
              <div style={{ fontSize: "12px", color: "#aaa" }}>{p.sku || "—"}</div>
              <div style={{ fontSize: "12px", color: "#888" }}>{p.category_name || "Sin"}</div>
              <div style={{ fontSize: "12px", color: "#888" }}>{p.brand_name || "—"}</div>
              <div style={{ fontWeight: 700, color: "#6c63ff" }}>${Number(p.price).toLocaleString("es-AR")}</div>
              <div style={{ fontSize: "12px", color: p.requires_stock && (p.stock_quantity || 0) <= (p.min_stock || 0) ? "#e74c3c" : "#888" }}>
                {p.requires_stock ? `${p.stock_quantity || 0} ${p.unit}` : "—"}
              </div>
              <div style={{ display: "flex", gap: "2px", justifyContent: "flex-end" }}>
                <IconButton variant={p.is_active === false ? "primary" : "ghost"} title={p.is_active === false ? "Activar" : "Discontinuar"}
                  onClick={() => toggleActive(p)}>
                  {p.is_active === false ? "✓" : "⏸"}
                </IconButton>
                <IconButton variant="ghost" title="Editar" onClick={() => openEdit(p)}>✏️</IconButton>
                <IconButton variant="danger" title="Eliminar" onClick={() => handleDelete(p.id)}>🗑️</IconButton>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 100, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "20px", overflowY: "auto" }} onClick={(e) => { if (e.target === e.currentTarget) setShowForm(false); }}>
          <div style={{ background: "#fff", borderRadius: "16px", padding: "24px", width: "100%", maxWidth: "640px", marginTop: "20px" }}>
            <h3 style={{ fontSize: "17px", fontWeight: 700, marginBottom: "20px" }}>{editing ? "Editar producto" : "Nuevo producto"}</h3>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <Input label="Nombre" value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="Nombre del producto" />
              <div style={{ position: "relative" }}>
                <label style={{ fontSize: "12px", fontWeight: 600, display: "block", marginBottom: "4px", color: "#555" }}>Categoria</label>
                <input
                  value={catSearchFocus ? catFilter : (categories.find(c => String(c.id) === form.category_id)?.name || '')}
                  onChange={(e) => { setCatFilter(e.target.value); setCatSearchFocus(true); }}
                  onFocus={() => setCatSearchFocus(true)}
                  placeholder="Buscar categoria..."
                  style={{ width: "100%", padding: "8px 10px", border: "1px solid #ddd", borderRadius: "8px", fontSize: "13px" }}
                />
                {catSearchFocus && (
                  <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: "1px solid #ddd", borderRadius: "8px", zIndex: 10, maxHeight: "160px", overflowY: "auto", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
                    {[{id:null,name:"Sin categoria"}, ...categories].filter(c => !catFilter || c.name.toLowerCase().includes(catFilter.toLowerCase())).length === 0 && (
                      <div style={{ padding: "8px 12px", color: "#aaa", fontSize: "12px" }}>Sin resultados</div>
                    )}
                    {[{id:null,name:"Sin categoria"}, ...categories].filter(c => !catFilter || c.name.toLowerCase().includes(catFilter.toLowerCase())).map(c => (
                      <div key={String(c.id ?? 'null')} onClick={() => { setForm(f => ({ ...f, category_id: String(c.id ?? ''), sku: "" })); setCatFilter(''); setCatSearchFocus(false); }}
                        style={{ padding: "8px 12px", fontSize: "13px", cursor: "pointer", borderBottom: "1px solid #f0f0f0" }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#f5f5ff")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                        {c.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ position: "relative" }}>
                <label style={{ fontSize: "12px", fontWeight: 600, display: "block", marginBottom: "4px", color: "#555" }}>Marca</label>
                <input
                  value={brandSearchFocus ? brandFilter : (brands.find(b => String(b.id) === form.brand_id)?.name || '')}
                  onChange={(e) => { setBrandFilter(e.target.value); setBrandSearchFocus(true); }}
                  onFocus={() => setBrandSearchFocus(true)}
                  placeholder="Buscar marca..."
                  style={{ width: "100%", padding: "8px 10px", border: "1px solid #ddd", borderRadius: "8px", fontSize: "13px" }}
                />
                {brandSearchFocus && (
                  <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: "1px solid #ddd", borderRadius: "8px", zIndex: 10, maxHeight: "160px", overflowY: "auto", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
                    {[{id:null,name:"Sin marca"}, ...brands].filter(b => !brandFilter || b.name.toLowerCase().includes(brandFilter.toLowerCase())).length === 0 && (
                      <div style={{ padding: "8px 12px", color: "#aaa", fontSize: "12px" }}>Sin resultados</div>
                    )}
                    {[{id:null,name:"Sin marca"}, ...brands].filter(b => !brandFilter || b.name.toLowerCase().includes(brandFilter.toLowerCase())).map(b => (
                      <div key={String(b.id ?? 'null')} onClick={() => { setForm(f => ({ ...f, brand_id: String(b.id ?? '') })); setBrandFilter(''); setBrandSearchFocus(false); }}
                        style={{ padding: "8px 12px", fontSize: "13px", cursor: "pointer", borderBottom: "1px solid #f0f0f0" }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#f5f5ff")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                        {b.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <Input label="SKU" value={form.sku} onChange={(v) => setForm({ ...form, sku: v })} placeholder="Codigo interno o se genera solo" />
              <Input label="SKU externo" value={form.sku_externo} onChange={(v) => setForm({ ...form, sku_externo: v })} placeholder="Codigo del proveedor" />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", gridColumn: "1 / -1" }}>
                <Input label="Precio de venta" value={form.price} onChange={(v) => setForm({ ...form, price: v })} placeholder="0.00" type="number" />
                <Input label="Costo manual" value={form.cost_price} onChange={(v) => setForm({ ...form, cost_price: v })} placeholder="0.00" type="number" />
              </div>
            </div>
            <Input label="Unidad" value={form.unit} onChange={(v) => setForm({ ...form, unit: v })} placeholder="unidad, kilo, litro..." />
            <Input label="Descripcion" value={form.description} onChange={(v) => setForm({ ...form, description: v })} placeholder="Descripcion del producto" />

            <div style={{ marginBottom: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                <label style={{ fontSize: "12px", fontWeight: 600, color: "#555" }}>Descripcion comercial para IA</label>
                <span title="Texto que el agente de IA usara para describir este producto al cliente. Sea claro, conciso y orientalo a la venta." style={{ cursor: "help", fontSize: "14px", opacity: 0.6 }}>?</span>
              </div>
              <textarea
                value={form.commercial_description}
                onChange={(e) => setForm(f => ({ ...f, commercial_description: e.target.value }))}
                placeholder="Ej: Remeraoversized de algodon peinado, cuello redondo, ideal para uso diario y verano..."
                rows={3}
                style={{ width: "100%", padding: "8px 10px", border: "1px solid #ddd", borderRadius: "8px", fontSize: "13px", resize: "vertical", fontFamily: "inherit" }}
              />
            </div>

            <div style={{ marginBottom: "12px" }}>
              <label style={{ fontSize: "12px", fontWeight: 600, display: "block", marginBottom: "4px", color: "#555" }}>Imagen del producto</label>
              <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
                <input type="file" accept="image/*" id="img-upload" style={{ display: "none" }}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = () => setForm(f => ({ ...f, _pendingImage: reader.result as string, image_url: '' }));
                    reader.readAsDataURL(file);
                  }} />
                <label htmlFor="img-upload" style={{ padding: "6px 12px", background: "#6c63ff22", color: "#6c63ff", borderRadius: "8px", fontSize: "13px", cursor: "pointer", border: "1px solid #6c63ff40" }}>
                  📁 Subir
                </label>
                <span style={{ color: "#aaa", fontSize: "12px" }}>o</span>
                <input
                  value={form.image_url}
                  onChange={(e) => setForm(f => ({ ...f, image_url: e.target.value, _pendingImage: '' }))}
                  placeholder="Pega URL de imagen..."
                  style={{ flex: 1, minWidth: "180px", padding: "6px 10px", border: "1px solid #ddd", borderRadius: "8px", fontSize: "13px" }}
                />
                {(form.image_url || (form as any)._pendingImage) && <span style={{ fontSize: "11px", color: "#27ae60" }}>✓</span>}
              </div>
              {(form.image_url || (form as any)._pendingImage) && (
                <div style={{ marginTop: "8px", width: "80px", height: "80px", borderRadius: "8px", overflow: "hidden", border: "1px solid #eee" }}>
                  <img src={(form as any)._pendingImage || form.image_url} alt="preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>
              )}
            </div>

            {form.category_id && !form.sku && (() => {
              const cat = categoriesFull.find(c => String(c.id) === form.category_id);
              if (!cat || !cat.auto_generate_sku) return null;
              const code = (cat.sku_prefix || "XXX").toUpperCase();
              const next = (cat.sku_counter || 0) + 1;
              return <div style={{ fontSize: "12px", color: "#27ae60", marginTop: "4px" }}>Se generara: {code}-{String(next).padStart(3,"0")}</div>;
            })()}

            <div style={{ marginTop: "16px", padding: "12px", background: "#f8f8f8", borderRadius: "10px" }}>
              <label style={{ fontSize: "13px", fontWeight: 600, display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                <input type="checkbox" checked={form.is_premium} onChange={(e) => setForm({ ...form, is_premium: e.target.checked })} />
                Producto premium
              </label>
              {form.is_premium && (
                <div style={{ marginTop: "8px" }}>
                  <label style={{ fontSize: "12px", fontWeight: 600, display: "block", marginBottom: "4px", color: "#555" }}>Nivel: {form.premium_level}/10</label>
                  <input type="range" min="1" max="10" value={form.premium_level}
                    onChange={(e) => setForm({ ...form, premium_level: parseInt(e.target.value) })}
                    style={{ width: "100%", accentColor: "#6c63ff" }} />
                  </div>
              )}
            </div>

            <div style={{ marginTop: "12px", padding: "12px", background: "#f8f8f8", borderRadius: "10px" }}>
              <label style={{ fontSize: "13px", fontWeight: 600, display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                <input type="checkbox" checked={form.requires_stock} onChange={(e) => setForm({ ...form, requires_stock: e.target.checked, ...(e.target.checked ? {} : { stock_quantity: 0, min_stock: 0 }) })} />
                Controla stock
              </label>
              {form.requires_stock && (
                <div style={{ marginTop: "8px" }}>
                  {form.has_attributes && <div style={{ fontSize: "11px", color: "#888", marginBottom: "8px" }}>Cuando hay atributos + stock, el stock total sale de la suma de sus atributos.</div>}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                    <Input label="Stock actual" value={form.stock_quantity} onChange={(v) => setForm({ ...form, stock_quantity: v })} placeholder="0" type="number" disabled={form.has_attributes || !form.requires_stock} />
                    <Input label="Stock minimo" value={form.min_stock} onChange={(v) => setForm({ ...form, min_stock: v })} placeholder="0" type="number" disabled={form.has_attributes || !form.requires_stock} />
                  </div>
                </div>
              )}
            </div>

            <div style={{ marginTop: "12px", padding: "12px", background: "#f8f8f8", borderRadius: "10px" }}>
              <label style={{ fontSize: "13px", fontWeight: 600, display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                <input type="checkbox" checked={form.genera_diseno} onChange={(e) => setForm({ ...form, genera_diseno: e.target.checked })} />
                Genera Diseño (vincula a módulo de diseño)
              </label>
              {form.genera_diseno && (
                <div style={{ marginTop: "8px" }}>
                  <label style={{ fontSize: "12px", fontWeight: 600, display: "block", marginBottom: "4px", color: "#555" }}>Plantilla</label>
                  <select
                    value={form.diseno_template_url}
                    onChange={(e) => setForm({ ...form, diseno_template_url: e.target.value })}
                    style={{ width: "100%", padding: "6px 8px", border: "1px solid #ddd", borderRadius: "8px", fontSize: "13px" }}
                  >
                    <option value="">Seleccionar plantilla...</option>
                    <option value="http://149.50.148.131:4100/templates/plantilla-camiseta.png">Camiseta manga corta</option>
                    <option value="http://149.50.148.131:4100/templates/plantilla-musculosa.png">Musculosa / sin mangas</option>
                  </select>
                  {form.diseno_template_url && (
                    <img src={form.diseno_template_url} alt="preview" style={{ marginTop: "8px", maxHeight: "80px", objectFit: "contain", borderRadius: "6px", border: "1px solid #ddd" }} />
                  )}
                </div>
              )}
            </div>

            <label style={{ marginTop: "12px", display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", cursor: "pointer" }}>
              <input type="checkbox" checked={form.has_attributes} onChange={(e) => setForm({ ...form, has_attributes: e.target.checked })} />
              <span>📏 Tiene atributos / talles</span>
            </label>

            {form.has_attributes && (
              <div style={{ marginTop: "12px", padding: "12px", background: "#f8f9fa", borderRadius: "10px" }}>
                <div style={{ fontSize: "13px", fontWeight: 700, marginBottom: "10px" }}>📏 Atributos / Talles</div>
                <div style={{ marginTop: "10px" }}>
                    {productAttributes.length > 0 && (
                      <div style={{ marginBottom: "8px" }}>
                        <div style={{ fontSize: "11px", fontWeight: 700, color: "#888", marginBottom: "4px", textTransform: "uppercase" }}>Atributos vinculados</div>
                        {productAttributes.map((attr: any) => {
                          const attrVal = allAttributeValues.find((v: any) => v.id === attr.attribute_value_id);
                          return (
                            <div key={attr.id} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px", padding: "6px 8px", background: "#fff", borderRadius: "6px", border: "1px solid #eee" }}>
                              <span style={{ flex: 1, fontSize: "12px" }}>{attrVal?.value || `Attr #${attr.attribute_value_id}`}</span>
                              <input
                                type="number"
                                min="0"
                                value={attr.stock_quantity ?? attr.stock_quantity ?? 0}
                                onChange={async (e) => {
                                  const newStock = Number(e.target.value);
                                  try {
                                    await putJson(`/products/${editing?.id}/attributes/${attr.attribute_value_id}/stock`, { stock_quantity: newStock });
                                    setProductAttributes(prev => prev.map(a => a.id === attr.id ? { ...a, stock_quantity: newStock } : a));
                                  } catch (err) { console.error(err); }
                                }}
                                style={{ width: "70px", padding: "4px 6px", border: "1px solid #ddd", borderRadius: "6px", fontSize: "12px", textAlign: "right" }}
                              />
                              <span style={{ fontSize: "11px", color: "#888" }}>stock</span>
                              <button
                                onClick={async () => {
                                  if (!confirm("Eliminar este atributo?")) return;
                                  try {
                                    await deleteJson(`/products/${editing?.id}/attributes/${attr.attribute_value_id}`);
                                    setProductAttributes(prev => prev.filter(a => a.attribute_value_id !== attr.attribute_value_id));
                                  } catch (err) { console.error(err); }
                                }}
                                style={{ padding: "2px 6px", fontSize: "11px", background: "#ff4444", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer" }}
                              >🗑️</button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    <div style={{ display: "flex", gap: "6px", alignItems: "flex-end" }}>
                      <select
                        value={newAttrValue}
                        onChange={(e) => setNewAttrValue(e.target.value)}
                        style={{ flex: 1, padding: "6px 8px", border: "1px solid #ddd", borderRadius: "8px", fontSize: "12px" }}
                      >
                        <option value="">Seleccionar valor de atributo...</option>
                        {allAttributeValues
                          .filter((v: any) => !productAttributes.find((a: any) => a.attribute_value_id === v.id))
                          .map((v: any) => (
                            <option key={v.id} value={String(v.id)}>{v.value}</option>
                          ))}
                      </select>
                      <button
                        onClick={async () => {
                          if (!newAttrValue || !editing) return;
                          try {
                            const created = await postJson<any>(`/products/${editing.id}/attributes`, { attribute_value_id: Number(newAttrValue), stock_quantity: 0 });
                            const newAttr = await fetchJson<any>(`/products/${editing.id}/attributes`);
                            setProductAttributes(newAttr);
                            setNewAttrValue("");
                          } catch (err) { console.error(err); }
                        }}
                        style={{ background: "#6c63ff", color: "#fff", border: "none", borderRadius: "8px", padding: "6px 12px", fontSize: "12px", cursor: "pointer" }}
                      >
                        Vincular
                      </button>
                    </div>
                    {allAttributeValues.length === 0 && (
                      <div style={{ fontSize: "11px", color: "#e74c3c", marginTop: "4px" }}>No hay valores de atributos. Ve a Parametros - Valores de Atributos.</div>
                    )}
                </div>
              </div>
            )}

            <div style={{ marginTop: "12px", padding: "12px", background: "#f8f8f8", borderRadius: "10px" }}>
              <label style={{ fontSize: "13px", fontWeight: 600, display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                <input type="checkbox" checked={form.uses_inputs} onChange={(e) => setForm({ ...form, uses_inputs: e.target.checked })} />
                Usa insumos (costo calculado)
              </label>
              {form.uses_inputs && (
                <div style={{ marginTop: "10px" }}>
                  {(components.length > 0 || pendingComponents.length > 0) && (
                    <div style={{ marginBottom: "8px" }}>
                      {components.map(c => (
                        <div key={c.id} style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px", fontSize: "12px" }}>
                          <span style={{ flex: 1 }}>{c.quantity} x {c.input_item_name} ({c.input_unit})</span>
                          <span style={{ color: "#888" }}>${(Number(c.quantity) * Number(c.default_cost)).toLocaleString("es-AR")}</span>
                          <button onClick={() => removeComponent(c.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#e74c3c", fontSize: "13px" }}>x</button>
                        </div>
                      ))}
                      {pendingComponents.map((c, idx) => {
                        const inputInfo = allInputs.find(i => i.id === c.input_item_id);
                        const unitCost = inputInfo ? Number(inputInfo.default_cost) : 0;
                        return (
                        <div key={"pending-" + idx} style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px", fontSize: "12px", opacity: 0.7 }}>
                          <span style={{ flex: 1 }}>{c.quantity} x {c.input_item_name} ({inputInfo?.unit || ''})</span>
                          <span style={{ color: "#888" }}>${(c.quantity * unitCost).toLocaleString("es-AR")}</span>
                          <button onClick={() => removeComponent(c.input_item_id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#e74c3c", fontSize: "13px" }}>x</button>
                        </div>
                        );
                      })}
                      <div style={{ fontSize: "12px", fontWeight: 700, color: "#6c63ff", marginTop: "4px", borderTop: "1px solid #ddd", paddingTop: "4px" }}>
                        Costo total: ${computedCost.toLocaleString("es-AR")}
                      </div>
                    </div>
                  )}
                  <div style={{ display: "flex", gap: "6px", alignItems: "flex-end" }}>
                    <div style={{ flex: 1, position: "relative" }}>
                      <input
                        value={inputSearchFocus ? inputDisplay : allInputs.find(i => String(i.id) === selectedInput)?.name || ''}
                        onChange={(e) => { setInputDisplay(e.target.value); setInputSearchFocus(true); }}
                        onFocus={() => setInputSearchFocus(true)}
                        onBlur={() => setTimeout(() => setInputSearchFocus(false), 150)}
                        placeholder="Buscar insumo..."
                        style={{ width: "100%", padding: "6px 8px", border: "1px solid #ddd", borderRadius: "8px", fontSize: "12px" }}
                      />
                      {inputSearchFocus && (
                        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: "1px solid #ddd", borderRadius: "8px", zIndex: 10, maxHeight: "160px", overflowY: "auto", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
                          {allInputs.filter(i => !inputDisplay || i.name.toLowerCase().includes(inputDisplay.toLowerCase())).length === 0 && (
                            <div style={{ padding: "8px 12px", color: "#aaa", fontSize: "12px" }}>Sin resultados</div>
                          )}
                          {allInputs.filter(i => !inputDisplay || i.name.toLowerCase().includes(inputDisplay.toLowerCase())).map(i => (
                            <div key={i.id} onClick={() => { setSelectedInput(String(i.id)); setInputDisplay(i.name); setInputSearchFocus(false); }}
                              style={{ padding: "8px 12px", fontSize: "12px", cursor: "pointer", borderBottom: "1px solid #f0f0f0" }}
                              onMouseEnter={(e) => (e.currentTarget.style.background = "#f5f5ff")}
                              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                              {i.name} (${Number(i.default_cost).toLocaleString("es-AR")}/{i.unit})
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div style={{ width: "70px" }}>
                      <input value={inputQty} onChange={(e) => setInputQty(e.target.value)} type="number" min="0" step="0.01" placeholder="1"
                        style={{ width: "100%", padding: "6px 8px", border: "1px solid #ddd", borderRadius: "8px", fontSize: "12px" }} />
                    </div>
                    <button onClick={addComponent} style={{ background: "#6c63ff", color: "#fff", border: "none", borderRadius: "8px", padding: "6px 12px", fontSize: "12px", cursor: "pointer" }}>Agregar</button>
                  </div>
                  {allInputs.length === 0 && <div style={{ fontSize: "11px", color: "#e74c3c", marginTop: "4px" }}>No hay insumos. Ve a Parametros - Insumos.</div>}
                </div>
              )}
              {!form.uses_inputs && <div style={{ marginTop: "8px", color: "#888", fontSize: "12px" }}>El costo manual esta junto al precio de venta.</div>}
            </div>

            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", marginTop: "20px" }}>
              <button onClick={() => setShowForm(false)} style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid #ddd", background: "#fff", cursor: "pointer", fontSize: "14px" }}>Cancelar</button>
              <button onClick={handleSave} disabled={saving} style={{ padding: "8px 20px", borderRadius: "8px", border: "none", background: "#6c63ff", color: "#fff", cursor: "pointer", fontSize: "14px", fontWeight: 600 }}>
                {saving ? "Guardando..." : "Guardar"}
              </button>
              {editing && (
                <button onClick={() => { handleDelete(editing.id); setShowForm(false); }} style={{ padding: "8px 16px", borderRadius: "8px", border: "none", background: "#e74c3c22", color: "#e74c3c", cursor: "pointer", fontSize: "14px" }}>
                  Eliminar
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
}