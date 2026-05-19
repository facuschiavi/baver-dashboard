"use client";

import { useState, useEffect, useCallback } from "react";
import { postJson, fetchJson as getJson } from "../../lib";

type DesignStatus =
  | "pending_template"
  | "template_uploaded"
  | "rendering"
  | "rendered"
  | "feedback"
  | "approved"
  | "production_ready";

interface DesignRequest {
  id: number;
  order_id: number | null;
  contact_id: number | null;
  seña_amount: number;
  template_url: string;
  client_uploaded_image_url: string | null;
  rendered_image_url: string | null;
  designer_prompt: string | null;
  max_render_attempts: number;
  render_attempts: number;
  status: DesignStatus;
  token: string;
  token_expires_at: string;
  created_at: string;
  updated_at: string;
  order_number?: string;
  order_total?: number;
  contact_name?: string;
  contact_phone?: string;
  feedback?: FeedbackEntry[];
}

interface FeedbackEntry {
  id: number;
  author: "client" | "agent" | "designer";
  message: string;
  created_at: string;
}

interface DesignItem {
  id: number;
  design_request_id: number;
  item_number: number;
  head: string | null;
  center: string | null;
  footer: string | null;
  talle: string | null;
  created_at: string;
  updated_at: string;
}

const STATUS_LABELS: Record<DesignStatus, string> = {
  pending_template: "⏳ Esperando template",
  template_uploaded: "📤 Template subido",
  rendering: "🎨 Renderizando...",
  rendered: "✅ Render OK",
  feedback: "💬 Con feedback",
  approved: "👍 Aprobado",
  production_ready: "🚀 Listo para producción",
};

const STATUS_COLORS: Record<DesignStatus, string> = {
  pending_template: "#f39c12",
  template_uploaded: "#3498db",
  rendering: "#9b59b6",
  rendered: "#27ae60",
  feedback: "#e67e22",
  approved: "#2ecc71",
  production_ready: "#16a085",
};

export default function DisenoPage() {
  const [requests, setRequests] = useState<DesignRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<DesignRequest | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [sendingFeedback, setSendingFeedback] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [newOrderId, setNewOrderId] = useState("");
  const [createLoading, setCreateLoading] = useState(false);
  const [pendingOrders, setPendingOrders] = useState<any[]>([]);
  const [showPending, setShowPending] = useState(false);
  const [loadingPending, setLoadingPending] = useState(false);
    const [designItems, setDesignItems] = useState<DesignItem[]>([]);
  const [showItems, setShowItems] = useState(false);
  const [savingItems, setSavingItems] = useState(false);
  const [editingItemIdx, setEditingItemIdx] = useState<number | null>(null);
  const [renderCountdown, setRenderCountdown] = useState(60);
  const [renderModalOpen, setRenderModalOpen] = useState(false);
  const [renderPolling, setRenderPolling] = useState(false);
  const [recovering, setRecovering] = useState(false);
  const [recoverMsg, setRecoverMsg] = useState("");
  const [itemDraft, setItemDraft] = useState({ item_number: "", head: "", center: "", footer: "", talle: "" });  const [createError, setCreateError] = useState("");
  const [pendingEntities, setPendingEntities] = useState<any[]>([]);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [selectedPendingOrder, setSelectedPendingOrder] = useState<any>(null);
  const [pickableTemplates, setPickableTemplates] = useState<any[]>([]);
  const [allEntities, setAllEntities] = useState<any[]>([]);

  const loadRequests = useCallback(async () => {
    try {
      const data = await getJson<DesignRequest[]>("/design-requests");
      setRequests(data);
    } catch (e) {
      console.error("Error loading design requests:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadRequests(); }, [loadRequests]);
  useEffect(() => { if (selected) loadDesignItems(selected.id); }, [selected]);

  async function loadPendingOrders() {
    setLoadingPending(true);
    try {
      const data = await getJson<any[]>("/design-requests/pending-orders");
      setPendingOrders(data);
      setShowPending(true);
    } catch (e) {
      console.error("Error loading pending orders:", e);
    } finally {
      setLoadingPending(false);
    }
  }

  
  async function loadDesignItems(drId: number) {
    try {
      const items = await getJson<DesignItem[]>(`/design-requests/${drId}/items`);
      setDesignItems(items);
    } catch (e) { console.error(e); }
  }

  async function saveDesignItems(drId: number) {
    setSavingItems(true);
    try {
      await postJson(`/design-requests/${drId}/items`, { items: designItems });
      setEditingItemIdx(null);
    } catch (e) { console.error(e); }
    finally { setSavingItems(false); }
  }

  function addItem() {
    const nextNum = designItems.length > 0 ? Math.max(...designItems.map(i => i.item_number)) + 1 : 1;
    setDesignItems(prev => [...prev, { id: 0, design_request_id: selected!.id, item_number: nextNum, head: null, center: null, footer: null, talle: null, created_at: "", updated_at: "" }]);
    setEditingItemIdx(designItems.length);
    setItemDraft({ item_number: String(nextNum), head: "", center: "", footer: "", talle: "" });
  }

  function updateItem(idx: number, field: string, value: string) {
    setDesignItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value || null } : item));
  }

  function removeItem(idx: number) {
    setDesignItems(prev => prev.filter((_, i) => i !== idx));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newOrderId.trim()) return;
    setCreateLoading(true);
    setCreateError("");
    try {
      await postJson("/design-requests", { order_id: Number(newOrderId) });
      setNewOrderId("");
      loadRequests();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("409")) {
        setCreateError("Ya existe un pedido de diseño para este pedido");
      } else {
        setCreateError(msg);
      }
    } finally {
      setCreateLoading(false);
    }
  }

  async function handleSendFeedback() {
    if (!selected || !feedbackText.trim()) return;
    setSendingFeedback(true);
    try {
      await postJson(`/design-requests/${selected.id}/feedback`, {
        message: feedbackText,
        author: "agent",
      });
      setFeedbackText("");
      const updated = await getJson<DesignRequest>(`/design-requests/${selected.id}`);
      setSelected(updated);
      loadRequests();
    } catch (e) {
      console.error(e);
    } finally {
      setSendingFeedback(false);
    }
  }

  async function handleRender() {
    if (!selected || !selected.client_uploaded_image_url) return;
    setRendering(true);
    setRenderCountdown(60);
    setRenderModalOpen(true);
    setRenderPolling(true);
    try {
      await postJson(`/design-requests/${selected.id}/render`, {
        image_url: selected.client_uploaded_image_url,
      });
    } catch (e) {
      console.error(e);
      setRenderModalOpen(false);
      setRenderPolling(false);
      alert("Error al renderizar: " + (e as Error).message);
      setRendering(false);
      return;
    }
    // Poll every 3s for up to 60s
    const pollInterval = setInterval(async () => {
      setRenderCountdown(prev => {
        if (prev <= 3) {
          clearInterval(pollInterval);
          setRenderPolling(false);
          setRenderModalOpen(false);
          setRendering(false);
          // Reload data instead of full page reload
          loadRequests();
          getJson<DesignRequest>(`/design-requests/${selected!.id}`).then(setSelected).catch(() => {});
          return 0;
        }
        return prev - 3;
      });
      try {
        const updated = await getJson<DesignRequest>(`/design-requests/${selected.id}`);
        setSelected(updated);
        loadRequests();
        if (updated.status !== "rendering") {
          clearInterval(pollInterval);
          setRenderModalOpen(false);
          setRenderPolling(false);
          setRendering(false);
        }
      } catch (e) {
        console.error("Poll error:", e);
      }
    }, 3000);
  }

  async function handleApprove() {
    if (!selected) return;
    try {
      await postJson(`/design-requests/${selected.id}/approve`, {});
      const updated = await getJson<DesignRequest>(`/design-requests/${selected.id}`);
      setSelected(updated);
      loadRequests();
    } catch (e) {
      console.error(e);
    }
  }

  async function handleResetDesign() {
    if (!selected) return;
    if (!confirm("¿Reiniciar el diseño? Esto volverá el pedido a estado 'Con feedback' y limpiará la imagen renderizada.")) return;
    try {
      await postJson(`/design-requests/${selected.id}/reset`, {});
      const updated = await getJson<DesignRequest>(`/design-requests/${selected.id}`);
      setSelected(updated);
      loadRequests();
    } catch (e) {
      console.error(e);
      alert("Error al reiniciar: " + (e as Error).message);
    }
  }

  async function handleRecoverRender() {
    if (!selected) return;
    setRecovering(true);
    setRecoverMsg("");
    try {
      await postJson(`/design-requests/${selected.id}/recover-render`, {});
      const updated = await getJson<DesignRequest>(`/design-requests/${selected.id}`);
      setSelected(updated);
      loadRequests();
      setRecoverMsg("✅ Render recuperado!");
      setTimeout(() => setRecoverMsg(""), 3000);
    } catch (e) {
      const msg = (e as Error).message;
      if (msg.includes("404")) {
        setRecoverMsg("❌ No hay archivo renderizado en disco");
      } else {
        setRecoverMsg("❌ Error: " + msg);
      }
      setTimeout(() => setRecoverMsg(""), 5000);
    } finally {
      setRecovering(false);
    }
  }

  async function handleGenerateLink() {
    if (!selected) return;
    try {
      const result = await postJson<any>(`/design-requests/${selected.id}/generate-link`, {});

      // Aseguramos que el token quede disponible para el copiar inmediatamente
      if (result?.token) {
        setSelected(prev => (prev ? { ...prev, token: result.token, token_expires_at: result.token_expires_at } : prev));
      }

      const updated = await getJson<DesignRequest>(`/design-requests/${selected.id}`);
      setSelected(updated);
      loadDesignItems(selected.id);
    } catch (e) {
      console.error(e);
    }
  }

  async function handleCopyLink() {
    if (!selected?.token) return;
    const link = `/d/${selected.token}`;
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      // Fallback for HTTP environments
      const el = document.createElement("textarea");
      el.value = link;
      el.style.position = "fixed";
      el.style.opacity = "0";
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  }

  if (loading) return <div style={{ padding: 40, textAlign: "center" }}>Cargando...</div>;

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      {/* LEFT PANEL — Card list */}
      <div style={{ width: 380, borderRight: "1px solid #eee", overflowY: "auto", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #eee", background: "#f9f9f9" }}>
          <h2 style={{ margin: "0 0 12px", fontSize: 18, fontWeight: 800 }}>🎨 Módulo de Diseño</h2>
          <button
            type="button"
            onClick={() => showPending ? setShowPending(false) : loadPendingOrders()}
            disabled={loadingPending}
            style={{ padding: "10px 14px", width: "100%", background: showPending ? "#e74c3c" : "#27ae60", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: loadingPending ? "wait" : "pointer", marginBottom: 8 }}
          >
            {loadingPending ? "..." : showPending ? "Cerrar" : "📋 NV pendientes de diseño"}
          </button>
          {showPending && (
            <div style={{ marginTop: 8, maxHeight: 200, overflowY: "auto", border: "1px solid #ddd", borderRadius: 8, background: "#fff" }}>
              {pendingOrders.length === 0 ? (
                <div style={{ padding: "10px 14px", color: "#999", fontSize: 12 }}>No hay NV pendientes de diseño</div>
              ) : (
                pendingOrders.map(po => (
                  <div
                    key={po.id}
                    onClick={async () => {
                      setShowPending(false);
                      setSelectedPendingOrder(po);
                      setCreateError("");

                      // Load templates for this order's entity, plus all entities
                      try {
                        const [entities, entityDesigns] = await Promise.all([
                          getJson<any[]>("/entities"),
                          po.entity_id ? getJson<any[]>(`/entity-designs?entity_id=${po.entity_id}`) : Promise.resolve([])
                        ]);
                        setAllEntities(entities);
                        setPickableTemplates(entityDesigns);
                        setShowTemplatePicker(true);
                      } catch (e) {
                        // If loading fails, create anyway without template
                        setCreateLoading(true);
                        try {
                          await postJson("/design-requests", { order_id: po.id });
                          loadRequests();
                        } catch (err2: unknown) {
                          setCreateError("Error al crear: " + (err2 instanceof Error ? err2.message : String(err2)));
                        } finally {
                          setCreateLoading(false);
                        }
                      }
                    }}
                    style={{ padding: "10px 14px", cursor: "pointer", borderBottom: "1px solid #f0f0f0", fontSize: 13, display: "flex", justifyContent: "space-between", alignItems: "center" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#f5f3ff")}
                    onMouseLeave={e => (e.currentTarget.style.background = "")}
                  >
                    <div>
                      <strong>{po.order_number}</strong> — {po.contact_name || "Sin contacto"}
                      {po.entity_name && <span style={{ color: "#6c63ff", marginLeft: 6 }}>🏛 {po.entity_name}</span>}
                    </div>
                    <div style={{ color: "#27ae60", fontWeight: 600 }}>${Number(po.paid_amount || 0).toLocaleString("es-AR")}</div>
                  </div>
                ))
              )}
            </div>
          )}
          {createError && <div style={{ color: "#e74c3c", fontSize: 11, marginTop: 6 }}>{createError}</div>}
          
          {showTemplatePicker && selectedPendingOrder && (
            <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.4)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}
                 onClick={() => setShowTemplatePicker(false)}>
              <div style={{ background: "#fff", borderRadius: 12, padding: 24, width: 420, maxHeight: "80vh", overflowY: "auto" }}
                   onClick={e => e.stopPropagation()}>
                <h3 style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 700 }}>{selectedPendingOrder.order_number}</h3>
                <p style={{ margin: "0 0 16px", fontSize: 13, color: "#666" }}>
                  {selectedPendingOrder.contact_name}
                  {selectedPendingOrder.entity_name && <> — 🏛 {selectedPendingOrder.entity_name}</>}
                </p>

                {/* Templates de la entidad del contacto */}
                <div style={{ fontSize: 12, fontWeight: 600, color: "#888", marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>
                  {pickableTemplates.length > 0 ? "Diseños disponibles" : "Sin diseños predeterminados"}
                </div>

                {pickableTemplates.length > 0 && pickableTemplates.map((t: any) => (
                  <div
                    key={t.id}
                    onClick={async () => {
                      setShowTemplatePicker(false);
                      setCreateLoading(true);
                      try {
                        await postJson("/design-requests", { order_id: selectedPendingOrder.id, template_url: t.template_url, entity_id: selectedPendingOrder.entity_id });
                        setSelectedPendingOrder(null);
                        loadRequests();
                      } catch (err: unknown) {
                        setCreateError("Error: " + (err instanceof Error ? err.message : String(err)));
                      } finally {
                        setCreateLoading(false);
                      }
                    }}
                    style={{ padding: "10px 14px", cursor: "pointer", border: "1px solid #eee", borderRadius: 8, marginBottom: 4, fontSize: 13, background: "#fafafa" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#f0edff")}
                    onMouseLeave={e => (e.currentTarget.style.background = "#fafafa")}
                  >
                    🎨 {t.name}
                  </div>
                ))}

                {/* Opciones adicionales */}
                <div style={{ marginTop: 12, borderTop: "1px solid #eee", paddingTop: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#888", marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>
                    Otras opciones
                  </div>

                  {/* Sin diseño predeterminado */}
                  <div
                    onClick={async () => {
                      setShowTemplatePicker(false);
                      setCreateLoading(true);
                      try {
                        await postJson("/design-requests", { order_id: selectedPendingOrder.id, entity_id: selectedPendingOrder.entity_id || null });
                        setSelectedPendingOrder(null);
                        loadRequests();
                      } catch (err: unknown) {
                        setCreateError("Error: " + (err instanceof Error ? err.message : String(err)));
                      } finally {
                        setCreateLoading(false);
                      }
                    }}
                    style={{ padding: "10px 14px", cursor: "pointer", border: "1px solid #ddd", borderRadius: 8, marginBottom: 4, fontSize: 13, borderStyle: "dashed" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#f9f9f9", e.currentTarget.style.borderColor = "#999")}
                    onMouseLeave={e => { e.currentTarget.style.background = ""; e.currentTarget.style.borderColor = "#ddd"; }}
                  >
                    ✏️ Sin diseño predeterminado (diseño libre)
                  </div>

                  {/* Elegir otra entidad */}
                  {allEntities.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#888", marginBottom: 4 }}>Usar diseño de otra entidad</div>
                      <select
                        style={{ width: "100%", padding: "8px 10px", border: "1px solid #ddd", borderRadius: 8, fontSize: 13 }}
                        defaultValue=""
                        onChange={async (e: any) => {
                          if (!e.target.value) return;
                          setShowTemplatePicker(false);
                          setCreateLoading(true);
                          try {
                            await postJson("/design-requests", { order_id: selectedPendingOrder.id, entity_id: Number(e.target.value) });
                            setSelectedPendingOrder(null);
                            loadRequests();
                          } catch (err: unknown) {
                            setCreateError("Error: " + (err instanceof Error ? err.message : String(err)));
                          } finally {
                            setCreateLoading(false);
                          }
                        }}
                      >
                        <option value="">Seleccionar entidad...</option>
                        {allEntities
                          .filter((ent: any) => ent.id !== selectedPendingOrder.entity_id)
                          .map((ent: any) => (
                            <option key={ent.id} value={ent.id}>{ent.name}</option>
                          ))}
                      </select>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setShowTemplatePicker(false)}
                  style={{ marginTop: 12, padding: "8px 16px", background: "#eee", border: "none", borderRadius: 8, fontSize: 13, cursor: "pointer", width: "100%" }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>

        <div style={{ flex: 1, overflowY: "auto" }}>
          {requests.length === 0 && (
            <div style={{ padding: 40, textAlign: "center", color: "#aaa" }}>Sin pedidos de diseño</div>
          )}
          {requests.map(r => (
            <div
              key={r.id}
              onClick={() => setSelected(r)}
              style={{
                padding: "14px 20px",
                borderBottom: "1px solid #f0f0f0",
                cursor: "pointer",
                background: selected?.id === r.id ? "#f0edff" : "#fff",
                borderLeft: selected?.id === r.id ? "3px solid #6c63ff" : "3px solid transparent",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <span style={{ fontWeight: 700, fontSize: 13 }}>Pedido #{r.order_id ?? r.id}</span>
                <span style={{ fontSize: 11, color: STATUS_COLORS[r.status], fontWeight: 600 }}>
                  {r.render_attempts}/{r.max_render_attempts} renders
                </span>
              </div>
              {r.contact_name && (
                <div style={{ fontSize: 12, color: "#666", marginBottom: 2 }}>👤 {r.contact_name}</div>
              )}
              <div style={{ fontSize: 12, color: "#888" }}>
                Seña: <strong style={{ color: (r as any).seña_pagada_real > 0 ? "#27ae60" : "#999" }}>
                  {(r as any).seña_pagada_real > 0 ? `$${Number((r as any).seña_pagada_real).toLocaleString("es-AR")} ✅` : "Sin seña"}
                </strong>
              </div>
              <div style={{ marginTop: 6, fontSize: 11, color: STATUS_COLORS[r.status] }}>
                {STATUS_LABELS[r.status]}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT PANEL — Detail */}
      <div style={{ flex: 1, overflowY: "auto", padding: "24px 32px" }}>
        {!selected ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#ccc", fontSize: 18 }}>
            Seleccioná un pedido para ver el detalle
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
              <div>
                <h2 style={{ margin: "0 0 4px" }}>Pedido #{selected.order_id ?? selected.id}</h2>
                <div style={{ color: "#888", fontSize: 13 }}>
                  {selected.contact_name} · {selected.contact_phone ?? "sin teléfono"}
                </div>
                <div style={{ marginTop: 8, fontSize: 13, color: STATUS_COLORS[selected.status], fontWeight: 700 }}>
                  {STATUS_LABELS[selected.status]}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button onClick={handleGenerateLink} style={{ padding: "8px 14px", background: "#3498db", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, cursor: "pointer", fontWeight: 600 }}>
                  🔗 Generar Link
                </button>
                {selected.token && (
                  <button onClick={handleCopyLink} style={{ padding: "8px 14px", background: copiedLink ? "#27ae60" : "#2ecc71", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, cursor: "pointer", fontWeight: 600 }}>
                    {copiedLink ? "✅ Copiado!" : "📋 Copiar Link"}
                  </button>
                )}
                {selected.client_uploaded_image_url && selected.status !== "rendering" && (
                  <button onClick={handleRender} disabled={rendering} style={{ padding: "8px 14px", background: rendering ? "#aaa" : "#9b59b6", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, cursor: rendering ? "not-allowed" : "pointer", fontWeight: 600 }}>
                    {rendering ? "🎨 Renderizando..." : "🎨 Re-renderizar"}
                  </button>
                )}
                {(selected.status === "rendered" || selected.status === "approved" || selected.status === "feedback" || selected.status === "production_ready") && (
                  <button onClick={handleResetDesign} style={{ padding: "8px 14px", background: "#e67e22", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, cursor: "pointer", fontWeight: 600 }}>
                    🔄 Reiniciar diseño
                  </button>
                )}
                {selected && !selected.rendered_image_url && selected.status !== "pending_template" && selected.status !== "template_uploaded" && selected.status !== "rendering" && (
                  <button onClick={handleRecoverRender} disabled={recovering} style={{ padding: "8px 14px", background: recovering ? "#aaa" : "#8e44ad", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, cursor: recovering ? "not-allowed" : "pointer", fontWeight: 600 }}>
                    {recovering ? "🔍 Buscando..." : "📂 Recuperar render anterior"}
                  </button>
                )}
                {selected && recoverMsg && (
                  <div style={{ width: "100%", marginTop: 8, fontSize: 13, color: recoverMsg.startsWith("✅") ? "#27ae60" : "#e74c3c", fontWeight: 600 }}>
                    {recoverMsg}
                  </div>
                )}
                {(selected.status === "rendered" || selected.status === "feedback") && (
                  <button onClick={handleApprove} style={{ padding: "8px 14px", background: "#16a085", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, cursor: "pointer", fontWeight: 600 }}>
                    ✅ Aprobar para Producción
                  </button>
                )}
              </div>
            </div>

            {/* Images */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
              <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#888", marginBottom: 8 }}>📤 Template del Cliente</div>
                {selected.client_uploaded_image_url ? (
                  <img src={selected.client_uploaded_image_url} alt="Uploaded" style={{ width: "100%", borderRadius: 8, objectFit: "contain", maxHeight: 280 }} />
                ) : (
                  <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", background: "#f9f9f9", borderRadius: 8, color: "#ccc", fontSize: 13 }}>
                    Aún no subido
                  </div>
                )}
              </div>
              <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#888", marginBottom: 8 }}>🎨 Diseño Renderizado</div>
                {selected.rendered_image_url ? (
                  <img src={selected.rendered_image_url} alt="Rendered" style={{ width: "100%", borderRadius: 8, objectFit: "contain", maxHeight: 280 }} />
                ) : (
                  <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", background: "#f9f9f9", borderRadius: 8, color: "#ccc", fontSize: 13 }}>
                    {selected.status === "rendering" ? "🎨 Renderizando..." : "Sin render"}
                  </div>
                )}
              </div>
            </div>

            {/* Link */}
            {selected.token && (
              <div style={{ background: "#f0f8ff", border: "1px solid #d0e8ff", borderRadius: 10, padding: "12px 16px", marginBottom: 24, fontSize: 13 }}>
                <strong>🔗 Link para el cliente:</strong><br />
                <code style={{ color: "#3498db", wordBreak: "break-all" }}>
                  {typeof window !== "undefined" ? `${window.location.origin}/d/${selected.token}` : `/d/${selected.token}`}
                </code>
                <span style={{ color: "#888", marginLeft: 12, fontSize: 11 }}>
                  (vence {new Date(selected.token_expires_at).toLocaleString("es-AR")})
                </span>
              </div>
            )}

            {/* Designer prompt */}
            {selected.designer_prompt && (
              <div style={{ background: "#fff9e6", border: "1px solid #f0d060", borderRadius: 10, padding: "12px 16px", marginBottom: 24 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#888", marginBottom: 4 }}>📝 Prompt del Diseñador</div>
                <div style={{ fontSize: 14 }}>{selected.designer_prompt}</div>
              </div>
            )}

            {/* Feedback thread */}
            <div>
              <h3 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 800 }}>💬 Feedback</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
                {(selected.feedback ?? []).map(fb => (
                  <div
                    key={fb.id}
                    style={{
                      padding: "10px 14px",
                      borderRadius: 10,
                      background: fb.author === "client" ? "#e8f5e9" : fb.author === "designer" ? "#f3e5f5" : "#e3f2fd",
                      border: `1px solid ${fb.author === "client" ? "#a5d6a7" : fb.author === "designer" ? "#ce93d8" : "#90caf9"}`,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, fontSize: 12, textTransform: "capitalize" }}>
                        {fb.author === "client" ? "👤 Cliente" : fb.author === "designer" ? "🎨 Diseñador" : "🤖 Agente"}
                      </span>
                      <span style={{ fontSize: 11, color: "#888" }}>
                        {new Date(fb.created_at).toLocaleString("es-AR")}
                      </span>
                    </div>
                    <div style={{ fontSize: 14 }}>{fb.message}</div>
                  </div>
                ))}
                {(selected.feedback ?? []).length === 0 && (
                  <div style={{ color: "#ccc", fontSize: 13, fontStyle: "italic" }}>Sin feedback aún</div>
                )}
              </div>

              {/* Add feedback */}
              <div style={{ display: "flex", gap: 8 }}>
                <textarea
                  value={feedbackText}
                  onChange={e => setFeedbackText(e.target.value)}
                  placeholder="Escribí feedback para el cliente o diseñador..."
                  rows={2}
                  style={{ flex: 1, padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd", fontSize: 13, resize: "vertical", fontFamily: "inherit" }}
                />
                <button
                  onClick={handleSendFeedback}
                  disabled={sendingFeedback || !feedbackText.trim()}
                  style={{ padding: "10px 18px", background: sendingFeedback ? "#aaa" : "#6c63ff", color: "#fff", border: "none", borderRadius: 10, fontSize: 13, cursor: sendingFeedback ? "not-allowed" : "pointer", fontWeight: 700, alignSelf: "flex-end" }}
                >
                  {sendingFeedback ? "Enviando..." : "Enviar 💬"}
                </button>
              </div>

            {/* Design Items Table — Production Data */}
            <div style={{ background: "#fff", borderRadius: 16, padding: "20px 24px", marginBottom: 20, boxShadow: "0 2px 10px rgba(0,0,0,0.06)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>📋 Detalle de Produccion</h3>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={addItem} style={{ padding: "6px 12px", background: "#6c63ff", color: "#fff", border: "none", borderRadius: 8, fontSize: 12, cursor: "pointer", fontWeight: 600 }}>
                    + Agregar item
                  </button>
                  {designItems.length > 0 && (
                    <button onClick={() => saveDesignItems(selected!.id)} disabled={savingItems} style={{ padding: "6px 12px", background: savingItems ? "#aaa" : "#27ae60", color: "#fff", border: "none", borderRadius: 8, fontSize: 12, cursor: savingItems ? "not-allowed" : "pointer", fontWeight: 600 }}>
                      {savingItems ? "Guardando..." : "Guardar todo"}
                    </button>
                  )}
                </div>
              </div>

              {designItems.length === 0 ? (
                <div style={{ textAlign: "center", color: "#ccc", fontSize: 13, padding: "20px 0" }}>
                  Sin items. Hacé clic en "+ Agregar item" para anadir el detalle de produccion.
                </div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "#f9f9f9" }}>
                      <th style={{ padding: "8px 6px", textAlign: "center", fontWeight: 700, color: "#555", width: 50 }}>#</th>
                      <th style={{ padding: "8px 6px", textAlign: "center", fontWeight: 700, color: "#555" }}>Head</th>
                      <th style={{ padding: "8px 6px", textAlign: "center", fontWeight: 700, color: "#555" }}>Center</th>
                      <th style={{ padding: "8px 6px", textAlign: "center", fontWeight: 700, color: "#555" }}>Footer</th>
                      <th style={{ padding: "8px 6px", textAlign: "center", fontWeight: 700, color: "#555", width: 80 }}>Talle</th>
                      <th style={{ padding: "8px 6px", width: 60 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {designItems.map((item, idx) => (
                      <tr key={item.id || idx} style={{ borderBottom: "1px solid #f0f0f0" }}>
                        <td style={{ padding: "6px", textAlign: "center", fontWeight: 600, color: "#888" }}>
                          {editingItemIdx === idx ? (
                            <input value={itemDraft.item_number} onChange={e => { const v = e.target.value; setItemDraft({ ...itemDraft, item_number: v }); updateItem(idx, "item_number", v); }} style={{ width: 40, padding: "4px", border: "1px solid #ddd", borderRadius: 6, fontSize: 12, textAlign: "center" }} />
                          ) : item.item_number}
                        </td>
                        <td style={{ padding: "6px" }}>
                          {editingItemIdx === idx ? (
                            <input value={itemDraft.head || ""} onChange={e => { const v = e.target.value; setItemDraft({ ...itemDraft, head: v }); updateItem(idx, "head", v); }} style={{ width: "100%", padding: "4px 6px", border: "1px solid #ddd", borderRadius: 6, fontSize: 12, boxSizing: "border-box" }} />
                          ) : <span style={{ color: item.head ? "#333" : "#ccc" }}>{item.head || "—"}</span>}
                        </td>
                        <td style={{ padding: "6px" }}>
                          {editingItemIdx === idx ? (
                            <input value={itemDraft.center || ""} onChange={e => { const v = e.target.value; setItemDraft({ ...itemDraft, center: v }); updateItem(idx, "center", v); }} style={{ width: "100%", padding: "4px 6px", border: "1px solid #ddd", borderRadius: 6, fontSize: 12, boxSizing: "border-box" }} />
                          ) : <span style={{ color: item.center ? "#333" : "#ccc" }}>{item.center || "—"}</span>}
                        </td>
                        <td style={{ padding: "6px" }}>
                          {editingItemIdx === idx ? (
                            <input value={itemDraft.footer || ""} onChange={e => { const v = e.target.value; setItemDraft({ ...itemDraft, footer: v }); updateItem(idx, "footer", v); }} style={{ width: "100%", padding: "4px 6px", border: "1px solid #ddd", borderRadius: 6, fontSize: 12, boxSizing: "border-box" }} />
                          ) : <span style={{ color: item.footer ? "#333" : "#ccc" }}>{item.footer || "—"}</span>}
                        </td>
                        <td style={{ padding: "6px", textAlign: "center" }}>
                          {editingItemIdx === idx ? (
                            <input value={itemDraft.talle || ""} onChange={e => { const v = e.target.value; setItemDraft({ ...itemDraft, talle: v }); updateItem(idx, "talle", v); }} style={{ width: 60, padding: "4px", border: "1px solid #ddd", borderRadius: 6, fontSize: 12, textAlign: "center" }} />
                          ) : <span style={{ color: item.talle ? "#333" : "#ccc" }}>{item.talle || "—"}</span>}
                        </td>
                        <td style={{ padding: "6px", textAlign: "center" }}>
                          {editingItemIdx === idx ? (
                            <button onClick={() => { setEditingItemIdx(null); setItemDraft({ item_number: "", head: "", center: "", footer: "", talle: "" }); }} style={{ padding: "4px 8px", background: "#27ae60", color: "#fff", border: "none", borderRadius: 6, fontSize: 11, cursor: "pointer" }}>OK</button>
                          ) : (
                            <button onClick={() => { setEditingItemIdx(idx); setItemDraft({ item_number: String(item.item_number), head: item.head || "", center: item.center || "", footer: item.footer || "", talle: item.talle || "" }); }} style={{ padding: "4px 8px", background: "#3498db", color: "#fff", border: "none", borderRadius: 6, fontSize: 11, cursor: "pointer" }}>Editar</button>
                          )}
                          <button onClick={() => removeItem(idx)} style={{ marginLeft: 4, padding: "4px 8px", background: "#e74c3c", color: "#fff", border: "none", borderRadius: 6, fontSize: 11, cursor: "pointer" }}>X</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            </div>
          </>
        )}
      </div>

      {/* Render Countdown Modal */}
      {renderModalOpen && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 200,
          display: "flex", alignItems: "center", justifyContent: "center", padding: "20px"
        }}>
          <div style={{
            background: "#fff", borderRadius: "20px", padding: "36px 40px", textAlign: "center",
            maxWidth: "380px", width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.4)"
          }}>
            <div style={{ fontSize: "52px", marginBottom: "16px" }}>🎨</div>
            <h2 style={{ margin: "0 0 8px", fontSize: "20px", fontWeight: 800, color: "#1a1a2e" }}>
              Renderizando tu diseño
            </h2>
            <p style={{ margin: "0 0 20px", fontSize: "13px", color: "#888" }}>
              Esto puede tardar entre 15 y 30 segundos.<br />
              No cierres esta ventana.
            </p>
            <div style={{
              fontSize: "48px", fontWeight: 900, color: "#9b59b6",
              marginBottom: "16px", fontVariantNumeric: "tabular-nums"
            }}>
              {renderCountdown}s
            </div>
            <div style={{ background: "#f0f0f0", borderRadius: "8px", height: "8px", overflow: "hidden", marginBottom: "12px" }}>
              <div style={{
                height: "100%",
                width: `${(renderCountdown / 30) * 100}%`,
                background: "linear-gradient(90deg, #9b59b6, #8e44ad)",
                borderRadius: "8px",
                transition: "width 0.5s ease"
              }} />
            </div>
            {renderPolling && (
              <p style={{ margin: 0, fontSize: "12px", color: "#aaa" }}>
                Verificando estado...
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
