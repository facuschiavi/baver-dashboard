"use client";
import { useState, useEffect, useCallback } from "react";
import {
  DndContext, DragOverlay, useSensor, useSensors, PointerSensor,
  closestCorners, useDroppable, useDraggable
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const API = process.env.NEXT_PUBLIC_API_URL || "/api";

// ── Types ──
interface StageItem {
  id: number; stage_name: string; sort_order: number;
  product_name: string; quantity: number; order_number: string;
  client_name: string; status: string; assigned_to: string | null;
  started_at: string; notes: string | null;
  order_id: number; order_item_id: number;
}
interface Stage {
  id: number; name: string; sort_order: number; items: StageItem[];
}

// ── Helpers ──
function authHeaders() {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : "";
  return { "Content-Type": "application/json", Authorization: "Bearer " + token };
}
function statusColor(status: string) {
  switch (status) {
    case "completed": return "#2ecc71";
    case "blocked": return "#e74c3c";
    case "in_progress": return "#3498db";
    default: return "#95a5a6";
  }
}
function timeInStage(started: string) {
  const diff = Date.now() - new Date(started).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 24) return hours + "h";
  return Math.floor(hours / 24) + "d " + (hours % 24) + "h";
}

// ── Draggable Item ──
function DraggableItem({ item, stageSortOrder }: { item: StageItem; stageSortOrder: number }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: "item-" + item.id,
    data: { type: "item", item, stageSortOrder },
  });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}
      onClick={() => {
        // Open detail modal is handled by parent; but if we click while not dragging, we need a cleaner approach:
        // We'll use a separate onClick on the inner element instead.
      }}
      className="production-card"
      data-has-notes={item.notes ? "true" : "false"}
      data-status={item.status}
    >
      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 2 }}>{item.product_name}</div>
      <div style={{ fontSize: 11, color: "#888" }}>NV #{item.order_number}</div>
      <div style={{ fontSize: 11, color: "#888" }}>{item.client_name}</div>
      <div style={{ fontSize: 11, color: "#999", marginTop: 2 }}>x{item.quantity}</div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
        <span style={{ fontSize: 10, color: statusColor(item.status), fontWeight: 700 }}>
          {item.status === "completed" ? "Listo" : item.status === "blocked" ? "Bloqueado" : item.status === "in_progress" ? "En curso" : "Pendiente"}
        </span>
        <span style={{ fontSize: 10, color: "#aaa" }}>{timeInStage(item.started_at)}</span>
      </div>
    </div>
  );
}

// ── Droppable Column ──
function StageColumn({ stage, onAdvance, onRollback, onToggleBlock, onOpenDetail, onDeleteItem }: {
  stage: Stage;
  onAdvance: (id: number) => void;
  onRollback: (id: number) => void;
  onToggleBlock: (item: StageItem) => void;
  onOpenDetail: (item: StageItem) => void;
  onDeleteItem: (id: number) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: "stage-" + stage.id, data: { type: "stage", stage } });
  return (
    <div ref={setNodeRef} style={{
      minWidth: 260, maxWidth: 300, flex: 1,
      background: isOver ? "#eef0ff" : "#f5f5f5",
      borderRadius: 12, padding: 12,
      transition: "background 0.15s",
    }}>
      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8, color: "#555" }}>
        {stage.name}
        <span style={{ marginLeft: 8, fontSize: 12, color: "#999" }}>({stage.items.length})</span>
      </div>
      <SortableContext items={stage.items.map(i => "item-" + i.id)} strategy={verticalListSortingStrategy}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, minHeight: 40 }}>
          {stage.items.length === 0 && (
            <div style={{ fontSize: 12, color: "#bbb", textAlign: "center", padding: 20 }}>Vacío</div>
          )}
          {stage.items.map(item => (
            <div key={item.id} onClick={() => onOpenDetail(item)} style={{ cursor: "pointer" }}>
              <DraggableItem item={item} stageSortOrder={stage.sort_order} />
            </div>
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

// ── Main Component ──
export default function ProduccionPage() {
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeDragItem, setActiveDragItem] = useState<any>(null);
  const [selectedItem, setSelectedItem] = useState<StageItem | null>(null);
  const [noteText, setNoteText] = useState("");
  const [assignText, setAssignText] = useState("");

  // Stage config
  const [showStageConfig, setShowStageConfig] = useState(false);
  const [configStages, setConfigStages] = useState<any[]>([]);
  const [newStageName, setNewStageName] = useState("");

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const loadPipeline = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(API + "/plugins/produccion/pipeline", { headers: authHeaders() });
      if (!res.ok) throw new Error("Error " + res.status);
      const data = await res.json();
      setStages(data.stages || []);
    } catch (e: any) { console.error(e); alert("Error cargando pipeline"); }
    setLoading(false);
  }, []);

  useEffect(() => { loadPipeline(); }, [loadPipeline]);

  // ── Stage config ──
  async function loadConfigStages() {
    try {
      const res = await fetch(API + "/plugins/produccion/stages", { headers: authHeaders() });
      if (!res.ok) return;
      setConfigStages(await res.json());
    } catch {}
  }
  async function addStage() {
    if (!newStageName.trim()) return;
    try {
      const res = await fetch(API + "/plugins/produccion/stages", { method: "POST", headers: authHeaders(), body: JSON.stringify({ name: newStageName.trim() }) });
      if (!res.ok) { alert("Error al crear etapa"); return; }
      setNewStageName(""); await loadConfigStages(); await loadPipeline();
    } catch (e: any) { alert("Error: " + e.message); }
  }
  async function deleteStage(id: number) {
    if (!confirm("¿Eliminar esta etapa? No se puede si tiene items de produccion.")) return;
    try {
      const res = await fetch(API + "/plugins/produccion/stages/" + id, { method: "DELETE", headers: authHeaders() });
      if (!res.ok) { alert((await res.json()).error); return; }
      await loadConfigStages(); await loadPipeline();
    } catch (e: any) { alert("Error: " + e.message); }
  }
  async function moveStage(id: number) {
    const stage = configStages.find(s => s.id === id);
    if (!stage) return;
    const newPosStr = prompt("Nueva posicion (1-" + configStages.length + "):", String(stage.sort_order));
    if (!newPosStr) return;
    const newPos = parseInt(newPosStr);
    if (isNaN(newPos) || newPos < 1 || newPos > configStages.length) { alert("Posicion invalida"); return; }
    try {
      const res = await fetch(API + "/plugins/produccion/stages/" + id + "/sort", { method: "PUT", headers: authHeaders(), body: JSON.stringify({ sort_order: newPos }) });
      if (!res.ok) { alert("Error al reordenar"); return; }
      setConfigStages(await res.json()); await loadPipeline();
    } catch (e: any) { alert("Error: " + e.message); }
  }

  // ── Item actions ──
  async function advance(itemId: number) {
    try {
      const res = await fetch(API + "/plugins/produccion/advance/" + itemId, { method: "PATCH", headers: authHeaders(), body: JSON.stringify({}) });
      if (!res.ok) throw new Error((await res.json()).error);
      loadPipeline();
    } catch (e: any) { alert("Error: " + e.message); }
  }
  async function rollback(itemId: number) {
    try {
      const res = await fetch(API + "/plugins/produccion/rollback/" + itemId, { method: "PATCH", headers: authHeaders(), body: JSON.stringify({}) });
      if (!res.ok) throw new Error((await res.json()).error);
      loadPipeline();
    } catch (e: any) { alert("Error: " + e.message); }
  }
  async function toggleBlock(item: StageItem) {
    if (item.status === "blocked") {
      await fetch(API + "/plugins/produccion/unblock/" + item.id, { method: "PATCH", headers: authHeaders() });
    } else {
      const reason = prompt("Motivo del bloqueo:");
      if (!reason) return;
      await fetch(API + "/plugins/produccion/block/" + item.id, { method: "PATCH", headers: authHeaders(), body: JSON.stringify({ notes: reason }) });
    }
    loadPipeline();
  }
  async function saveItem(itemId: number) {
    const body: any = {};
    if (noteText) body.notes = noteText;
    if (assignText) body.assigned_to = assignText;
    if (!Object.keys(body).length) return;
    await fetch(API + "/plugins/produccion/item/" + itemId, { method: "PATCH", headers: authHeaders(), body: JSON.stringify(body) });
    setNoteText(""); setAssignText(""); loadPipeline();
  }

  // ── DnD handlers ──
  function handleDragStart(event: any) {
    const { active } = event;
    if (active.data.current?.type === "item") {
      setActiveDragItem(active.data.current.item);
    }
  }

  async function handleDragEnd(event: any) {
    setActiveDragItem(null);
    const { active, over } = event;
    if (!over) return;
    if (active.id === over.id) return;

    const activeData = active.data.current;
    const overData = over.data.current;
    if (!activeData || activeData.type !== "item") return;

    const itemId = activeData.item.id;
    let targetStageId: number | null = null;

    if (overData?.type === "item") {
      // Dropped on another item — find its stage
      const overItem = overData.item;
      for (const s of stages) {
        if (s.items.find(i => i.id === overItem.id)) {
          targetStageId = s.id;
          break;
        }
      }
    } else if (overData?.type === "stage") {
      targetStageId = overData.stage.id;
    }

    if (!targetStageId) return;

    const currentStageSortOrder = activeData.stageSortOrder;
    const targetStage = stages.find(s => s.id === targetStageId);
    if (!targetStage) return;

    // Same stage: just reorder (internal)
    if (targetStage.sort_order === currentStageSortOrder) return;

    // Different stage: advance or rollback?
    if (targetStage.sort_order > currentStageSortOrder) {
      // Advance forward to target stage
      // We need to advance multiple times if needed
      const diff = targetStage.sort_order - currentStageSortOrder;
      for (let i = 0; i < diff; i++) {
        await fetch(API + "/plugins/produccion/advance/" + itemId, { method: "PATCH", headers: authHeaders(), body: JSON.stringify({}) });
      }
    } else {
      // Rollback
      const diff = currentStageSortOrder - targetStage.sort_order;
      for (let i = 0; i < diff; i++) {
        await fetch(API + "/plugins/produccion/rollback/" + itemId, { method: "PATCH", headers: authHeaders(), body: JSON.stringify({}) });
      }
    }
    loadPipeline();
  }

  function handleDragOver(event: any) {
    // We don't need live reordering; just handle on drop
  }

  function findStageAndItem(itemId: number) {
    for (const s of stages) {
      const it = s.items.find(i => i.id === itemId);
      if (it) return { stage: s, item: it };
    }
    return null;
  }

  const allItemIds = stages.flatMap(s => s.items.map(i => "item-" + i.id));

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h1 style={{ fontSize: 20, margin: 0 }}>Producción</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={loadPipeline} style={{ padding: "8px 16px", background: "#6c63ff", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" }}>
            Refrescar
          </button>
          <button onClick={() => { loadConfigStages(); setShowStageConfig(true); }} title="Configurar etapas" style={{ padding: "8px 12px", background: "#f0f0f0", color: "#555", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 16 }}>
            ⚙️
          </button>
        </div>
      </div>

      {loading ? <p>Cargando...</p> : (
        <DndContext sensors={sensors} collisionDetection={closestCorners}
          onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
          <div style={{ display: "flex", gap: 12, overflowX: "auto", minHeight: "60vh", paddingBottom: 20 }}>
            {stages.map(stage => (
              <StageColumn key={stage.id} stage={stage}
                onAdvance={advance} onRollback={rollback} onToggleBlock={toggleBlock}
                onOpenDetail={(item) => { setSelectedItem(item); setNoteText(""); setAssignText(item.assigned_to || ""); }}
                onDeleteItem={() => {}} />
            ))}
          </div>
          <DragOverlay>
            {activeDragItem ? (
              <div style={{
                padding: 10, borderRadius: 8, background: "#fff",
                border: "2px solid #6c63ff", fontSize: 13, boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
                minWidth: 200,
              }}>
                <div style={{ fontWeight: 700 }}>{activeDragItem.product_name}</div>
                <div style={{ fontSize: 11, color: "#888" }}>NV #{activeDragItem.order_number}</div>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* ── Detail modal ── */}
      {selectedItem && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}
          onClick={() => setSelectedItem(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 12, padding: 24, maxWidth: 500, width: "90%" }}>
            <h3 style={{ margin: "0 0 12px" }}>{selectedItem.product_name}</h3>
            <div style={{ fontSize: 13, lineHeight: 1.8 }}>
              <div><strong>NV:</strong> #{selectedItem.order_number}</div>
              <div><strong>Cliente:</strong> {selectedItem.client_name}</div>
              <div><strong>Cantidad:</strong> {selectedItem.quantity}</div>
              <div><strong>Stage:</strong> {selectedItem.stage_name}</div>
              <div><strong>Estado:</strong> {selectedItem.status}</div>
              <div><strong>Iniciado:</strong> {new Date(selectedItem.started_at).toLocaleString()}</div>
              {selectedItem.assigned_to && <div><strong>Responsable:</strong> {selectedItem.assigned_to}</div>}
              {selectedItem.notes && <div><strong>Notas:</strong><br />{selectedItem.notes}</div>}
            </div>
            {/* Acciones rápidas */}
            <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
              <button onClick={() => { advance(selectedItem.id); setSelectedItem(null); }}
                style={{ padding: "6px 14px", fontSize: 12, background: "#6c63ff", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}>
                ▶ Avanzar
              </button>
              <button onClick={() => { rollback(selectedItem.id); setSelectedItem(null); }}
                style={{ padding: "6px 14px", fontSize: 12, background: "#f0f0f0", color: "#555", border: "none", borderRadius: 6, cursor: "pointer" }}>
                ↩ Retroceder
              </button>
              <button onClick={() => { toggleBlock(selectedItem); setSelectedItem(null); }}
                style={{ padding: "6px 14px", fontSize: 12, background: selectedItem.status === "blocked" ? "#2ecc71" : "#e74c3c", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}>
                {selectedItem.status === "blocked" ? "↻ Desbloquear" : "⚠ Bloquear"}
              </button>
            </div>
            <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
              <input value={assignText} onChange={e => setAssignText(e.target.value)}
                placeholder="Responsable..." style={{ padding: "8px 12px", border: "1px solid #ddd", borderRadius: 8, fontSize: 13 }} />
              <textarea value={noteText} onChange={e => setNoteText(e.target.value)}
                placeholder="Notas..." style={{ padding: "8px 12px", border: "1px solid #ddd", borderRadius: 8, fontSize: 13, minHeight: 60 }} />
              <button onClick={() => { saveItem(selectedItem.id); setSelectedItem(null); }}
                style={{ padding: "8px 16px", background: "#6c63ff", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" }}>
                Guardar
              </button>
            </div>
            <button onClick={() => setSelectedItem(null)} style={{ marginTop: 12, padding: "8px 16px", background: "#f0f0f0", border: "none", borderRadius: 8, cursor: "pointer" }}>
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* ── Stage config modal ── */}
      {showStageConfig && (
        <div onClick={() => setShowStageConfig(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "20px", paddingTop: "40px", zIndex: 1000, overflowY: "auto" }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: "18px", padding: "24px", width: "100%", maxWidth: "550px", boxShadow: "0 24px 70px rgba(0,0,0,0.25)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ margin: 0, fontSize: "18px" }}>⚙️ Configurar etapas</h3>
              <button onClick={() => setShowStageConfig(false)} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "#999" }}>✕</button>
            </div>
            <div style={{ marginBottom: "16px" }}>
              {configStages.length === 0 ? (
                <div style={{ padding: "16px", textAlign: "center", color: "#999", fontSize: "13px" }}>Sin etapas configuradas</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {configStages.map((s, i) => (
                    <div key={s.id} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 12px", background: "#f8f9fa", borderRadius: "10px", border: "1px solid #eee" }}>
                      <span style={{ fontSize: "14px", color: "#999", fontWeight: 700, minWidth: "20px" }}>{s.sort_order}.</span>
                      <span style={{ flex: 1, fontWeight: 600, fontSize: "14px" }}>{s.name}</span>
                      <button onClick={() => moveStage(s.id)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "14px", color: "#6c63ff", padding: "4px 8px" }} title="Mover a otra posicion">↕</button>
                      <button onClick={() => deleteStage(s.id)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "14px", color: "#e74c3c", padding: "4px" }} title="Eliminar">✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
              <input type="text" value={newStageName} onChange={e => setNewStageName(e.target.value)}
                placeholder="Nombre de la nueva etapa"
                style={{ flex: 1, padding: "8px 12px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "13px", outline: "none" }}
                onKeyDown={e => e.key === "Enter" && addStage()} />
              <button onClick={addStage} style={{ padding: "8px 16px", background: "#6c63ff", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: 600, whiteSpace: "nowrap" }}>
                + Agregar
              </button>
            </div>
            <div style={{ fontSize: "11px", color: "#999" }}>Las etapas se ordenan numericamente. Usa ↕ para reposicionar.</div>
          </div>
        </div>
      )}
    </div>
  );
}
