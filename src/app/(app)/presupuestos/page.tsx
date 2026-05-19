"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { fetchJson, postJson, putJson, deleteJson } from "../../lib";

type BudgetItem = {
  id?: number;
  product_id?: number;
  service_id?: number;
  description: string;
  quantity: number;
  unit_price: number;
  subtotal?: number;
  product_name?: string;
  service_name?: string;
};

type Budget = {
  id: number;
  client_id: number;
  contact_id?: number;
  number: string;
  subtotal: number;
  discount: number;
  total: number;
  notes: string;
  status: string;
  valid_until: string;
  created_at: string;
  updated_at: string;
  converted_to_order_id: number | null;
  client_name?: string;
  items?: BudgetItem[];
};

type Contact = {
  id: number;
  name: string;
  phone?: string;
  email?: string;
};

type Product = {
  id: number;
  name: string;
  price: number;
  discontinued?: number;
};

type Service = {
  id: number;
  name: string;
  price: number;
  description?: string;
  is_active?: boolean;
};

const cardStyle: React.CSSProperties = {
  background: "var(--bg-secondary)",
  borderRadius: "16px",
  padding: "20px",
  border: "1px solid var(--border-color)",
};

const statusColors: Record<string, string> = {
  pendiente: "#3b82f6",
  aprobado: "#22c55e",
  vencido: "#6b7280",
  convertido: "#a855f7",
};

const statusLabels: Record<string, string> = {
  pendiente: "Pendiente",
  aprobado: "Aprobado",
  vencido: "Vencido",
  convertido: "Convertido",
};

export default function PresupuestosPage() {
  const router = useRouter();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [itemTab, setItemTab] = useState<"productos" | "servicios">("productos");
  const [productSearch, setProductSearch] = useState("");
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [detailData, setDetailData] = useState<Budget | null>(null);
  const [editing, setEditing] = useState<Budget | null>(null);
  const [statusFilter, setStatusFilter] = useState("todos");
  const [search, setSearch] = useState("");

  // Form state
  const [formClient, setFormClient] = useState("");
  const [formValidUntil, setFormValidUntil] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formDiscount, setFormDiscount] = useState("0");
  const [formItems, setFormItems] = useState<BudgetItem[]>([]);

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "todos") params.set("status", statusFilter);
      if (search) params.set("q", search);
      const res = await fetchJson<any>("/budgets?" + params.toString());
      setBudgets(res.budgets || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [statusFilter, search]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    Promise.all([
      fetchJson<Contact[]>("/contacts?limit=500"),
      fetchJson<Product[]>("/products"),
      fetchJson<Service[]>("/services?recurring=false").catch(() => []),
    ]).then(([c, p, svc]) => {
      setContacts(c);
      setProducts(p);
      setServices(svc);
    }).catch(() => {});
  }, []);

  function resetForm() {
    setFormClient("");
    setFormValidUntil("");
    setFormNotes("");
    setFormDiscount("0");
    setFormItems([]);
    setProductSearch("");
    setShowProductDropdown(false);
    setItemTab("productos");
    setEditing(null);
  }

  async function handleCreate() {
    if (!formClient) return alert("Seleccioná un cliente");
    if (!formItems.length) return alert("Agregá al menos un producto o servicio");

    const body = {
      client_id: Number(formClient),
      notes: formNotes,
      valid_until: formValidUntil || null,
      discount: Number(formDiscount) || 0,
      items: formItems.map(i => ({
        product_id: i.product_id || null,
        service_id: i.service_id || null,
        description: i.description || i.product_name || i.service_name || "",
        quantity: Number(i.quantity),
        unit_price: Number(i.unit_price),
      })),
    };

    try {
      const url = editing ? `/api/budgets/${editing.id}` : "/api/budgets";
      const method = editing ? "PUT" : "POST";
      editing ? await putJson(url.replace("/api", ""), body) : await postJson("/budgets", body);
      setShowModal(false);
      resetForm();
      load();
    } catch (e: any) { alert("Error: " + e.message); }
  }

  async function handleDelete(id: number) {
    if (!confirm("¿Eliminar presupuesto?")) return;
    try {
      await deleteJson(`/budgets/${id}`);
      load();
    } catch (e: any) { alert("Error: " + e.message); }
  }

  async function downloadPdf(id: number, number?: string) {
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : "";
      const res = await fetch(`/api/budgets/${id}/pdf`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (!res.ok) throw new Error("No se pudo generar el PDF");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Presupuesto-${number || id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      alert("Error: " + (e?.message || "No se pudo descargar el PDF"));
    }
  }

  async function handleConvert(id: number) {
    if (!confirm("¿Convertir este presupuesto en Nota de Venta?")) return;
    try {
      const res = await postJson<any>(`/budgets/${id}/convert`, {});
      alert(`Presupuesto convertido a NV ${res.order_number}`);
      load();
    } catch (e: any) { alert("Error: " + e.message); }
  }

  async function handleStatusChange(id: number, status: string) {
    try {
      await putJson(`/budgets/${id}`, { status });
      load();
      if (showDetail) {
        const d = await fetchJson<any>(`/budgets/${id}`);
        setDetailData(d);
      }
    } catch (e: any) { alert("Error: " + e.message); }
  }

  function openDetail(id: number) {
    setDetailId(id);
    setShowDetail(true);
    fetchJson<any>(`/budgets/${id}`).then(setDetailData).catch(() => {});
  }

  async function openEdit(b: Budget) {
    const full = b.items ? b : await fetchJson<Budget>(`/budgets/${b.id}`);
    setEditing(full);
    setFormClient(String(full.contact_id || full.client_id || ""));
    setFormValidUntil(full.valid_until ? full.valid_until.slice(0, 10) : "");
    setFormNotes(full.notes || "");
    setFormDiscount(String(full.discount || 0));
    setFormItems((full.items || []).map(i => ({
      product_id: i.product_id,
      service_id: i.service_id,
      description: i.description || i.product_name || i.service_name || "",
      product_name: i.product_name,
      service_name: i.service_name,
      quantity: i.quantity,
      unit_price: i.unit_price,
    })));
    setProductSearch("");
    setShowProductDropdown(false);
    setShowModal(true);
  }

  function addProduct(p: Product) {
    if (formItems.find(i => i.product_id === p.id)) return;
    setFormItems([...formItems, { product_id: p.id, description: p.name, product_name: p.name, quantity: 1, unit_price: Number(p.price) || 0 }]);
    setProductSearch("");
    setShowProductDropdown(false);
  }

  function addService(svc: Service) {
    setFormItems([...formItems, { service_id: svc.id, description: svc.name, service_name: svc.name, quantity: 1, unit_price: Number(svc.price) || 0 }]);
    setProductSearch("");
    setShowProductDropdown(false);
  }

  function addManualItem() {
    setFormItems([...formItems, { description: "", quantity: 1, unit_price: 0 }]);
  }

  function removeItem(idx: number) {
    setFormItems(formItems.filter((_, i) => i !== idx));
  }

  function updateItem(idx: number, field: keyof BudgetItem, value: any) {
    const updated = [...formItems];
    (updated[idx] as any)[field] = value;
    setFormItems(updated);
  }

  function calcSubtotal(items: BudgetItem[]) {
    return items.reduce((s, i) => s + Number(i.quantity) * Number(i.unit_price), 0);
  }

  const filteredProducts = products.filter(pr =>
    (!productSearch || pr.name?.toLowerCase().includes(productSearch.toLowerCase())) && pr.discontinued !== 1
  );
  const filteredServices = services.filter(svc =>
    !productSearch || svc.name?.toLowerCase().includes(productSearch.toLowerCase())
  );

  const itemsSubtotal = calcSubtotal(formItems);
  const itemsTotal = Math.max(0, itemsSubtotal - Number(formDiscount || 0));

  const formatMoney = (n: number) => "$" + Math.round(n).toLocaleString("es-AR");

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "var(--text-secondary)" }}>Cargando...</div>;

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" }}>
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>Presupuestos</h1>
          <p style={{ fontSize: "13px", color: "var(--text-secondary)", margin: "6px 0 0" }}>Cotizaciones para clientes</p>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <button onClick={() => router.push("/presupuestos/diseno")}
            style={{ background: "none", border: "1px solid var(--border-color)", borderRadius: "10px", padding: "8px 14px", cursor: "pointer", color: "var(--text-primary)", fontSize: "13px" }}>
            🎨 Diseño PDF
          </button>
          <button onClick={() => { resetForm(); setShowModal(true); }}
            style={{ background: "var(--accent)", border: "none", borderRadius: "10px", padding: "8px 16px", color: "#fff", cursor: "pointer", fontWeight: 700, fontSize: "13px" }}>
            + Nuevo Presupuesto
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "20px", flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: "6px", background: "var(--bg-secondary)", borderRadius: "10px", padding: "4px", border: "1px solid var(--border-color)" }}>
          {["todos", "pendiente", "aprobado", "vencido", "convertido"].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              style={{
                padding: "6px 14px", borderRadius: "8px", border: "none", cursor: "pointer",
                background: statusFilter === s ? "var(--accent)" : "transparent",
                color: statusFilter === s ? "#fff" : "var(--text-secondary)",
                fontSize: "12px", fontWeight: 600, transition: "all 0.15s",
              }}>
              {statusLabels[s] || s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por número o cliente..."
          style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: "10px", padding: "8px 14px", color: "var(--text-primary)", fontSize: "13px", flex: 1, minWidth: "200px" }} />
      </div>

      {/* Table */}
      <div style={{ ...cardStyle, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", minWidth: "700px" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border-color)" }}>
              <th style={{ padding: "10px 12px", textAlign: "left", color: "var(--text-secondary)", fontWeight: 600, fontSize: "11px", letterSpacing: "0.5px" }}>NÚMERO</th>
              <th style={{ padding: "10px 12px", textAlign: "left", color: "var(--text-secondary)", fontWeight: 600, fontSize: "11px", letterSpacing: "0.5px" }}>CLIENTE</th>
              <th style={{ padding: "10px 12px", textAlign: "left", color: "var(--text-secondary)", fontWeight: 600, fontSize: "11px", letterSpacing: "0.5px" }}>FECHA</th>
              <th style={{ padding: "10px 12px", textAlign: "right", color: "var(--text-secondary)", fontWeight: 600, fontSize: "11px", letterSpacing: "0.5px" }}>TOTAL</th>
              <th style={{ padding: "10px 12px", textAlign: "center", color: "var(--text-secondary)", fontWeight: 600, fontSize: "11px", letterSpacing: "0.5px" }}>ESTADO</th>
              <th style={{ padding: "10px 12px", textAlign: "center", color: "var(--text-secondary)", fontWeight: 600, fontSize: "11px", letterSpacing: "0.5px" }}>VENCE</th>
              <th style={{ padding: "10px 12px", textAlign: "right", color: "var(--text-secondary)", fontWeight: 600, fontSize: "11px", letterSpacing: "0.5px" }}>ACCIONES</th>
            </tr>
          </thead>
          <tbody>
            {budgets.map(b => (
              <tr key={b.id} style={{ borderBottom: "1px solid var(--border-color)", transition: "background 0.15s" }}
                onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-input)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                <td style={{ padding: "12px", fontWeight: 700, color: "var(--text-primary)", cursor: "pointer" }} onClick={() => openDetail(b.id)}>{b.number}</td>
                <td style={{ padding: "12px", color: "var(--text-primary)" }}>{b.client_name || "—"}</td>
                <td style={{ padding: "12px", color: "var(--text-secondary)", fontSize: "12px" }}>{new Date(b.created_at).toLocaleDateString("es-AR")}</td>
                <td style={{ padding: "12px", textAlign: "right", fontWeight: 700, color: "var(--text-primary)" }}>{formatMoney(b.total)}</td>
                <td style={{ padding: "12px", textAlign: "center" }}>
                  <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: 600, background: (statusColors[b.status] || "#888") + "22", color: statusColors[b.status] || "#888" }}>
                    {statusLabels[b.status] || b.status}
                  </span>
                </td>
                <td style={{ padding: "12px", textAlign: "center", color: "var(--text-secondary)", fontSize: "12px" }}>
                  {b.valid_until ? new Date(b.valid_until).toLocaleDateString("es-AR") : "—"}
                </td>
                <td style={{ padding: "12px", textAlign: "right" }}>
                  <div style={{ display: "flex", gap: "4px", justifyContent: "flex-end" }}>
                    <button onClick={() => openDetail(b.id)} style={{ background: "none", border: "1px solid var(--border-color)", borderRadius: "6px", padding: "4px 8px", cursor: "pointer", fontSize: "12px", color: "var(--text-primary)" }}>👁</button>
                    {b.status === "pendiente" && (
                      <>
                        <button onClick={() => openEdit(b)} style={{ background: "none", border: "1px solid var(--border-color)", borderRadius: "6px", padding: "4px 8px", cursor: "pointer", fontSize: "12px", color: "var(--text-primary)" }}>✏️</button>
                        <button onClick={() => handleConvert(b.id)} style={{ background: "none", border: "1px solid var(--border-color)", borderRadius: "6px", padding: "4px 8px", cursor: "pointer", fontSize: "12px", color: "var(--text-primary)" }}>📄</button>
                        <button onClick={() => handleDelete(b.id)} style={{ background: "none", border: "1px solid #ef4444", borderRadius: "6px", padding: "4px 8px", cursor: "pointer", fontSize: "12px", color: "#ef4444" }}>🗑</button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {budgets.length === 0 && (
              <tr><td colSpan={7} style={{ padding: "40px", textAlign: "center", color: "var(--text-secondary)", fontSize: "13px" }}>No hay presupuestos aún</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="budget-modal-overlay" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }} onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="budget-modal-card" style={{ background: "var(--bg-secondary)", borderRadius: "16px", padding: "24px", width: "100%", maxWidth: "640px", maxHeight: "90vh", overflowY: "auto" }}>
            <h3 style={{ margin: "0 0 16px", fontSize: "18px", fontWeight: 800, color: "var(--text-primary)" }}>
              {editing ? "Editar Presupuesto" : "Nuevo Presupuesto"}
            </h3>

            {/* Client selector */}
            <div style={{ marginBottom: "12px" }}>
              <label style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-secondary)", margin: "0 0 4px", display: "block" }}>Cliente *</label>
              <select value={formClient} onChange={e => setFormClient(e.target.value)}
                style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--bg-input)", color: "var(--text-primary)", fontSize: "13px" }}>
                <option value="">Seleccionar cliente...</option>
                {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            {/* Validity + Discount */}
            <div className="budget-two-cols" style={{ display: "flex", gap: "12px", marginBottom: "12px" }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-secondary)", margin: "0 0 4px", display: "block" }}>Válido hasta</label>
                <input type="date" value={formValidUntil} onChange={e => setFormValidUntil(e.target.value)}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--bg-input)", color: "var(--text-primary)", fontSize: "13px" }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-secondary)", margin: "0 0 4px", display: "block" }}>Descuento ($)</label>
                <input type="number" value={formDiscount} onChange={e => setFormDiscount(e.target.value)}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--bg-input)", color: "var(--text-primary)", fontSize: "13px" }} />
              </div>
            </div>

            {/* Notes */}
            <div style={{ marginBottom: "12px" }}>
              <label style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-secondary)", margin: "0 0 4px", display: "block" }}>Notas</label>
              <textarea value={formNotes} onChange={e => setFormNotes(e.target.value)} placeholder="Condiciones, observaciones..."
                style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--bg-input)", color: "var(--text-primary)", fontSize: "13px", minHeight: "50px", resize: "vertical" }} />
            </div>

            {/* Items */}
            <div style={{ gridColumn: "1/-1", marginBottom: "12px" }}>
              <div style={{ display: "flex", gap: "4px", marginBottom: "8px" }}>
                <button onClick={() => { setItemTab("productos"); setProductSearch(""); setShowProductDropdown(false); }}
                  style={{ flex: 1, padding: "8px", borderRadius: "8px", border: itemTab === "productos" ? "2px solid var(--accent)" : "1px solid var(--border-color)", background: itemTab === "productos" ? "rgba(108,99,255,0.12)" : "var(--bg-input)", cursor: "pointer", fontSize: "13px", fontWeight: 700, color: itemTab === "productos" ? "var(--accent)" : "var(--text-secondary)" }}>
                  📦 Productos
                </button>
                <button onClick={() => { setItemTab("servicios"); setProductSearch(""); setShowProductDropdown(false); }}
                  style={{ flex: 1, padding: "8px", borderRadius: "8px", border: itemTab === "servicios" ? "2px solid var(--accent)" : "1px solid var(--border-color)", background: itemTab === "servicios" ? "rgba(108,99,255,0.12)" : "var(--bg-input)", cursor: "pointer", fontSize: "13px", fontWeight: 700, color: itemTab === "servicios" ? "var(--accent)" : "var(--text-secondary)" }}>
                  🔧 Servicios
                </button>
              </div>

              <div style={{ position: "relative", marginBottom: "10px" }}>
                <div className="budget-search-row" style={{ display: "flex", gap: "6px" }}>
                  <input
                    value={productSearch}
                    onChange={e => { setProductSearch(e.target.value); setShowProductDropdown(true); }}
                    onFocus={() => setShowProductDropdown(true)}
                    placeholder={itemTab === "productos" ? "Buscar producto..." : "Buscar servicio..."}
                    style={{ flex: 1, padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--bg-input)", color: "var(--text-primary)", fontSize: "13px" }}
                  />
                  <button onClick={() => setShowProductDropdown(!showProductDropdown)}
                    title={itemTab === "productos" ? "Ver productos" : "Ver servicios"}
                    style={{ padding: "8px 10px", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--bg-input)", color: "var(--text-primary)", cursor: "pointer", fontSize: "14px" }}>
                    🔍
                  </button>
                  <button onClick={addManualItem}
                    title="Agregar item manual"
                    style={{ padding: "8px 10px", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--bg-input)", color: "var(--text-primary)", cursor: "pointer", fontSize: "13px", fontWeight: 700 }}>
                    + Manual
                  </button>
                </div>
                {showProductDropdown && (
                  <div style={{ position: "absolute", top: "100%", left: 0, right: 0, border: "1px solid var(--border-color)", borderRadius: "8px", marginTop: "4px", maxHeight: "220px", overflowY: "auto", background: "var(--bg-secondary)", zIndex: 20, boxShadow: "0 8px 24px rgba(0,0,0,0.18)" }}>
                    {itemTab === "productos" ? (
                      filteredProducts.length === 0 ? <div style={{ padding: "12px", fontSize: "12px", color: "var(--text-secondary)", textAlign: "center" }}>Sin productos</div> :
                      filteredProducts.slice(0, 20).map(p => (
                        <div key={p.id} onClick={() => addProduct(p)}
                          style={{ padding: "10px 14px", cursor: "pointer", fontSize: "13px", borderBottom: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", gap: "12px", color: "var(--text-primary)" }}
                          onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-input)")}
                          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                          <span>{p.name}</span>
                          <span style={{ color: "var(--text-secondary)", fontWeight: 700 }}>{formatMoney(Number(p.price))}</span>
                        </div>
                      ))
                    ) : (
                      filteredServices.length === 0 ? <div style={{ padding: "12px", fontSize: "12px", color: "var(--text-secondary)", textAlign: "center" }}>Sin servicios</div> :
                      filteredServices.slice(0, 20).map(svc => (
                        <div key={svc.id} onClick={() => addService(svc)}
                          style={{ padding: "10px 14px", cursor: "pointer", fontSize: "13px", borderBottom: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", gap: "12px", color: "var(--text-primary)" }}
                          onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-input)")}
                          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                          <span>🔧 {svc.name}</span>
                          <span style={{ color: "var(--text-secondary)", fontWeight: 700 }}>{formatMoney(Number(svc.price))}</span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {formItems.length > 0 && (
                <div style={{ border: "1px solid var(--border-color)", borderRadius: "8px", overflow: "hidden" }}>
                  {formItems.map((item, idx) => (
                    <div className="budget-item-row" key={idx} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 10px", borderBottom: idx === formItems.length - 1 ? "none" : "1px solid var(--border-color)", fontSize: "13px", flexWrap: "wrap" }}>
                      <input className="budget-item-desc" value={item.description} onChange={e => updateItem(idx, "description", e.target.value)} placeholder="Descripción"
                        style={{ flex: "1 1 220px", padding: "6px 10px", borderRadius: "6px", border: "1px solid var(--border-color)", background: "var(--bg-input)", color: "var(--text-primary)", fontSize: "12px" }} />
                      <input className="budget-item-qty" type="number" min={0} value={item.quantity} onChange={e => updateItem(idx, "quantity", e.target.value)}
                        style={{ width: "64px", padding: "6px 8px", borderRadius: "6px", border: "1px solid var(--border-color)", background: "var(--bg-input)", color: "var(--text-primary)", fontSize: "12px", textAlign: "right" }} />
                      <span style={{ color: "var(--text-secondary)", fontSize: "12px" }}>×</span>
                      <input className="budget-item-price" type="number" min={0} value={item.unit_price} onChange={e => updateItem(idx, "unit_price", e.target.value)}
                        style={{ width: "92px", padding: "6px 8px", borderRadius: "6px", border: "1px solid var(--border-color)", background: "var(--bg-input)", color: "var(--text-primary)", fontSize: "12px", textAlign: "right" }} />
                      <span style={{ minWidth: "84px", textAlign: "right", fontSize: "12px", color: "var(--text-primary)", fontWeight: 700 }}>
                        {formatMoney(Number(item.quantity) * Number(item.unit_price))}
                      </span>
                      {item.service_id && <span style={{ background: "rgba(34,197,94,0.14)", color: "#22c55e", borderRadius: "8px", padding: "4px 8px", fontSize: "11px", fontWeight: 700 }}>🔧 Servicio</span>}
                      {item.product_id && <span style={{ background: "rgba(59,130,246,0.14)", color: "#3b82f6", borderRadius: "8px", padding: "4px 8px", fontSize: "11px", fontWeight: 700 }}>📦 Producto</span>}
                      <button onClick={() => removeItem(idx)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "14px", color: "#ef4444", padding: "4px" }}>✕</button>
                    </div>
                  ))}
                  <div style={{ padding: "8px 12px", fontWeight: 800, fontSize: "13px", textAlign: "right", background: "var(--bg-input)", color: "var(--text-primary)" }}>
                    Subtotal: {formatMoney(itemsSubtotal)}
                  </div>
                </div>
              )}
            </div>

            {/* Totals */}
            <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "12px", marginBottom: "16px", textAlign: "right" }}>
              <p style={{ margin: "2px 0", fontSize: "13px", color: "var(--text-secondary)" }}>Subtotal: {formatMoney(itemsSubtotal)}</p>
              {Number(formDiscount) > 0 && <p style={{ margin: "2px 0", fontSize: "13px", color: "#ef4444" }}>Descuento: -{formatMoney(Number(formDiscount))}</p>}
              <p style={{ margin: "4px 0 0", fontSize: "18px", fontWeight: 800, color: "var(--accent)" }}>Total: {formatMoney(itemsTotal)}</p>
            </div>

            {/* Actions */}
            <div className="budget-actions" style={{ display: "flex", gap: "8px" }}>
              <button onClick={() => { setShowModal(false); resetForm(); }}
                style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "1px solid var(--border-color)", background: "transparent", cursor: "pointer", color: "var(--text-primary)", fontSize: "13px" }}>Cancelar</button>
              <button onClick={handleCreate}
                style={{ flex: 2, padding: "10px", borderRadius: "8px", border: "none", background: "var(--accent)", color: "#fff", cursor: "pointer", fontWeight: 700, fontSize: "13px" }}>
                {editing ? "Guardar cambios" : "Crear Presupuesto"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetail && detailData && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }} onClick={e => e.target === e.currentTarget && setShowDetail(false)}>
          <div style={{ background: "var(--bg-secondary)", borderRadius: "16px", padding: "24px", width: "100%", maxWidth: "560px", maxHeight: "80vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "var(--text-primary)" }}>{detailData.number}</h3>
                <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: "12px", fontSize: "11px", fontWeight: 600, marginTop: "4px", background: (statusColors[detailData.status] || "#888") + "22", color: statusColors[detailData.status] || "#888" }}>
                  {statusLabels[detailData.status] || detailData.status}
                </span>
              </div>
              <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", alignItems: "center" }}>
                {detailData.status !== "convertido" && (
                  <button onClick={() => { setShowDetail(false); openEdit(detailData); }}
                    style={{ background: "none", border: "1px solid var(--border-color)", borderRadius: "6px", padding: "4px 8px", cursor: "pointer", fontSize: "12px", color: "var(--text-primary)" }}>✏️</button>
                )}
                {detailData.status === "pendiente" && (
                  <button onClick={() => { setShowDetail(false); handleConvert(detailData.id); }}
                    style={{ background: "var(--accent)", border: "none", borderRadius: "6px", padding: "6px 12px", cursor: "pointer", color: "#fff", fontSize: "12px", fontWeight: 600 }}>Convertir a NV</button>
                )}
                <div style={{ display: "flex", gap: "3px" }}>
                  {["pendiente", "aprobado", "vencido"].filter(st => st !== detailData.status).map(st => (
                    <button key={st} onClick={() => handleStatusChange(detailData.id, st)}
                      style={{ padding: "4px 8px", borderRadius: "6px", border: "1px solid var(--border-color)", background: (statusColors[st] || "#888") + "22", cursor: "pointer", fontSize: "11px", fontWeight: 600, color: statusColors[st] || "#888" }}>
                      {statusLabels[st] || st}
                    </button>
                  ))}
                </div>
                <button onClick={() => downloadPdf(detailData.id, detailData.number)}
                  style={{ background: "none", border: "1px solid var(--border-color)", borderRadius: "6px", padding: "4px 8px", cursor: "pointer", fontSize: "12px", color: "var(--text-primary)" }}>📄 PDF</button>
              </div>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <p style={{ margin: "2px 0", fontSize: "13px", color: "var(--text-primary)" }}><strong>Cliente:</strong> {detailData.client_name || "—"}</p>
              <p style={{ margin: "2px 0", fontSize: "13px", color: "var(--text-primary)" }}><strong>Fecha:</strong> {new Date(detailData.created_at).toLocaleDateString("es-AR")}</p>
              {detailData.valid_until && <p style={{ margin: "2px 0", fontSize: "13px", color: "var(--text-primary)" }}><strong>Válido hasta:</strong> {new Date(detailData.valid_until).toLocaleDateString("es-AR")}</p>}
              {detailData.notes && <p style={{ margin: "2px 0", fontSize: "13px", color: "var(--text-primary)" }}><strong>Notas:</strong> {detailData.notes}</p>}
              {detailData.converted_to_order_id && <p style={{ margin: "2px 0", fontSize: "13px", color: "#a855f7" }}><strong>Convertido a NV #{detailData.converted_to_order_id}</strong></p>}
            </div>

            {/* Items */}
            <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "12px" }}>
              <p style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-secondary)", marginBottom: "8px" }}>ITEMS</p>
              {(detailData.items || []).map((item, idx) => (
                <div key={idx} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--border-color)" }}>
                  <div>
                    <span style={{ fontSize: "13px", color: "var(--text-primary)" }}>{item.product_name || item.service_name || item.description}</span>
                    <span style={{ fontSize: "11px", color: "var(--text-secondary)", marginLeft: "6px" }}>x{Number(item.quantity).toFixed(2)}</span>
                  </div>
                  <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>{formatMoney(Number(item.subtotal || Number(item.quantity) * Number(item.unit_price)))}</span>
                </div>
              ))}
              <div style={{ borderTop: "2px solid var(--border-color)", marginTop: "8px", paddingTop: "8px", textAlign: "right" }}>
                <p style={{ margin: "2px 0", fontSize: "13px", color: "var(--text-secondary)" }}>Subtotal: {formatMoney(detailData.subtotal)}</p>
                {detailData.discount > 0 && <p style={{ margin: "2px 0", fontSize: "13px", color: "#ef4444" }}>Descuento: -{formatMoney(detailData.discount)}</p>}
                <p style={{ margin: "4px 0 0", fontSize: "18px", fontWeight: 800, color: "var(--accent)" }}>Total: {formatMoney(detailData.total)}</p>
              </div>
            </div>

            <button onClick={() => setShowDetail(false)}
              style={{ width: "100%", marginTop: "16px", padding: "10px", borderRadius: "8px", border: "1px solid var(--border-color)", background: "transparent", cursor: "pointer", color: "var(--text-primary)", fontSize: "13px" }}>Cerrar</button>
          </div>
        </div>
      )}
    </div>
  );
}
