"use client";

import { useEffect, useState, useCallback } from "react";
import { fetchJson, postJson, putJson, deleteJson } from "../../lib";
import ChatPanel from "../../components/ChatPanel";
import WhatsAppQRModal from "../../components/WhatsAppQRModal";
import { Card, IconButton, Button, Input, Select, PageTitle, Loading, Empty, Badge } from "../../components/shared/UI";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type AgentInstruction = {
  id?: number;
  agent_id: number;
  type: "permanent" | "transient";
  content: string;
  sort_order: number;
  is_active: boolean;
};

type AgentProcedure = {
  id?: number;
  agent_id: number;
  context: string;
  step_order: number;
  step_name: string;
  step_prompt: string;
  active: boolean;
};

type User = { id: number; name: string; username: string; is_active: boolean };

type Agent = {
  id: number;
  name: string;
  description: string;
  platform: string;
  is_active: boolean;
  working_hours: string;
  tone: string;
  industry_context: string;
  autonomy_level: string;
  cash_user_id?: number | null;
};

const CONTEXTS = [
  { value: "lead_nuevo", label: "🆕 Lead nuevo" },
  { value: "lead_caliente", label: "🔥 Lead caliente" },
  { value: "cliente", label: "🤝 Cliente" },
  { value: "admin", label: "👤 Admin" },
];

export default function AgentesPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"instrucciones" | "procedimientos">("instrucciones");
  const [configVersion, setConfigVersion] = useState(0);
  const [showQr, setShowQr] = useState(false);

  // Instrucciones state
  const [instructions, setInstructions] = useState<AgentInstruction[]>([]);
  const [newInstText, setNewInstText] = useState<Record<string, string>>({ permanent: "", transient: "" });

  // Procedimientos state
  const [procedures, setProcedures] = useState<AgentProcedure[]>([]);
  const [newProcStep, setNewProcStep] = useState<Omit<AgentProcedure, "id" | "agent_id" | "active">>({
    context: "lead_nuevo", step_order: 0, step_name: "", step_prompt: "",
  });

  const [form, setForm] = useState({
    name: "",
    description: "",
    platform: "web",
    tone: "casual",
    autonomy_level: "partial",
    working_hours: "09:00-18:00",
    industry_context: "",
    cash_user_id: "",
  });

  function loadAgents() {
    setLoading(true);
    Promise.all([fetchJson<Agent[]>("/agents"), fetchJson<User[]>("/users")])
      .then(([a, u]) => { setAgents(a); setUsers(u.filter(user => user.is_active !== false)); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadAgents(); }, []);

  useEffect(() => {
    const onApplied = () => setConfigVersion((v) => v + 1);
    window.addEventListener("architectDraftApplied", onApplied);
    return () => window.removeEventListener("architectDraftApplied", onApplied);
  }, []);

  useEffect(() => {
    if (editingId) {
      fetchJson<any[]>(`/agent-instructions?agent_id=${editingId}`)
        .then((rows) => {
          const normalized: AgentInstruction[] = rows.map((r: any) => ({
            ...r,
            type: r.type === "transient" ? "transient" as const : "permanent" as const,
          }));
          setInstructions(normalized);
        })
        .catch(console.error);
      fetchJson<AgentProcedure[]>(`/agent-procedures?agent_id=${editingId}`)
        .then(setProcedures)
        .catch(console.error);
    } else {
      setInstructions([]);
      setProcedures([]);
    }
  }, [editingId, configVersion]);

  function openEdit(agent: Agent) {
    setEditingId(agent.id);
    setActiveTab("instrucciones");
    setNewInstText({ permanent: "", transient: "" });
    setNewProcStep({ context: "lead_nuevo", step_order: 0, step_name: "", step_prompt: "" });
    setForm({
      name: agent.name,
      description: agent.description || "",
      platform: agent.platform,
      tone: agent.tone,
      autonomy_level: agent.autonomy_level,
      working_hours: agent.working_hours,
      industry_context: agent.industry_context || "",
      cash_user_id: agent.cash_user_id ? String(agent.cash_user_id) : "",
    });
    setShowForm(true);
  }

  async function handleSave() {
    try {
      const agentPayload = { ...form, cash_user_id: form.cash_user_id ? Number(form.cash_user_id) : null };
      let savedAgentId = editingId;

      if (editingId) {
        await putJson(`/agents/${editingId}`, agentPayload);
      } else {
        const created = await postJson<{ id: number }>("/agents", agentPayload);
        savedAgentId = created.id;
      }

      // Sync instructions
      const existing = instructions.filter((i) => i.id);
      for (const inst of existing) {
        if (inst.id) {
          await putJson(`/agent-instructions/${inst.id}`, {
            type: inst.type,
            content: inst.content,
            sort_order: inst.sort_order,
            is_active: inst.is_active,
          });
        }
      }

      const newOnes = instructions.filter((i) => !i.id);
      for (const inst of newOnes) {
        await postJson("/agent-instructions", {
          agent_id: savedAgentId,
          type: inst.type,
          content: inst.content,
          sort_order: inst.sort_order,
        });
      }

      // Sync procedures
      const existingProcs = procedures.filter((p) => p.id);
      for (const proc of existingProcs) {
        if (proc.id) {
          await putJson(`/agent-procedures/${proc.id}`, {
            context: proc.context,
            step_order: proc.step_order,
            step_name: proc.step_name,
            step_prompt: proc.step_prompt,
            active: proc.active,
          });
        }
      }

      const newProcs = procedures.filter((p) => !p.id);
      for (const proc of newProcs) {
        await postJson("/agent-procedures", {
          agent_id: savedAgentId,
          context: proc.context,
          step_order: proc.step_order,
          step_name: proc.step_name,
          step_prompt: proc.step_prompt,
          active: proc.active,
        });
      }

      setShowForm(false);
      loadAgents();
    } catch (e) {
      console.error(e);
      alert("Error al guardar: " + (e as Error).message);
    }
  }

  async function handleDeleteAgent(id: number) {
    if (!confirm("¿Eliminar este agente?")) return;
    try {
      await deleteJson(`/agents/${id}`);
      loadAgents();
    } catch (e) { console.error(e); }
  }

  // ── Instrucciones helpers ──

  function addInstruction(type: "permanent" | "transient") {
    const text = newInstText[type].trim();
    if (!text) return;
    const sameType = instructions.filter((i) => i.type === type);
    setInstructions([
      ...instructions,
      { agent_id: editingId || 0, type, content: text, sort_order: sameType.length, is_active: true },
    ]);
    setNewInstText({ ...newInstText, [type]: "" });
  }

  function removeInstruction(index: number) {
    setInstructions(instructions.filter((_, i) => i !== index));
  }

  function toggleInstActive(index: number) {
    setInstructions(
      instructions.map((inst, i) =>
        i === index ? { ...inst, is_active: !inst.is_active } : inst
      )
    );
  }

  function updateInstructionContent(index: number, content: string) {
    setInstructions(
      instructions.map((inst, i) => (i === index ? { ...inst, content } : inst))
    );
  }

  const handleInstDragEnd = useCallback((event: DragEndEvent, type: "permanent" | "transient") => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const sameType = instructions.filter((i) => i.type === type);
    const oldIndex = sameType.findIndex((i) => `inst-${i.id || i.content}` === active.id);
    const newIndex = sameType.findIndex((i) => `inst-${i.id || i.content}` === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = [...sameType];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);
    reordered.forEach((item, idx) => { item.sort_order = idx; });

    const otherType = instructions.filter((i) => i.type !== type);
    setInstructions([...otherType, ...reordered]);
  }, [instructions]);

  // ── Procedimientos helpers ──

  function addProcedureStep() {
    const prompt = newProcStep.step_prompt.trim();
    if (!prompt) return;
    const stepsThisContext = procedures.filter((p) => p.context === newProcStep.context);
    setProcedures([
      ...procedures,
      {
        agent_id: editingId || 0,
        context: newProcStep.context,
        step_order: stepsThisContext.length,
        step_name: newProcStep.step_name,
        step_prompt: prompt,
        active: true,
      },
    ]);
    setNewProcStep({ context: newProcStep.context, step_order: 0, step_name: "", step_prompt: "" });
  }

  function removeProcedureStep(index: number) {
    setProcedures(procedures.filter((_, i) => i !== index));
  }

  function toggleProcActive(index: number) {
    setProcedures(
      procedures.map((p, i) => (i === index ? { ...p, active: !p.active } : p))
    );
  }

  function updateProcedureStep(index: number, field: keyof AgentProcedure, value: string | boolean | number) {
    setProcedures(
      procedures.map((p, i) => (i === index ? { ...p, [field]: value } : p))
    );
  }

  const handleProcDragEnd = useCallback((event: DragEndEvent, context: string) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const sameCtx = procedures.filter((p) => p.context === context);
    const oldIndex = sameCtx.findIndex((p) => `proc-${p.id || p.step_name}` === active.id);
    const newIndex = sameCtx.findIndex((p) => `proc-${p.id || p.step_name}` === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = [...sameCtx];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);
    reordered.forEach((item, idx) => { item.step_order = idx; });

    const otherCtx = procedures.filter((p) => p.context !== context);
    setProcedures([...otherCtx, ...reordered]);
  }, [procedures]);

  function groupBy<T extends Record<string, any>>(arr: T[], key: string): Record<string, T[]> {
    return arr.reduce((acc, item) => {
      const k = String(item[key]);
      if (!acc[k]) acc[k] = [];
      acc[k].push(item);
      return acc;
    }, {} as Record<string, T[]>);
  }

  const TONE_ICONS: Record<string, string> = { formal: "🤵", casual: "😊", picarro: "😏" };
  const permanentInst = instructions.filter((i) => i.type === "permanent");
  const transientInst = instructions.filter((i) => i.type === "transient");
  const procByContext = groupBy(procedures, "context");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <PageTitle>🤖 Mis Agentes</PageTitle>
        <button onClick={() => setShowQr(true)}
          style={{
            padding: '8px 14px', fontSize: '13px', borderRadius: '8px',
            border: '1px solid rgba(34,197,94,0.35)', background: 'rgba(34,197,94,0.1)',
            color: '#4ade80', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
            fontWeight: 500, whiteSpace: 'nowrap'
          }}>
          📱 WhatsApp QR
        </button>
      </div>

      {loading ? <Loading /> : agents.length === 0 ? (
        <Empty message="No hay agentes. Creá el primero." />
      ) : (
        <div style={{ display: "grid", gap: "12px" }}>
          {agents.map((agent) => (
            <Card key={agent.id}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                    <strong style={{ fontSize: "16px" }}>{agent.name}</strong>
                    <Badge color={agent.is_active ? "#27ae60" : "#e74c3c"}>
                      {agent.is_active ? "●" : "○"}
                    </Badge>
                    <Badge>{agent.platform}</Badge>
                    <span style={{ fontSize: "14px" }}>{TONE_ICONS[agent.tone] || "💬"}</span>
                    {agent.cash_user_id && <Badge>💵 Caja: {users.find(u => u.id === agent.cash_user_id)?.name || `Usuario ${agent.cash_user_id}`}</Badge>}
                  </div>
                  {agent.description && (
                    <p style={{ margin: "2px 0 0", fontSize: "13px", color: "#666" }}>{agent.description}</p>
                  )}
                  <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#999" }}>
                    🕐 {agent.working_hours} · 🔒 {agent.autonomy_level}
                  </p>
                </div>
                <div style={{ display: "flex", gap: "4px" }}>
                  <IconButton variant="ghost" title="Editar" onClick={() => openEdit(agent)}>✏️</IconButton>
                  <IconButton variant="danger" title="Eliminar" onClick={() => handleDeleteAgent(agent.id)}>🗑️</IconButton>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {!loading && agents.length > 0 && (
        <div style={{ marginTop: "16px", clear: "both" }}>
          <Card>
            <div style={{ marginBottom: "14px" }}>
              <h2 style={{ fontSize: "18px", fontWeight: 800, margin: "0 0 4px" }}>🧠 Mi agente</h2>
              <p style={{ margin: 0, fontSize: "13px", color: "#666" }}>
                Probá escenarios en el simulador o enseñale criterios reales al agente desde el modo arquitecto.
              </p>
            </div>
            <ChatPanel />
          </Card>
        </div>
      )}

      {showForm && (
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
            zIndex: 100, display: "flex", alignItems: "center",
            justifyContent: "center", padding: "20px",
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowForm(false); }}
        >
          <div
            style={{
              background: "#fff", borderRadius: "16px", padding: "24px",
              width: "100%", maxWidth: "620px", maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            <h2 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "20px" }}>
              {editingId ? "✏️ Editar Agente" : "+ Nuevo Agente"}
            </h2>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <Input label="Nombre" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
              <Select label="Plataforma" value={form.platform} onChange={(v) => setForm({ ...form, platform: v })}
                options={[
                  { value: "web", label: "🌐 Web" },
                  { value: "whatsapp", label: "📱 WhatsApp" },
                  { value: "telegram", label: "✈️ Telegram" },
                  { value: "instagram", label: "📸 Instagram" },
                ]} />
            </div>

            <Input label="Descripción" value={form.description} onChange={(v) => setForm({ ...form, description: v })} />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <Select label="Tono" value={form.tone} onChange={(v) => setForm({ ...form, tone: v })}
                options={[
                  { value: "formal", label: "🤵 Formal" },
                  { value: "casual", label: "😊 Casual" },
                  { value: "picarro", label: "😏 Pícaro" },
                ]} />
              <Select label="Autonomía" value={form.autonomy_level} onChange={(v) => setForm({ ...form, autonomy_level: v })}
                options={[
                  { value: "full", label: "🔓 Total" },
                  { value: "partial", label: "🔒 Parcial" },
                  { value: "supervised", label: "👤 Supervisado" },
                ]} />
            </div>

            <Input label="Horario" value={form.working_hours} onChange={(v) => setForm({ ...form, working_hours: v })} placeholder="09:00-18:00" />

            <Select label="Usuario de caja" value={form.cash_user_id} onChange={(v) => setForm({ ...form, cash_user_id: v })}
              options={[
                { value: "", label: "Sin usuario de caja" },
                ...users.map((u) => ({ value: String(u.id), label: `💵 ${u.name || u.username}` })),
              ]} />

            <div style={{ marginBottom: "12px" }}>
              <label style={{ fontSize: "13px", fontWeight: 600, display: "block", marginBottom: "4px", color: "#555" }}>Contexto del negocio</label>
              <textarea value={form.industry_context} onChange={(e) => setForm({ ...form, industry_context: e.target.value })}
                placeholder="Vendo piscinas y productos de limpieza..." rows={2}
                style={{ width: "100%", padding: "8px 12px", border: "1px solid #ddd", borderRadius: "8px", fontSize: "14px", fontFamily: "inherit", boxSizing: "border-box", resize: "vertical" }} />
            </div>

            {/* ── TABS ── */}
            <div style={{ display: "flex", gap: "4px", marginBottom: "16px", borderBottom: "2px solid #eee" }}>
              <TabButton
                label="📋 Instrucciones"
                active={activeTab === "instrucciones"}
                onClick={() => setActiveTab("instrucciones")}
              />
              <TabButton
                label="📋 Procedimientos"
                active={activeTab === "procedimientos"}
                onClick={() => setActiveTab("procedimientos")}
              />
            </div>

            {/* ── INSTRUCCIONES TAB ── */}
            {activeTab === "instrucciones" && (
              <div>
                {/* Instrucciones permanentes */}
                <div style={{ marginBottom: "16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <label style={{ fontSize: "13px", fontWeight: 700, color: "#333" }}>📌 Instrucciones Permanentes</label>
                  </div>
                  {permanentInst.length === 0 ? (
                    <p style={{ fontSize: "12px", color: "#aaa" }}>Sin instrucciones permanentes</p>
                  ) : (
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={(e) => handleInstDragEnd(e, "permanent")}
                    >
                      <SortableContext
                        items={permanentInst.map((i) => `inst-${i.id || i.content}`)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "8px" }}>
                          {permanentInst.map((inst, idx) => {
                            const globalIdx = instructions.findIndex((i) => i === inst);
                            return (
                              <SortableInstructionItem
                                key={`inst-${inst.id || inst.content}-${idx}`}
                                id={`inst-${inst.id || inst.content}`}
                                content={inst.content}
                                isActive={inst.is_active}
                                onContentChange={(v) => updateInstructionContent(globalIdx, v)}
                                onToggleActive={() => toggleInstActive(globalIdx)}
                                onRemove={() => removeInstruction(globalIdx)}
                              />
                            );
                          })}
                        </div>
                      </SortableContext>
                    </DndContext>
                  )}
                  <div style={{ display: "flex", gap: "6px" }}>
                    <textarea
                      value={newInstText.permanent}
                      onChange={(e) => setNewInstText({ ...newInstText, permanent: e.target.value })}
                      placeholder="Nueva instrucción permanente..."
                      rows={2}
                      style={{ flex: 1, padding: "6px 10px", border: "1px solid #ddd", borderRadius: "8px", fontSize: "13px", fontFamily: "inherit", resize: "vertical", boxSizing: "border-box" }}
                    />
                    <Button variant="secondary" onClick={() => addInstruction("permanent")} style={{ alignSelf: "flex-end", padding: "6px 12px" }}>＋ Agregar</Button>
                  </div>
                </div>

                {/* Instrucciones transitorias */}
                <div style={{ marginBottom: "16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <label style={{ fontSize: "13px", fontWeight: 700, color: "#333" }}>🎯 Instrucciones Transitorias (promos)</label>
                  </div>
                  {transientInst.length === 0 ? (
                    <p style={{ fontSize: "12px", color: "#aaa" }}>Sin instrucciones transitorias</p>
                  ) : (
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={(e) => handleInstDragEnd(e, "transient")}
                    >
                      <SortableContext
                        items={transientInst.map((i) => `inst-${i.id || i.content}`)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "8px" }}>
                          {transientInst.map((inst, idx) => {
                            const globalIdx = instructions.findIndex((i) => i === inst);
                            return (
                              <SortableInstructionItem
                                key={`inst-${inst.id || inst.content}-${idx}`}
                                id={`inst-${inst.id || inst.content}`}
                                content={inst.content}
                                isActive={inst.is_active}
                                onContentChange={(v) => updateInstructionContent(globalIdx, v)}
                                onToggleActive={() => toggleInstActive(globalIdx)}
                                onRemove={() => removeInstruction(globalIdx)}
                              />
                            );
                          })}
                        </div>
                      </SortableContext>
                    </DndContext>
                  )}
                  <div style={{ display: "flex", gap: "6px" }}>
                    <textarea
                      value={newInstText.transient}
                      onChange={(e) => setNewInstText({ ...newInstText, transient: e.target.value })}
                      placeholder="Nueva instrucción transitoria..."
                      rows={2}
                      style={{ flex: 1, padding: "6px 10px", border: "1px solid #ddd", borderRadius: "8px", fontSize: "13px", fontFamily: "inherit", resize: "vertical", boxSizing: "border-box" }}
                    />
                    <Button variant="secondary" onClick={() => addInstruction("transient")} style={{ alignSelf: "flex-end", padding: "6px 12px" }}>＋ Agregar</Button>
                  </div>
                </div>
              </div>
            )}

            {/* ── PROCEDIMIENTOS TAB ── */}
            {activeTab === "procedimientos" && (
              <div>
                <div style={{ marginBottom: "12px" }}>
                  <label style={{ fontSize: "13px", fontWeight: 700, color: "#333", marginBottom: "8px", display: "block" }}>
                    🧭 Procedimientos de Interacción
                  </label>
                  <p style={{ fontSize: "12px", color: "#888", marginBottom: "12px" }}>
                    Definí paso a paso cómo el agente debe atender según el contexto del usuario.
                    Los procedimientos se aplican por encima de las instrucciones en la jerarquía.
                  </p>
                </div>

                {procedures.length === 0 ? (
                  <div style={{
                    padding: "20px", textAlign: "center", border: "2px dashed #ddd",
                    borderRadius: "12px", marginBottom: "16px",
                  }}>
                    <p style={{ fontSize: "13px", color: "#999" }}>Sin procedimientos aún</p>
                    <p style={{ fontSize: "11px", color: "#bbb" }}>Creá pasos para que el agente sepa cómo vender</p>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "16px" }}>
                    {CONTEXTS.map((ctx) => {
                      const steps = procByContext[ctx.value] || [];
                      if (steps.length === 0) return null;
                      return (
                        <div key={ctx.value} style={{ border: "1px solid #e0e0e0", borderRadius: "10px", padding: "10px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
                            <span style={{ fontWeight: 700, fontSize: "13px" }}>{ctx.label}</span>
                            <span style={{ fontSize: "11px", color: "#999" }}>({steps.length} pasos)</span>
                          </div>
                          <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={(e) => handleProcDragEnd(e, ctx.value)}
                          >
                            <SortableContext
                              items={steps.map((p) => `proc-${p.id || p.step_name}`)}
                              strategy={verticalListSortingStrategy}
                            >
                              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                {steps.map((proc, idx) => {
                                  const globalIdx = procedures.findIndex((p) => p === proc);
                                  return (
                                    <SortableProcedureItem
                                      key={`proc-${proc.id || proc.step_name}-${idx}`}
                                      id={`proc-${proc.id || proc.step_name}`}
                                      step={proc}
                                      onUpdate={(field, value) => updateProcedureStep(globalIdx, field, value)}
                                      onToggleActive={() => toggleProcActive(globalIdx)}
                                      onRemove={() => removeProcedureStep(globalIdx)}
                                    />
                                  );
                                })}
                              </div>
                            </SortableContext>
                          </DndContext>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Add new step form */}
                <div style={{
                  background: "#f9f9fb", borderRadius: "10px", padding: "12px",
                  border: "1px solid #eee",
                }}>
                  <label style={{ fontSize: "12px", fontWeight: 600, color: "#555", marginBottom: "8px", display: "block" }}>
                    ＋ Nuevo paso
                  </label>
                  <div style={{ display: "grid", gap: "8px" }}>
                    <Select
                      label="Contexto"
                      value={newProcStep.context}
                      onChange={(v) => setNewProcStep({ ...newProcStep, context: v })}
                      options={CONTEXTS}
                    />
                    <div>
                      <label style={{ fontSize: "12px", fontWeight: 600, display: "block", marginBottom: "4px", color: "#555" }}>Nombre del paso</label>
                      <input
                        value={newProcStep.step_name}
                        onChange={(e) => setNewProcStep({ ...newProcStep, step_name: e.target.value })}
                        placeholder="Ej: Saludo, Descubrimiento, Cierre"
                        style={{
                          width: "100%", padding: "8px 12px", border: "1px solid #ddd",
                          borderRadius: "8px", fontSize: "13px", boxSizing: "border-box",
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: "12px", fontWeight: 600, display: "block", marginBottom: "4px", color: "#555" }}>Prompt / Instrucción</label>
                      <textarea
                        value={newProcStep.step_prompt}
                        onChange={(e) => setNewProcStep({ ...newProcStep, step_prompt: e.target.value })}
                        placeholder="Saludar al lead y preguntar qué busca..."
                        rows={3}
                        style={{
                          width: "100%", padding: "8px 12px", border: "1px solid #ddd",
                          borderRadius: "8px", fontSize: "13px", fontFamily: "inherit",
                          resize: "vertical", boxSizing: "border-box",
                        }}
                      />
                    </div>
                    <Button variant="secondary" onClick={addProcedureStep} style={{ alignSelf: "flex-end" }}>＋ Agregar paso</Button>
                  </div>
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", marginTop: "20px" }}>
              <Button variant="secondary" onClick={() => setShowForm(false)}>✕ Cerrar</Button>
              <Button onClick={handleSave}>{editingId ? "✓ Guardar cambios" : "✓ Crear agente"}</Button>
            </div>
          </div>
        </div>
      )}
      <WhatsAppQRModal open={showQr} onClose={() => setShowQr(false)} />
    </div>
  );
}

// ── Tab Button ──
function TabButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "8px 16px",
        fontSize: "13px",
        fontWeight: active ? 700 : 500,
        border: "none",
        background: "none",
        cursor: "pointer",
        borderBottom: active ? "2px solid #2563eb" : "2px solid transparent",
        color: active ? "#2563eb" : "#888",
        marginBottom: "-2px",
        transition: "all 0.15s",
      }}
    >
      {label}
    </button>
  );
}

// ── Sortable Instruction Item ──
function SortableInstructionItem({
  id, content, isActive, onContentChange, onToggleActive, onRemove,
}: {
  id: string;
  content: string;
  isActive: boolean;
  onContentChange: (v: string) => void;
  onToggleActive: () => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    display: "flex",
    gap: "6px",
    alignItems: "flex-start",
    background: isActive ? "#f0fff0" : "#fff5f5",
    border: `1px solid ${isActive ? "#b3e5b3" : "#ffb3b3"}`,
    borderRadius: "8px",
    padding: "8px 10px",
    opacity: isDragging ? 0.5 : (isActive ? 1 : 0.6),
    cursor: "grab",
  } as const;

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <div {...listeners} style={{ fontSize: "14px", color: "#aaa", marginTop: "2px", cursor: "grab", userSelect: "none" }}>
        ⠿
      </div>
      <span style={{ fontSize: "12px", color: "#888", marginTop: "4px" }}>{isActive ? "📌" : "📍"}</span>
      <textarea
        value={content}
        onChange={(e) => onContentChange(e.target.value)}
        rows={2}
        style={{
          flex: 1, border: "none", background: "transparent",
          fontSize: "13px", fontFamily: "inherit", resize: "none",
          outline: "none", boxSizing: "border-box",
        }}
      />
      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
        <button
          onClick={onToggleActive}
          title={isActive ? "Desactivar" : "Activar"}
          style={{ fontSize: "11px", cursor: "pointer", border: "none", background: "none", padding: "2px" }}
        >
          {isActive ? "🔵" : "⚪"}
        </button>
        <button
          onClick={onRemove}
          title="Eliminar"
          style={{ fontSize: "11px", cursor: "pointer", border: "none", background: "none", padding: "2px" }}
        >
          🗑️
        </button>
      </div>
    </div>
  );
}

// ── Sortable Procedure Item ──
function SortableProcedureItem({
  id, step, onUpdate, onToggleActive, onRemove,
}: {
  id: string;
  step: AgentProcedure;
  onUpdate: (field: keyof AgentProcedure, value: string | boolean | number) => void;
  onToggleActive: () => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    display: "flex",
    gap: "6px",
    alignItems: "flex-start",
    background: step.active ? "#f0f7ff" : "#f5f5f5",
    border: `1px solid ${step.active ? "#b3d4ff" : "#ddd"}`,
    borderRadius: "8px",
    padding: "8px 10px",
    opacity: isDragging ? 0.5 : (step.active ? 1 : 0.5),
    cursor: "grab",
  } as const;

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <div {...listeners} style={{ fontSize: "14px", color: "#aaa", marginTop: "2px", cursor: "grab", userSelect: "none" }}>
        ⠿
      </div>
      <div style={{ flex: 1 }}>
        <input
          value={step.step_name}
          onChange={(e) => onUpdate("step_name", e.target.value)}
          placeholder="Nombre del paso"
          style={{
            width: "100%", border: "none", background: "transparent",
            fontWeight: 600, fontSize: "13px", padding: "2px 0",
            outline: "none", boxSizing: "border-box",
          }}
        />
        <textarea
          value={step.step_prompt}
          onChange={(e) => onUpdate("step_prompt", e.target.value)}
          rows={2}
          style={{
            width: "100%", border: "none", background: "transparent",
            fontSize: "12px", fontFamily: "inherit", resize: "none",
            outline: "none", marginTop: "4px", boxSizing: "border-box",
          }}
        />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
        <button
          onClick={onToggleActive}
          title={step.active ? "Desactivar" : "Activar"}
          style={{ fontSize: "11px", cursor: "pointer", border: "none", background: "none", padding: "2px" }}
        >
          {step.active ? "🔵" : "⚪"}
        </button>
        <button
          onClick={onRemove}
          title="Eliminar paso"
          style={{ fontSize: "11px", cursor: "pointer", border: "none", background: "none", padding: "2px" }}
        >
          🗑️
        </button>
      </div>
    </div>
  );
}