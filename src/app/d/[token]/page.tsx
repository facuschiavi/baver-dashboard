"use client";

import { useState, useEffect, use } from "react";

type DesignStatus =
  | "pending_template"
  | "template_uploaded"
  | "rendering"
  | "rendered"
  | "feedback"
  | "approved"
  | "production_ready";

interface DesignData {
  id: number;
  order_id: number | null;
  status: DesignStatus;
  template_url: string;
  client_uploaded_image_url: string | null;
  rendered_image_url: string | null;
  designer_prompt: string | null;
  token: string;
  order_number?: string;
  estilo?: string;
  deporte?: string;
  corte?: string;
  rasgos?: string;
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

const API = process.env.NEXT_PUBLIC_API_URL || "";

const STATUS_LABELS: Record<DesignStatus, string> = {
  pending_template: "⏳ Esperando tu diseño",
  template_uploaded: "📤 Template subido",
  rendering: "🎨 Renderizando...",
  rendered: "✅ Diseño listo",
  feedback: "💬 Con comentarios",
  approved: "👍 Aprobado",
  production_ready: "🚀 ¡Listo para producción!",
};

export default function PublicDesignPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [dr, setDr] = useState<DesignData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [feedbackText, setFeedbackText] = useState("");
  const [sendingFeedback, setSendingFeedback] = useState(false);
  const [wizard, setWizard] = useState({ estilo: "", deporte: "", corte: "", rasgos: "" });
  const [savingWizard, setSavingWizard] = useState(false);
  const [wizardSaved, setWizardSaved] = useState(false);  const [designItems, setDesignItems] = useState<DesignItem[]>([]);
  const [savingItems, setSavingItems] = useState(false);
  const [editingItemIdx, setEditingItemIdx] = useState<number | null>(null);
  const [itemDraft, setItemDraft] = useState({ item_number: "", head: "", center: "", footer: "", talle: "" });

  useEffect(() => {
    fetch(`${API}/design-requests/public/${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); }
        else {
          setDr(d);
          setWizard({ estilo: d.estilo || "", deporte: d.deporte || "", corte: d.corte || "", rasgos: d.rasgos || "" });
          loadDesignItems(d.id);
        }
      })
      .catch(() => setError("Error al cargar"))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!imageUrl.trim()) return;
    setUploading(true);
    try {
      const r = await fetch(`${API}/design-requests/public/${token}/upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_url: imageUrl }),
      });
      const data = await r.json();
      if (data.error) { alert(data.error); return; }
      const r2 = await fetch(`${API}/design-requests/public/${token}`);
      setDr(await r2.json());
    } catch { alert("Error al subir imagen"); }
    finally { setUploading(false); }
  }

  async function handleFeedback(e: React.FormEvent) {
    e.preventDefault();
    if (!feedbackText.trim()) return;
    setSendingFeedback(true);
    try {
      await fetch(`${API}/design-requests/public/${token}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: feedbackText }),
      });
      setFeedbackText("");
      const r = await fetch(`${API}/design-requests/public/${token}`);
      setDr(await r.json());
    } catch { alert("Error al enviar"); }
    finally { setSendingFeedback(false); }
  }

  
  async function loadDesignItems(drId: number) {
    try {
      const r = await fetch(`${API}/design-requests/public/${token}/items`);
      const items = await r.json();
      setDesignItems(Array.isArray(items) ? items : []);
    } catch { console.error('Error loading design items'); }
  }

  async function saveDesignItems(drId: number) {
    setSavingItems(true);
    try {
      await fetch(`${API}/design-requests/public/${token}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: designItems }),
      });
      setEditingItemIdx(null);
    } catch { alert('Error al guardar items'); }
    finally { setSavingItems(false); }
  }

  function addItem() {
    const nextNum = designItems.length > 0 ? Math.max(...designItems.map(i => i.item_number)) + 1 : 1;
    setDesignItems(prev => [...prev, { id: 0, design_request_id: dr!.id, item_number: nextNum, head: null, center: null, footer: null, talle: null, created_at: '', updated_at: '' }]);
    setEditingItemIdx(designItems.length);
    setItemDraft({ item_number: String(nextNum), head: '', center: '', footer: '', talle: '' });
  }

  function updateItem(idx: number, field: string, value: string) {
    setDesignItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value || null } : item));
  }

  function removeItem(idx: number) {
    setDesignItems(prev => prev.filter((_, i) => i !== idx));
  }

  async function handleSaveWizard() {
    setSavingWizard(true);
    try {
      const r = await fetch(`${API}/design-requests/public/${token}/wizard`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(wizard),
      });
      if (r.ok || r.status === 200) {
        setWizardSaved(true);
        setTimeout(() => setWizardSaved(false), 2000);
      } else {
        const d = await r.json();
        alert(d.error || "Error al guardar");
      }
    } catch { alert("Error al guardar"); }
    finally { setSavingWizard(false); }
  }

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui, sans-serif", background: "#f5f5f5" }}>
      <p style={{ color: "#888" }}>Cargando...</p>
    </div>
  );

  if (error) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui, sans-serif", background: "#f5f5f5" }}>
      <div style={{ textAlign: "center", padding: 40, background: "#fff", borderRadius: 16, boxShadow: "0 4px 20px rgba(0,0,0,0.1)", maxWidth: 400 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔗</div>
        <h2 style={{ margin: "0 0 8px", color: "#333" }}>Link inválido o expirado</h2>
        <p style={{ color: "#888", margin: 0 }}>Este link ya no es válido. Contactá a la tienda para pedir uno nuevo.</p>
      </div>
    </div>
  );

  if (!dr) return null;

  return (
    <div style={{ minHeight: "100vh", background: "#f5f5f5", fontFamily: "system-ui, sans-serif", padding: "20px 16px" }}>
      <div style={{ maxWidth: 600, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ background: "#fff", borderRadius: 16, padding: "20px 24px", marginBottom: 20, boxShadow: "0 2px 10px rgba(0,0,0,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <div style={{ width: 48, height: 48, background: "#6c63ff", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>🎨</div>
            <div>
              <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#333" }}>Tu Diseño</h1>
              {dr.order_number && <p style={{ margin: 0, fontSize: 13, color: "#888" }}>Pedido #{dr.order_number}</p>}
            </div>
          </div>
          <div style={{ background: "#f0edff", borderRadius: 8, padding: "8px 12px", fontSize: 13, color: "#6c63ff", fontWeight: 600, textAlign: "center" }}>
            {STATUS_LABELS[dr.status]}
          </div>
        </div>

        {/* Template reference */}
        {dr.template_url && (
          <div style={{ background: "#fff", borderRadius: 16, padding: "20px 24px", marginBottom: 20, boxShadow: "0 2px 10px rgba(0,0,0,0.06)" }}>
            <h2 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 800, color: "#333" }}>📐 Plantilla de referencia</h2>
            <img src={dr.template_url} alt="Plantilla" style={{ width: "100%", borderRadius: 10, border: "1px solid #eee" }} />
            <p style={{ margin: "10px 0 0", fontSize: 12, color: "#aaa" }}>Usá esta plantilla como referencia para diseñar</p>
          </div>
        )}

        {/* Wizard */}
        {(dr.status === "pending_template" || dr.status === "template_uploaded" || (dr.status === "feedback" && !dr.rendered_image_url)) && (
          <div style={{ background: "#fff", borderRadius: 16, padding: "20px 24px", marginBottom: 20, boxShadow: "0 2px 10px rgba(0,0,0,0.06)" }}>
            <h2 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 800, color: "#333" }}>🎨 Personalizá tu diseño</h2>
            <p style={{ margin: "0 0 16px", fontSize: 13, color: "#666" }}>Completá estos datos para personalizar el render de tu camiseta</p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#555", display: "block", marginBottom: 4 }}>Estilo</label>
                <select value={wizard.estilo} onChange={e => setWizard({ ...wizard, estilo: e.target.value })} style={{ width: "100%", padding: "8px 10px", border: "1px solid #ddd", borderRadius: 8, fontSize: 13 }}>
                  <option value="">Seleccionar...</option>
                  <option value="Actual">Actual</option>
                  <option value="Novedoso">Novedoso</option>
                  <option value="Ochentoso">Ochentoso</option>
                  <option value="Clasico">Clasico</option>
                  <option value="Minimalista">Minimalista</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#555", display: "block", marginBottom: 4 }}>Deporte</label>
                <select value={wizard.deporte} onChange={e => setWizard({ ...wizard, deporte: e.target.value })} style={{ width: "100%", padding: "8px 10px", border: "1px solid #ddd", borderRadius: 8, fontSize: 13 }}>
                  <option value="">Seleccionar...</option>
                  <option value="Voley">Voley</option>
                  <option value="Futbol">Futbol</option>
                  <option value="Basketball">Basketball</option>
                  <option value="Rugby">Rugby</option>
                  <option value="Running">Running</option>
                  <option value="Gym">Gym</option>
                </select>
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#555", display: "block", marginBottom: 4 }}>Corte</label>
              <div style={{ display: "flex", gap: 8 }}>
                {["Masculino", "Femenino", "Unisex"].map(c => (
                  <button key={c} onClick={() => setWizard({ ...wizard, corte: c })} style={{ flex: 1, padding: "8px", borderRadius: 8, border: wizard.corte === c ? "2px solid #6c63ff" : "1px solid #ddd", background: wizard.corte === c ? "#f0edff" : "#fff", cursor: "pointer", fontWeight: wizard.corte === c ? 700 : 400, fontSize: 13 }}>{c}</button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#555", display: "block", marginBottom: 4 }}>Otros rasgos</label>
              <input type="text" value={wizard.rasgos} onChange={e => setWizard({ ...wizard, rasgos: e.target.value })} placeholder="Ej: Fondo rojo, detalles dorados, lineas blancas..." style={{ width: "100%", padding: "8px 10px", border: "1px solid #ddd", borderRadius: 8, fontSize: 13, boxSizing: "border-box" }} />
            </div>

            <button onClick={handleSaveWizard} disabled={savingWizard} style={{ width: "100%", padding: "10px", background: wizardSaved ? "#27ae60" : savingWizard ? "#aaa" : "#6c63ff", color: "#fff", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: savingWizard ? "not-allowed" : "pointer" }}>
              {wizardSaved ? "✅ Guardado!" : savingWizard ? "Guardando..." : "Guardar personalizacion"}
            </button>
          </div>
        )}

        {/* Design Items — Production Table (always visible) */}
        <div style={{ background: "#fff", borderRadius: 16, padding: "20px 24px", marginBottom: 20, boxShadow: "0 2px 10px rgba(0,0,0,0.06)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#333" }}>📋 Detalle de Produccion</h2>
            <button onClick={addItem} style={{ padding: "6px 12px", background: "#6c63ff", color: "#fff", border: "none", borderRadius: 8, fontSize: 12, cursor: "pointer", fontWeight: 600 }}>
              + Agregar item
            </button>
          </div>
          <p style={{ margin: "0 0 12px", fontSize: 12, color: "#888" }}>Completá el detalle de cada camiseta: posicion del estampado y talle.</p>

          {designItems.length === 0 && (
            <div style={{ textAlign: "center", color: "#ccc", fontSize: 13, padding: "16px 0" }}>
              Sin items cargados. Hacé clic en "+ Agregar item".
            </div>
          )}
          {designItems.length > 0 && (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#f9f9f9" }}>
                  <th style={{ padding: "8px 6px", textAlign: "center", fontWeight: 700, color: "#555", width: 50 }}>#</th>
                  <th style={{ padding: "8px 6px", textAlign: "center", fontWeight: 700, color: "#555" }}>Head</th>
                  <th style={{ padding: "8px 6px", textAlign: "center", fontWeight: 700, color: "#555" }}>Center</th>
                  <th style={{ padding: "8px 6px", textAlign: "center", fontWeight: 700, color: "#555" }}>Footer</th>
                  <th style={{ padding: "8px 6px", textAlign: "center", fontWeight: 700, color: "#555", width: 80 }}>Talle</th>
                  <th style={{ padding: "8px 6px", width: 100 }}></th>
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
                    {["head", "center", "footer"].map(field => (
                      <td key={field} style={{ padding: "6px" }}>
                        {editingItemIdx === idx ? (
                          <input value={(itemDraft as any)[field] || ""} onChange={e => { const v = e.target.value; setItemDraft({ ...itemDraft, [field]: v }); updateItem(idx, field, v); }} style={{ width: "100%", padding: "4px 6px", border: "1px solid #ddd", borderRadius: 6, fontSize: 12, boxSizing: "border-box" }} />
                        ) : <span style={{ color: (item as any)[field] ? "#333" : "#ccc" }}>{(item as any)[field] || "—"}</span>}
                      </td>
                    ))}
                    <td style={{ padding: "6px", textAlign: "center" }}>
                      {editingItemIdx === idx ? (
                        <input value={itemDraft.talle || ""} onChange={e => { const v = e.target.value; setItemDraft({ ...itemDraft, talle: v }); updateItem(idx, "talle", v); }} style={{ width: 60, padding: "4px", border: "1px solid #ddd", borderRadius: 6, fontSize: 12, textAlign: "center" }} />
                      ) : <span style={{ color: item.talle ? "#333" : "#ccc" }}>{item.talle || "—"}</span>}
                    </td>
                    <td style={{ padding: "6px", display: "flex", gap: 4, justifyContent: "center" }}>
                      {editingItemIdx === idx ? (
                        <button onClick={() => { setEditingItemIdx(null); setItemDraft({ item_number: "", head: "", center: "", footer: "", talle: "" }); }} style={{ padding: "4px 8px", background: "#27ae60", color: "#fff", border: "none", borderRadius: 6, fontSize: 11, cursor: "pointer" }}>OK</button>
                      ) : (
                        <button onClick={() => { setEditingItemIdx(idx); setItemDraft({ item_number: String(item.item_number), head: item.head || "", center: item.center || "", footer: item.footer || "", talle: item.talle || "" }); }} style={{ padding: "4px 8px", background: "#3498db", color: "#fff", border: "none", borderRadius: 6, fontSize: 11, cursor: "pointer" }}>Editar</button>
                      )}
                      <button onClick={() => removeItem(idx)} style={{ padding: "4px 8px", background: "#e74c3c", color: "#fff", border: "none", borderRadius: 6, fontSize: 11, cursor: "pointer" }}>X</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {designItems.length > 0 && (
            <button onClick={() => saveDesignItems(dr!.id)} disabled={savingItems} style={{ marginTop: 12, width: "100%", padding: "10px", background: savingItems ? "#aaa" : "#27ae60", color: "#fff", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: savingItems ? "not-allowed" : "pointer" }}>
              {savingItems ? "Guardando..." : "Guardar items de produccion"}
            </button>
          )}
        </div>


        {/* Upload section */}
        {(dr.status === "pending_template" || dr.status === "template_uploaded" || (dr.status === "feedback" && !dr.rendered_image_url)) && (
          <div style={{ background: "#fff", borderRadius: 16, padding: "20px 24px", marginBottom: 20, boxShadow: "0 2px 10px rgba(0,0,0,0.06)" }}>
            <h2 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 800, color: "#333" }}>📤 Subí tu diseño</h2>
            <p style={{ margin: "0 0 16px", fontSize: 13, color: "#666" }}>
              Subí una imagen de tu diseño (JPG, PNG). Lo procesamos y lo renderizamos en la camiseta.
            </p>
            <input
              type="file"
              accept="image/*"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setUploading(true);
                try {
                  const reader = new FileReader();
                  reader.onload = async (ev) => {
                    const base64 = ev.target?.result as string;
                    const r = await fetch(`${API}/design-requests/public/${token}/upload-image`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ image: base64 }),
                    });
                    const data = await r.json();
                    if (data.error) { alert(data.error); return; }
                    const r2 = await fetch(`${API}/design-requests/public/${token}`);
                    setDr(await r2.json());
                  };
                  reader.readAsDataURL(file);
                } catch { alert("Error al subir imagen"); }
                finally { setUploading(false); }
              }}
              style={{ marginBottom: 12, fontSize: 13 }}
            />
            {uploading && <p style={{ color: "#6c63ff", fontSize: 13, margin: "4px 0" }}>⏳ Subiendo imagen...</p>}
            <div style={{ borderTop: "1px solid #eee", paddingTop: 12, marginTop: 4 }}>
              <p style={{ margin: "0 0 8px", fontSize: 12, color: "#888" }}>O pegá una URL de imagen:</p>
              <form onSubmit={handleUpload} style={{ display: "flex", gap: 8 }}>
                <input type="url" value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://... (URL de imagen)" style={{ flex: 1, padding: "8px 10px", border: "1px solid #ddd", borderRadius: 8, fontSize: 13 }} />
                <button type="submit" disabled={uploading || !imageUrl} style={{ padding: "8px 16px", background: "#3498db", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: uploading ? "not-allowed" : "pointer" }}>
                  Usar URL
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Diseñar button */}
        {(dr.status === "template_uploaded" || (dr.status === "feedback" && !dr.rendered_image_url)) && (
          <div style={{ background: "#fff", borderRadius: 16, padding: "20px 24px", marginBottom: 20, boxShadow: "0 2px 10px rgba(0,0,0,0.06)", textAlign: "center" }}>
            <p style={{ margin: "0 0 12px", fontSize: 13, color: "#666" }}>¿Ya completaste la personalización y subiste tu diseño? Hacé clic para renderizar.</p>
            <button
              onClick={async () => {
                if (!confirm("Esto enviarà tu diseño a renderizar. Continuar?")) return;
                try {
                  const r = await fetch(`${API}/design-requests/public/${token}/render`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ image_url: dr.client_uploaded_image_url }),
                  });
                  const data = await r.json();
                  if (data.error) { alert("Error: " + data.error); return; }
                  // Reload to see updated status
                  const r2 = await fetch(`${API}/design-requests/public/${token}`);
                  setDr(await r2.json());
                } catch(e) { alert("Error al renderizar"); }
              }}
              style={{ padding: "12px 32px", background: "#9b59b6", color: "#fff", border: "none", borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: "pointer" }}
            >
              🎨 Diseñar
            </button>
          </div>
        )}

        {/* Rendered result */}
        {dr.rendered_image_url && (
          <div style={{ background: "#fff", borderRadius: 16, padding: "20px 24px", marginBottom: 20, boxShadow: "0 2px 10px rgba(0,0,0,0.06)" }}>
            <h2 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 800, color: "#333" }}>🎨 Tu diseño renderizado</h2>
            <img src={dr.rendered_image_url} alt="Renderizado" style={{ width: "100%", borderRadius: 10, border: "1px solid #eee" }} />
          </div>
        )}

        {/* Production ready */}
        {dr.status === "production_ready" && (
          <div style={{ background: "#e8f5e9", borderRadius: 16, padding: 24, marginBottom: 20, textAlign: "center", boxShadow: "0 2px 10px rgba(0,0,0,0.06)" }}>
            <div style={{ fontSize: 64, marginBottom: 12 }}>🚀</div>
            <h2 style={{ margin: "0 0 8px", color: "#2e7d32", fontSize: 22 }}>¡Listo para producción!</h2>
            <p style={{ margin: 0, color: "#555", fontSize: 14 }}>Tu diseño fue aprobado y pasará a producción.</p>
          </div>
        )}

        {/* Feedback */}
        <div style={{ background: "#fff", borderRadius: 16, padding: "20px 24px", marginBottom: 20, boxShadow: "0 2px 10px rgba(0,0,0,0.06)" }}>
          <h2 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 800, color: "#333" }}>💬 Comentarios</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
            {(dr.feedback ?? []).map(fb => (
              <div key={fb.id} style={{ padding: "10px 14px", borderRadius: 10, background: fb.author === "client" ? "#e8f5e9" : fb.author === "designer" ? "#f3e5f5" : "#e3f2fd", border: `1px solid ${fb.author === "client" ? "#a5d6a7" : fb.author === "designer" ? "#ce93d8" : "#90caf9"}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontWeight: 700, fontSize: 12, textTransform: "capitalize" }}>
                    {fb.author === "client" ? "👤 Vos" : fb.author === "designer" ? "🎨 Diseñador" : "🤖 Tienda"}
                  </span>
                  <span style={{ fontSize: 11, color: "#888" }}>{new Date(fb.created_at).toLocaleString("es-AR")}</span>
                </div>
                <div style={{ fontSize: 14 }}>{fb.message}</div>
              </div>
            ))}
            {(!dr.feedback || dr.feedback.length === 0) && (
              <p style={{ color: "#ccc", fontStyle: "italic", margin: 0 }}>Sin comentarios aún</p>
            )}
          </div>
          <form onSubmit={handleFeedback} style={{ display: "flex", gap: 8 }}>
            <textarea value={feedbackText} onChange={e => setFeedbackText(e.target.value)} placeholder="Escribí tu comentario..." rows={2} style={{ flex: 1, padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd", fontSize: 13, resize: "vertical", fontFamily: "inherit" }} />
            <button type="submit" disabled={sendingFeedback || !feedbackText.trim()} style={{ padding: "10px 18px", background: sendingFeedback ? "#aaa" : "#6c63ff", color: "#fff", border: "none", borderRadius: 10, fontSize: 13, cursor: sendingFeedback ? "not-allowed" : "pointer", fontWeight: 700, alignSelf: "flex-end" }}>
              {sendingFeedback ? "Enviando..." : "Enviar 💬"}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div style={{ textAlign: "center", marginTop: 20, padding: "16px", color: "#aaa", fontSize: 12 }}>
          Powered by <strong>Baver</strong>
        </div>
      </div>
    </div>
  );
}
