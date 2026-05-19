"use client";

const API = process.env.NEXT_PUBLIC_API_URL || "/api";

import { useEffect, useState } from "react";
import { fetchJson } from "../../lib";
import * as XLSX from "xlsx";

type Delivery = {
  id: number; order_id: number; address: string; scheduled_date: string;
  delivered_date: string; order_status_id: number; status_name: string; notes: string; created_at: string;
  order_number: string; order_total: number;
  contact_name: string; contact_phone: string;
  status_color: string; delivery_fee: number;
};

type Stats = {
  pending_count: number; in_transit_count: number;
  delivered_count: number; cancelled_count: number; total_count: number;
};

type OrderStatus = {
  id: number; name: string; color: string; sort_order: number; is_active: boolean;
};

const STATUS_COLORS: Record<string, string> = {
  "Pendiente": "#f39c12",
  "En camino": "#3498db",
  "Entregado": "#27ae60",
  "Cancelado": "#e74c3c",
};

export default function EntregasPage() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [orderStatuses, setOrderStatuses] = useState<OrderStatus[]>([]);
  const [stats, setStats] = useState<Stats>({ pending_count: 0, in_transit_count: 0, delivered_count: 0, cancelled_count: 0, total_count: 0 });
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "cards">("cards");
  const [showStatusEdit, setShowStatusEdit] = useState<number | null>(null);
  const [showAddressEdit, setShowAddressEdit] = useState<number | null>(null);
  const [detailDelivery, setDetailDelivery] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [editStatus, setEditStatus] = useState("");
  const [editAddress, setEditAddress] = useState({ address: "", notes: "" });
  const [showNew, setShowNew] = useState(false);
  const [newForm, setNewForm] = useState({ order_id: "", address: "", scheduled_date: "", notes: "", delivery_fee: "" });
  const [creating, setCreating] = useState(false);

  function load() {
    setLoading(true);
    fetchJson<Delivery[]>('/deliveries')
      .then(data => { setDeliveries(data); setLoading(false); })
      .catch(e => { console.error(e); setLoading(false); });
    fetchJson<Stats>('/deliveries/stats')
      .then(data => setStats(data))
      .catch(e => console.error(e));
    fetchJson<OrderStatus[]>('/order-statuses')
      .then(data => setOrderStatuses(data))
      .catch(e => console.error(e));
  }

  useEffect(() => { load(); }, []);

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    fetch("${API}/deliveries", {
      method: "POST",
      headers: { "Authorization": "Bearer " + (localStorage.getItem("token")||""), "Content-Type": "application/json" },
      body: JSON.stringify({
        order_id: Number(newForm.order_id),
        address: newForm.address,
        scheduled_date: newForm.scheduled_date || null,
        notes: newForm.notes,
        delivery_fee: Number(newForm.delivery_fee) || 0,
      }),
    })
      .then(() => {
        setShowNew(false);
        setNewForm({ order_id: "", address: "", scheduled_date: "", notes: "", delivery_fee: "" });
        load();
      })
      .catch(() => alert("Error al crear entrega"))
      .finally(() => setCreating(false));
  }

  function handleConfirm(id: number) {
    if (!confirm("¿Confirmar entrega?")) return;
    fetch("${API}/deliveries/" + id + "/confirm", { method: "POST", headers: { "Authorization": "Bearer " + (localStorage.getItem("token")||""), "Content-Type": "application/json" } })
      .then(() => load())
      .catch(() => alert("Error al confirmar"));
  }

  function handleCancel(id: number) {
    if (!confirm("¿Cancelar entrega? Esto revertirá el stock de los productos.")) return;
    fetch(`${API}/deliveries/${id}/cancel`, { method: "POST", headers: { "Authorization": "Bearer " + (localStorage.getItem("token")||""), "Content-Type": "application/json" } })
      .then(() => load())
      .catch(e => alert("Error al cancelar: " + e));
  }

  function openStatusEdit(d: Delivery) { setShowStatusEdit(d.id); setEditStatus(String(d.order_status_id)); }
  function saveStatusEdit(id: number) {
    fetch(`${API}/deliveries/${id}`, {
      method: "PUT",
      headers: { "Authorization": "Bearer " + (localStorage.getItem("token")||""), "Content-Type": "application/json" },
      body: JSON.stringify({ order_status_id: Number(editStatus) }),
    }).then(() => { setShowStatusEdit(null); load(); }).catch(e => alert("Error: " + e));
  }

  function openAddressEdit(d: Delivery) { setShowAddressEdit(d.id); setEditAddress({ address: d.address || "", notes: d.notes || "" }); }
  function saveAddressEdit(id: number) {
    fetch(`${API}/deliveries/${id}`, {
      method: "PUT",
      headers: { "Authorization": "Bearer " + (localStorage.getItem("token")||""), "Content-Type": "application/json" },
      body: JSON.stringify({ address: editAddress.address, notes: editAddress.notes }),
    }).then(() => { setShowAddressEdit(null); load(); }).catch(e => alert("Error: " + e));
  }

  function handleStatusChange(id: number, newStatus: string) {
    fetch(`${API}/deliveries/${id}`, {
      method: "PUT",
      headers: { "Authorization": "Bearer " + (localStorage.getItem("token")||""), "Content-Type": "application/json" },
      body: JSON.stringify({ order_status_id: Number(newStatus) }),
    })
      .then(r => { if (!r.ok) throw new Error(`status ${r.status}`); return r.json(); })
      .then(() => load())
      .catch(() => alert("Error al actualizar estado"));
  }

  const filtered = activeFilter
    ? deliveries.filter(d => d.status_name?.toLowerCase() === activeFilter.toLowerCase())
    : deliveries;

  function getStatusColor(status: string) {
    return STATUS_COLORS[status] || "#888";
  }

  function getDelayDays(scheduled_date: string): number | null {
    if (!scheduled_date) return null;
    const today = new Date();
    const scheduled = new Date(scheduled_date );
    const diff = Math.floor((today.getTime() - scheduled.getTime()) / 86400000);
    return diff > 0 ? diff : null;
  }

  const tabs = [
    { label: "Todas", value: "" },
    { label: "Pendiente", value: "pedido", count: stats.pending_count },
    { label: "En camino", value: "En camino", count: stats.in_transit_count },
    { label: "Entregado", value: "Entregado", count: stats.delivered_count },
    { label: "Cancelado", value: "Cancelado", count: stats.cancelled_count },
  ];

  function handleExportExcel() {
    const data = filtered.map(d => ({
      "NV": d.order_number || "-",
      "Estado": d.status_name || "-",
      "Cliente": d.contact_name || "-",
      "Teléfono": d.contact_phone || "-",
      "Dirección": d.address || "-",
      "Fecha programada": d.scheduled_date ? new Date(d.scheduled_date).toLocaleDateString("es-AR") : "-",
      "Fecha entregada": d.delivered_date ? new Date(d.delivered_date).toLocaleDateString("es-AR") : "-",
      "Total pedido": Number(d.order_total || 0),
      "Costo envío": Number(d.delivery_fee || 0),
      "Notas": d.notes || "-",
      "Creada": d.created_at ? new Date(d.created_at).toLocaleString("es-AR") : "-",
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Entregas");
    const filterName = activeFilter ? activeFilter.replace(/\s+/g, "_") : "todas";
    XLSX.writeFile(wb, `Entregas_${filterName}.xlsx`);
  }

  return (
    <div style={{ maxWidth: "900px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <h1 style={{ margin: 0, fontSize: "22px", fontWeight: 900 }}>🚚 Entregas</h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", justifyContent: "flex-end" }}>
          <p style={{ margin: 0, fontSize: "13px", color: "#888" }}>
            {stats.total_count} total
          </p>
          <button
            onClick={handleExportExcel}
            disabled={filtered.length === 0}
            style={{
              padding: "7px 12px",
              borderRadius: "8px",
              border: "none",
              cursor: filtered.length === 0 ? "not-allowed" : "pointer",
              fontSize: "12px",
              background: filtered.length === 0 ? "#cfcfcf" : "#27ae60",
              color: "#fff",
              fontWeight: 700,
              opacity: filtered.length === 0 ? 0.7 : 1,
            }}
          >
            ⬇ Excel
          </button>
          <div style={{ display: "flex", gap: "4px", background: "#e0e0e0", borderRadius: "8px", padding: "3px" }}>
            <button onClick={() => setViewMode("list")} title="Lista" style={{ padding: "4px 10px", borderRadius: "6px", border: "none", cursor: "pointer", fontSize: "13px", background: viewMode === "list" ? "#1a1a2e" : "transparent", color: viewMode === "list" ? "#fff" : "#555", fontWeight: 600 }}>☰</button>
            <button onClick={() => setViewMode("cards")} title="Tarjetas" style={{ padding: "4px 10px", borderRadius: "6px", border: "none", cursor: "pointer", fontSize: "13px", background: viewMode === "cards" ? "#1a1a2e" : "transparent", color: viewMode === "cards" ? "#fff" : "#555", fontWeight: 600 }}>⊞</button>
          </div>
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
        {tabs.map(tab => (
          <button
            key={tab.value}
            onClick={() => setActiveFilter(tab.value)}
            style={{
              padding: "6px 14px",
              borderRadius: "20px",
              border: "none",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: 600,
              background: activeFilter === tab.value ? "#1a1a2e" : "#e0e0e0",
              color: activeFilter === tab.value ? "#fff" : "#333",
            }}
          >
            {tab.label}{tab.count !== undefined ? ` (${tab.count})` : ""}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <p style={{ color: "#888" }}>Cargando...</p>
      ) : filtered.length === 0 ? (
        <div style={{ background: "#fff", borderRadius: "12px", padding: "40px", textAlign: "center", color: "#888" }}>
          No hay entregas{activeFilter ? ` con estado "${activeFilter}"` : ""}
        </div>
      ) : viewMode === "cards" ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "12px" }}>
          {filtered.map(d => {
            const delay = getDelayDays(d.scheduled_date);
            const statusColor = getStatusColor(d.status_name);
            return (
              <div key={d.id} style={{ background: "#fff", borderRadius: "12px", padding: "16px", boxShadow: "0 1px 4px rgba(0,0,0,0.08)", border: "1px solid #f0f0f0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2px" }}>
                      <div style={{ fontWeight: 800, fontSize: "15px", color: "#1a1a2e" }}>{d.order_number}</div>
                      <button onClick={() => { setDetailDelivery(d); setLoadingDetail(true); fetchJson<any>(`/deliveries/${d.id}/detail`).then(data => setDetailDelivery(data)).catch(() => { alert('Error al cargar detalle'); setDetailDelivery(null); }).finally(() => setLoadingDetail(false)); }} style={{ background: "#6c63ff", border: "none", borderRadius: "6px", width: "28px", height: "28px", color: "#fff", cursor: "pointer", fontSize: "13px", display: "flex", alignItems: "center", justifyContent: "center" }}>👁</button>
                    </div>
                    <div style={{ fontSize: "12px", color: "#888", marginTop: "2px" }}>{d.contact_name || "Sin cliente"}</div>
                  </div>
                  <span style={{ background: statusColor, color: "#fff", borderRadius: "12px", padding: "3px 10px", fontSize: "11px", fontWeight: 700 }}>{d.status_name}</span>
                </div>
                <div style={{ fontSize: "13px", color: "#555", marginBottom: "6px" }}>📍 {d.address || "—"}</div>
                <div style={{ fontSize: "13px", color: "#555", marginBottom: "6px" }}>📅 {d.scheduled_date ? new Date(d.scheduled_date ).toLocaleDateString("es-AR") : "—"} {delay ? <span style={{ color: "#e74c3c", fontWeight: 700 }}> +{delay}d</span> : ""}</div>
                <div style={{ fontWeight: 700, fontSize: "16px", marginBottom: "12px", color: "#1a1a2e" }}>${Number(d.order_total || 0).toLocaleString("es-AR")}</div>
                <div style={{ display: "flex", gap: "5px", flexWrap: "wrap", marginTop: "8px", borderTop: "1px solid #f0f0f0", paddingTop: "10px" }}>
                  <button onClick={() => openStatusEdit(d)} style={{ background: "#1a1a2e", border: "none", borderRadius: "6px", padding: "5px 10px", color: "#fff", cursor: "pointer", fontSize: "12px", fontWeight: 600 }}>✏️ Estado</button>
                  <button onClick={() => openAddressEdit(d)} style={{ background: "#8e44ad", border: "none", borderRadius: "6px", padding: "5px 10px", color: "#fff", cursor: "pointer", fontSize: "12px", fontWeight: 600 }}>📍 Domicilio</button>
                  {d.status_name !== "Entregado" && d.status_name !== "Cancelado" && <button onClick={() => handleConfirm(d.id)} style={{ background: "#27ae60", border: "none", borderRadius: "6px", padding: "5px 10px", color: "#fff", cursor: "pointer", fontSize: "12px", fontWeight: 600 }}>✓ Entregado</button>}
                  {d.status_name === "Entregado" && <span style={{ color: "#27ae60", fontSize: "12px", fontWeight: 600 }}>✓ Entregado</span>}
                  {d.status_name === "Cancelado" && <span style={{ color: "#e74c3c", fontSize: "12px", fontWeight: 600 }}>✕ Cancelado</span>}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ background: "#fff", borderRadius: "12px", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr style={{ background: "#f5f5f5" }}>
                <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 700, color: "#555", fontSize: "11px" }}>ESTADO</th>
                <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 700, color: "#555", fontSize: "11px" }}>PEDIDO</th>
                <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 700, color: "#555", fontSize: "11px" }}>CLIENTE</th>
                <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 700, color: "#555", fontSize: "11px" }}>DIRECCIÓN</th>
                <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 700, color: "#555", fontSize: "11px" }}>FECHA</th>
                <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, color: "#555", fontSize: "11px" }}>TOTAL</th>
                <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, color: "#555", fontSize: "11px" }}>ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(d => {
                const delay = getDelayDays(d.scheduled_date);
                const statusColor = getStatusColor(d.status_name);
                return (
                  <tr key={d.id} style={{ borderTop: "1px solid #f0f0f0" }}>
                    <td style={{ padding: "10px 12px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ background: statusColor, color: "#fff", borderRadius: "12px", padding: "3px 10px", fontSize: "11px", fontWeight: 700, whiteSpace: "nowrap" }}>
                          {d.status_name}
                        </span>
                        {delay !== null && d.status_name !== "Entregado" && d.status_name !== "Cancelado" && (
                          <span style={{ background: delay >= 3 ? "#e74c3c" : delay >= 1 ? "#f39c12" : "#27ae60", color: "#fff", borderRadius: "8px", padding: "2px 6px", fontSize: "10px", fontWeight: 700 }}>
                            +{delay}d
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      <div style={{ fontWeight: 700, color: "#1a1a2e" }}>{d.order_number}</div>
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      <div style={{ fontWeight: 600 }}>{d.contact_name || "—"}</div>
                      {d.contact_phone && <div style={{ fontSize: "11px", color: "#888" }}>{d.contact_phone}</div>}
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      <div style={{ fontSize: "12px" }}>{d.address || "—"}</div>
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      <div style={{ fontSize: "12px" }}>{d.scheduled_date ? new Date(d.scheduled_date ).toLocaleDateString("es-AR") : "—"}</div>
                      {d.delivered_date && (
                        <div style={{ fontSize: "11px", color: "#27ae60" }}>
                          ✓ {new Date(d.delivered_date ).toLocaleDateString("es-AR")}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: "10px 12px", textAlign: "right" }}>
                      <div style={{ fontWeight: 700 }}>${Number(d.order_total || 0).toLocaleString("es-AR")}</div>
                      {Number(d.delivery_fee) > 0 && (
                        <div style={{ fontSize: "10px", color: "#888" }}>+${Number(d.delivery_fee).toLocaleString("es-AR")} env.</div>
                      )}
                    </td>
                    <td style={{ padding: "10px 12px", textAlign: "right", whiteSpace: "nowrap" }}>
                      <div style={{ display: "flex", gap: "4px", flexWrap: "nowrap" }}>
                    <button onClick={() => openStatusEdit(d)} title="Editar estado" style={{ background: "#1a1a2e", border: "none", borderRadius: "6px", padding: "4px 8px", color: "#fff", cursor: "pointer", fontSize: "11px", fontWeight: 600, whiteSpace: "nowrap" }}>✏️</button>
                    <button onClick={() => openAddressEdit(d)} title="Editar domicilio" style={{ background: "#8e44ad", border: "none", borderRadius: "6px", padding: "4px 8px", color: "#fff", cursor: "pointer", fontSize: "11px", fontWeight: 600 }}>📍</button>
                    {d.status_name !== "Entregado" && d.status_name !== "Cancelado" && <button onClick={() => handleConfirm(d.id)} title="Marcar entregado" style={{ background: "#27ae60", border: "none", borderRadius: "6px", padding: "4px 8px", color: "#fff", cursor: "pointer", fontSize: "11px", fontWeight: 600 }}>✓</button>}
                    {d.status_name === "Entregado" && <span style={{ color: "#27ae60", fontSize: "16px" }}>✓</span>}
                    {d.status_name === "Cancelado" && <span style={{ color: "#e74c3c", fontSize: "16px" }}>✕</span>}
                  </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Status Edit Modal */}
      {showStatusEdit && (() => {
        const d = filtered.find(x => x.id === showStatusEdit);
        return d ? (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }} onClick={e => { if (e.target === e.currentTarget) setShowStatusEdit(null); }}>
          <div style={{ background: "#fff", borderRadius: "16px", padding: "24px", width: "100%", maxWidth: "360px" }}>
            <h3 style={{ margin: "0 0 12px", fontSize: "16px", fontWeight: 800 }}>✏️ Cambiar Estado</h3>
            <div style={{ fontSize: "13px", color: "#888", marginBottom: "12px" }}>{d.order_number} — {d.contact_name || "Sin cliente"}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px" }}>
              {orderStatuses.map(s => (
                <label key={s.id} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 12px", borderRadius: "8px", border: editStatus === String(s.id) ? "2px solid #27ae60" : "1px solid #ddd", cursor: "pointer", background: editStatus === String(s.id) ? "#f0fff4" : "#fff" }}>
                  <input type="radio" name="status" value={String(s.id)} checked={editStatus === String(s.id)} onChange={() => setEditStatus(String(s.id))} />
                  <span style={{ fontWeight: 600 }}>{s.name}</span>
                </label>
              ))}
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={() => setShowStatusEdit(null)} style={{ flex: 1, padding: "8px", borderRadius: "8px", border: "1px solid #ddd", background: "#fff", cursor: "pointer" }}>Cancelar</button>
              <button onClick={() => saveStatusEdit(showStatusEdit)} style={{ flex: 2, padding: "8px", borderRadius: "8px", border: "none", background: "#27ae60", color: "#fff", cursor: "pointer", fontWeight: 700 }}>Guardar</button>
            </div>
          </div>
        </div>
        ) : null;
      })()}

      {/* Address Edit Modal */}
      {showAddressEdit && (() => {
        const d = filtered.find(x => x.id === showAddressEdit);
        return d ? (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }} onClick={e => { if (e.target === e.currentTarget) setShowAddressEdit(null); }}>
          <div style={{ background: "#fff", borderRadius: "16px", padding: "24px", width: "100%", maxWidth: "400px" }}>
            <h3 style={{ margin: "0 0 12px", fontSize: "16px", fontWeight: 800 }}>📍 Editar Domicilio</h3>
            <div style={{ fontSize: "13px", color: "#888", marginBottom: "12px" }}>{d.order_number} — {d.contact_name || "Sin cliente"}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div>
                <label style={{ fontSize: "12px", fontWeight: 700, color: "#666" }}>Dirección</label>
                <input type="text" value={editAddress.address} onChange={e => setEditAddress(prev => ({ ...prev, address: e.target.value }))} style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "13px" }} />
              </div>
              <div>
                <label style={{ fontSize: "12px", fontWeight: 700, color: "#666" }}>Notas</label>
                <textarea value={editAddress.notes} onChange={e => setEditAddress(prev => ({ ...prev, notes: e.target.value }))} style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "13px", minHeight: "60px", resize: "vertical" }} />
              </div>
            </div>
            <div style={{ display: "flex", gap: "8px", marginTop: "16px" }}>
              <button onClick={() => setShowAddressEdit(null)} style={{ flex: 1, padding: "8px", borderRadius: "8px", border: "1px solid #ddd", background: "#fff", cursor: "pointer" }}>Cancelar</button>
              <button onClick={() => saveAddressEdit(showAddressEdit)} style={{ flex: 2, padding: "8px", borderRadius: "8px", border: "none", background: "#8e44ad", color: "#fff", cursor: "pointer", fontWeight: 700 }}>Guardar</button>
            </div>
          </div>
        </div>
        ) : null;
      })()}

      {/* New Delivery Modal */}
      {showNew && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}
          onClick={e => { if (e.target === e.currentTarget) setShowNew(false); }}
        >
          <div style={{ background: "#fff", borderRadius: "16px", padding: "24px", width: "100%", maxWidth: "440px" }}>
            <h3 style={{ margin: "0 0 16px", fontSize: "18px", fontWeight: 800 }}>🚚 Nueva Entrega</h3>
            <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <label style={{ fontSize: "12px", fontWeight: 700, color: "#666" }}>ID del Pedido *</label>
                <input type="number" required value={newForm.order_id} onChange={e => setNewForm(prev => ({ ...prev, order_id: e.target.value }))} placeholder="1" style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "13px" }} />
              </div>
              <div>
                <label style={{ fontSize: "12px", fontWeight: 700, color: "#666" }}>Dirección</label>
                <input type="text" value={newForm.address} onChange={e => setNewForm(prev => ({ ...prev, address: e.target.value }))} placeholder="Av. Libertador 1234" style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "13px" }} />
              </div>
              <div>
                <label style={{ fontSize: "12px", fontWeight: 700, color: "#666" }}>Fecha pactada</label>
                <input type="date" value={newForm.scheduled_date} onChange={e => setNewForm(prev => ({ ...prev, scheduled_date: e.target.value }))} style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "13px" }} />
              </div>
              <div>
                <label style={{ fontSize: "12px", fontWeight: 700, color: "#666" }}>Costo de envío</label>
                <input type="number" value={newForm.delivery_fee} onChange={e => setNewForm(prev => ({ ...prev, delivery_fee: e.target.value }))} placeholder="0.00" style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "13px" }} />
              </div>
              <div>
                <label style={{ fontSize: "12px", fontWeight: 700, color: "#666" }}>Notas</label>
                <textarea value={newForm.notes} onChange={e => setNewForm(prev => ({ ...prev, notes: e.target.value }))} placeholder="Portero: код 1234, timbre 4B..." style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "13px", minHeight: "60px", resize: "vertical" }} />
              </div>
              <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
                <button type="button" onClick={() => setShowNew(false)} style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "1px solid #ddd", background: "#fff", cursor: "pointer" }}>Cancelar</button>
                <button type="submit" disabled={creating} style={{ flex: 2, padding: "10px", borderRadius: "8px", border: "none", background: "#27ae60", color: "#fff", cursor: "pointer", fontWeight: 700, opacity: creating ? 0.7 : 1 }}>
                  {creating ? "Creando..." : "🚚 Crear"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    {detailDelivery && (
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
        <div style={{ background: "#fff", borderRadius: "16px", maxWidth: "480px", width: "100%", maxHeight: "90vh", overflowY: "auto", padding: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 700 }}>📋 Detalle de Entrega</h2>
            <button onClick={() => setDetailDelivery(null)} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", padding: "4px" }}>✕</button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ background: "#f8f8f8", borderRadius: "8px", padding: "12px" }}>
              <div style={{ fontWeight: 700, fontSize: "14px", marginBottom: "8px", color: "#1a1a2e" }}>🧾 {detailDelivery.order_number} — ${Number(detailDelivery.order_total).toLocaleString("es-AR")}</div>
              <div style={{ fontSize: "13px", color: "#555" }}><strong>Cliente:</strong> {detailDelivery.contact_name || "—"}</div>
              {detailDelivery.contact_phone && <div style={{ fontSize: "13px", color: "#555" }}><strong>Tel:</strong> {detailDelivery.contact_phone}</div>}
            </div>

            <div style={{ background: "#e8f4ff", borderRadius: "8px", padding: "12px", borderLeft: "4px solid #3498db" }}>
              <div style={{ fontWeight: 700, fontSize: "14px", marginBottom: "6px" }}>📍 Dirección</div>
              <div style={{ fontSize: "13px", color: "#333" }}>{detailDelivery.address || "—"}</div>
              {detailDelivery.contact_address && detailDelivery.address !== detailDelivery.contact_address && (
                <div style={{ fontSize: "12px", color: "#888", marginTop: "4px" }}>Ref: {detailDelivery.contact_address}</div>
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <div style={{ background: "#fff3e0", borderRadius: "8px", padding: "12px", borderLeft: "4px solid #e67e22" }}>
                <div style={{ fontSize: "12px", color: "#888", marginBottom: "2px" }}>📅 Fecha</div>
                <div style={{ fontSize: "14px", fontWeight: 700, color: "#1a1a2e" }}>{detailDelivery.scheduled_date ? new Date(detailDelivery.scheduled_date).toLocaleDateString("es-AR", { weekday: "short", day: "2-digit", month: "short" }) : "—"}</div>
              </div>
              <div style={{ background: "#e8f5e9", borderRadius: "8px", padding: "12px", borderLeft: "4px solid #27ae60" }}>
                <div style={{ fontSize: "12px", color: "#888", marginBottom: "2px" }}>🕐 Hora</div>
                <div style={{ fontSize: "14px", fontWeight: 700, color: "#1a1a2e" }}>{detailDelivery.scheduled_time || "—"}</div>
              </div>
            </div>

            {detailDelivery.notes && (
              <div style={{ background: "#fef9e7", borderRadius: "8px", padding: "12px", borderLeft: "4px solid #f1c40f" }}>
                <div style={{ fontWeight: 700, fontSize: "13px", marginBottom: "4px" }}>📝 Notas</div>
                <div style={{ fontSize: "13px", color: "#555" }}>{detailDelivery.notes}</div>
              </div>
            )}

            <div>
              <div style={{ fontWeight: 700, fontSize: "14px", marginBottom: "8px" }}>📦 Items</div>
              {loadingDetail ? (
                <div style={{ textAlign: "center", padding: "20px", color: "#888" }}>Cargando...</div>
              ) : detailDelivery.items && detailDelivery.items.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {detailDelivery.items.map((item: any, i: number) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: "12px", padding: "8px 12px", background: "#f8f8f8", borderRadius: "6px", fontSize: "13px" }}>
                      <div style={{ minWidth: 0 }}>
                        <div>{item.product_name}</div>
                        {item.attribute_value_name && (
                          <div style={{ fontSize: "11px", color: "#666", marginTop: "2px" }}>
                            {item.attribute_type_name ? `${item.attribute_type_name}: ` : ""}{item.attribute_value_name}
                          </div>
                        )}
                      </div>
                      <span style={{ fontWeight: 700, whiteSpace: "nowrap" }}>x{item.quantity}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: "#888", fontSize: "13px" }}>Sin items registrados</div>
              )}
            </div>
          </div>
        </div>
      </div>
    )}
    </div>
  );
}