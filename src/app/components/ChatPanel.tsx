"use client";

import { useState, useRef, useEffect } from "react";
import { postJson } from "../lib";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
};

type SimStatus = {
  active: boolean;
  started_at?: string;
  pid?: number;
  backend_port?: number;
};

type ArchitectDraft = {
  id: number;
  type: "knowledge" | "permanent_instruction" | "transient_instruction" | "procedure" | "ambiguous";
  target_table?: string | null;
  payload: any;
  confidence?: number;
  reason?: string;
  status?: string;
};

export default function ChatPanel({ token }: { token?: string }) {
  const [mode, setMode] = useState<"sim" | "arch">("sim");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [simStatus, setSimStatus] = useState<SimStatus>({ active: false });
  const [pendingDraft, setPendingDraft] = useState<ArchitectDraft | null>(null);
  const chatsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");

    setMessages(prev => [...prev, { role: "user", content: text, timestamp: new Date() }]);
    setLoading(true);

    try {
      if (mode === "sim") {
        if (!simStatus.active) {
          throw new Error("Primero iniciá la simulación para crear la BD clonada.");
        }

        const res = await postJson<any>(`/simulator/1/chat`, { message: text });
        setMessages(prev => [...prev, {
          role: "assistant",
          content: res.reply || "Sin respuesta",
          timestamp: new Date()
        }]);
      } else {
        // Modo arquitecto: analiza y genera borrador, no guarda directo.
        const res = await postJson<any>("/architect/analyze", { message: text });
        setPendingDraft(res.draft);
        setMessages(prev => [...prev, {
          role: "assistant",
          content: "Generé una propuesta de guardado. Revisala abajo y confirmá antes de aplicar cambios reales.",
          timestamp: new Date()
        }]);
      }
    } catch (err: any) {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: `❌ Error: ${err.message || err}`,
        timestamp: new Date()
      }]);
    } finally {
      setLoading(false);
    }
  }

  async function startSim() {
    if (loading || simStatus.active) return;
    setLoading(true);
    try {
      const startRes = await postJson<any>("/simulator/start", {});
      if (!startRes.ok) throw new Error(startRes.error || "Error al iniciar simulación");
      setSimStatus({ active: true, ...startRes });
      setMessages(prev => [...prev, {
        role: "assistant",
        content: startRes.initial_reply || `🧪 Simulación iniciada. Se clonó la base real y el agente está trabajando sobre el backend de prueba en puerto ${startRes.backend_port}. En esta simulación voy a explicar qué datos consulto, qué decisiones tomo y qué acciones hago para que puedas corregir el proceso.`,
        timestamp: new Date()
      }]);
    } catch (err: any) {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: `❌ Error al iniciar simulación: ${err.message || err}`,
        timestamp: new Date()
      }]);
    } finally {
      setLoading(false);
    }
  }

  async function stopSim() {
    try {
      await postJson("/simulator/1/stop", {});
      setSimStatus({ active: false });
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "🧪 Simulación finalizada. BD clonada eliminada.",
        timestamp: new Date()
      }]);
    } catch (err: any) {
      alert("Error al detener: " + (err.message || err));
    }
  }


  function draftTypeLabel(type?: string) {
    const labels: Record<string, string> = {
      knowledge: "Conocimiento / contexto",
      permanent_instruction: "Instrucción permanente",
      transient_instruction: "Instrucción temporal",
      procedure: "Procedimiento",
      ambiguous: "Ambiguo — revisar",
    };
    return labels[type || ""] || type || "Sin clasificar";
  }


  function draftDestinationLabel(draft: ArchitectDraft) {
    if (draft.type === "knowledge") return "Memoria del negocio";
    if (draft.type === "permanent_instruction") return "Instrucciones permanentes";
    if (draft.type === "transient_instruction") return "Instrucciones temporales / promos";
    if (draft.type === "procedure") return "Procedimientos";
    return "Necesita revisión";
  }

  function draftMainText(draft: ArchitectDraft) {
    const p = draft.payload || {};
    return p.content || p.step_prompt || p.step_name || "Sin contenido detectado";
  }

  function draftExtraText(draft: ArchitectDraft) {
    const p = draft.payload || {};
    if (draft.type === "procedure") return `Contexto: ${p.context || "general"}${p.step_name ? ` · Paso: ${p.step_name}` : ""}`;
    if (draft.type === "knowledge") return `Categoría: ${p.category || "manual_instruction"}`;
    if (draft.type === "transient_instruction" && p.expires_hint) return `Vigencia sugerida: ${p.expires_hint}`;
    return "";
  }

  async function applyDraft() {
    if (!pendingDraft || loading) return;
    setLoading(true);
    try {
      const res = await postJson<any>(`/architect/drafts/${pendingDraft.id}/apply`, {});
      setMessages(prev => [...prev, {
        role: "assistant",
        content: `✅ Guardado aplicado en ${draftDestinationLabel(pendingDraft)}. Ahora podés probarlo en Simulador.`,
        timestamp: new Date()
      }]);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("architectDraftApplied", { detail: res.applied }));
      }
      setPendingDraft(null);
    } catch (err: any) {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: `❌ Error al guardar: ${err.message || err}`,
        timestamp: new Date()
      }]);
    } finally {
      setLoading(false);
    }
  }

  async function discardDraft() {
    if (!pendingDraft || loading) return;
    setLoading(true);
    try {
      await postJson(`/architect/drafts/${pendingDraft.id}/discard`, {});
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "🗑️ Propuesta descartada. No se modificó nada.",
        timestamp: new Date()
      }]);
      setPendingDraft(null);
    } catch (err: any) {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: `❌ Error al descartar: ${err.message || err}`,
        timestamp: new Date()
      }]);
    } finally {
      setLoading(false);
    }
  }

  const containerStyle: React.CSSProperties = {
    display: "flex", flexDirection: "column", height: "500px",
    border: "1px solid #ddd", borderRadius: "12px", overflow: "hidden",
    marginTop: "12px",
  };

  const headerStyle: React.CSSProperties = {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "10px 16px", borderBottom: "1px solid #eee",
    background: mode === "sim" ? "#e3f2fd" : "#f3e5f5",
  };

  const messagesStyle: React.CSSProperties = {
    flex: 1, overflowY: "auto", padding: "16px",
    display: "flex", flexDirection: "column", gap: "8px",
  };

  const inputBarStyle: React.CSSProperties = {
    display: "flex", gap: "8px", padding: "10px 16px",
    borderTop: "1px solid #eee", background: "#fafafa",
  };

  return (
    <div>
      {/* Modo selector */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
        <button
          onClick={() => { setMode("sim"); setMessages([]); if (simStatus.active) stopSim(); }}
          style={{
            flex: 1, padding: "10px", border: "none", borderRadius: "8px",
            cursor: "pointer", fontWeight: 600, fontSize: "14px",
            background: mode === "sim" ? "#1976d2" : "#e0e0e0",
            color: mode === "sim" ? "#fff" : "#333",
          }}
        >
          🎮 Simulador
        </button>
        <button
          onClick={() => { setMode("arch"); setMessages([]); if (simStatus.active) stopSim(); }}
          style={{
            flex: 1, padding: "10px", border: "none", borderRadius: "8px",
            cursor: "pointer", fontWeight: 600, fontSize: "14px",
            background: mode === "arch" ? "#7b1fa2" : "#e0e0e0",
            color: mode === "arch" ? "#fff" : "#333",
          }}
        >
          🏗️ Arquitecto
        </button>
      </div>

      {/* Info según modo */}
      <div style={{
        fontSize: "12px", color: "#666", marginBottom: "8px", padding: "8px 12px",
        background: "#f5f5f5", borderRadius: "8px",
      }}>
        {mode === "sim"
          ? "🎮 Modo Simulación: probá escenarios sobre una BD clonada. Nada afecta datos reales. Al cerrar, todo se destruye."
          : "🏗️ Modo Arquitecto: enseñale cosas al agente. Primero genera una propuesta; recién se guarda cuando la confirmás."}
        {simStatus.active && (
          <span style={{ marginLeft: "8px", color: "#1976d2", fontWeight: 600 }}>● Simulación activa</span>
        )}
      </div>

      {/* Chat container */}
      <div style={containerStyle}>
        <div style={headerStyle}>
          <span style={{ fontWeight: 600, fontSize: "14px" }}>
            {mode === "sim" ? "🎮 Agente (simulación)" : "🏗️ Agente (real)"}
          </span>
          <div style={{ display: "flex", gap: "6px" }}>
            <button
              onClick={() => { setMessages([]); setPendingDraft(null); }}
              style={{ fontSize: "12px", cursor: "pointer", border: "1px solid #ccc", borderRadius: "6px", padding: "4px 10px", background: "#fff" }}
            >
              🗑️ Limpiar
            </button>
            {mode === "sim" && !simStatus.active && (
              <button
                onClick={startSim}
                disabled={loading}
                style={{ fontSize: "12px", cursor: loading ? "default" : "pointer", border: "1px solid #1976d2", borderRadius: "6px", padding: "4px 10px", background: "#e3f2fd", color: "#0d47a1", fontWeight: 600 }}
              >
                ▶ Iniciar simulación
              </button>
            )}
            {mode === "sim" && simStatus.active && (
              <button
                onClick={stopSim}
                style={{ fontSize: "12px", cursor: "pointer", border: "1px solid #e53935", borderRadius: "6px", padding: "4px 10px", background: "#ffebee", color: "#c62828", fontWeight: 600 }}
              >
                ⏹ Detener simulación
              </button>
            )}
          </div>
        </div>

        <div style={messagesStyle}>
          {messages.length === 0 && (
            <div style={{ textAlign: "center", color: "#aaa", marginTop: "40px", fontSize: "13px" }}>
              {mode === "sim"
                ? "Escribí un escenario para probar.\nEj: \"El cliente Pérez tiene 5 órdenes impagas, ¿qué hacés?\""
                : "Escribí qué querés que el agente aprenda.\nEl sistema propondrá si es knowledge, instrucción o procedimiento antes de guardar."}
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} style={{
              alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
              maxWidth: "80%",
              padding: "10px 14px",
              borderRadius: "12px",
              fontSize: "13px",
              lineHeight: "1.4",
              whiteSpace: "pre-wrap" as const,
              background: msg.role === "user" ? "#1976d2" : "#f0f0f0",
              color: msg.role === "user" ? "#fff" : "#333",
              borderBottomRightRadius: msg.role === "user" ? "4px" : "12px",
              borderBottomLeftRadius: msg.role === "user" ? "12px" : "4px",
            }}>
              {msg.content}
            </div>
          ))}
          {loading && (
            <div style={{ alignSelf: "flex-start", padding: "10px 14px", color: "#888", fontSize: "13px" }}>
              ⏳ Pensando...
            </div>
          )}
          <div ref={chatsEndRef} />
        </div>

        {mode === "arch" && pendingDraft && (
          <div style={{ margin: "0 16px 12px", padding: "14px", border: "1px solid #ce93d8", borderRadius: "10px", background: "#fbf5ff", fontSize: "13px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "center", marginBottom: "8px" }}>
              <div style={{ fontWeight: 800, color: "#6a1b9a" }}>Propuesta para guardar</div>
              <span style={{ fontSize: "11px", padding: "3px 8px", borderRadius: "999px", background: "#ede7f6", color: "#512da8", fontWeight: 700 }}>
                {draftTypeLabel(pendingDraft.type)}
              </span>
            </div>
            <div style={{ marginBottom: "8px", color: "#444" }}>
              Se guardará en: <b>{draftDestinationLabel(pendingDraft)}</b>
              <span style={{ color: "#777" }}> · Confianza {Math.round((pendingDraft.confidence || 0) * 100)}%</span>
            </div>
            <div style={{ background: "#fff", border: "1px solid #eee", borderRadius: "8px", padding: "10px", marginBottom: "8px", lineHeight: 1.45 }}>
              {draftMainText(pendingDraft)}
            </div>
            {draftExtraText(pendingDraft) && (
              <div style={{ color: "#666", marginBottom: "8px" }}>{draftExtraText(pendingDraft)}</div>
            )}
            {pendingDraft.reason && (
              <div style={{ color: "#777", marginBottom: "10px", fontSize: "12px" }}>Por qué: {pendingDraft.reason}</div>
            )}
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={applyDraft}
                disabled={loading || pendingDraft.type === "ambiguous"}
                style={{ border: "none", borderRadius: "8px", padding: "8px 12px", background: pendingDraft.type === "ambiguous" ? "#ccc" : "#2e7d32", color: "#fff", fontWeight: 700, cursor: pendingDraft.type === "ambiguous" ? "default" : "pointer" }}
              >
                ✅ Confirmar y guardar
              </button>
              <button
                onClick={discardDraft}
                disabled={loading}
                style={{ border: "1px solid #bbb", borderRadius: "8px", padding: "8px 12px", background: "#fff", color: "#333", fontWeight: 600, cursor: "pointer" }}
              >
                ❌ Descartar
              </button>
            </div>
          </div>
        )}

        <div style={inputBarStyle}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleSend())}
            placeholder={mode === "sim" ? "Ej: Perez tiene 5 impagas..." : "Ej: Perez es confiable, no bloquear..."}
            disabled={loading || (mode === "sim" && !simStatus.active)}
            style={{
              flex: 1, padding: "10px 14px", border: "1px solid #ddd", borderRadius: "8px",
              fontSize: "14px", outline: "none", fontFamily: "inherit",
            }}
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim() || (mode === "sim" && !simStatus.active)}
            style={{
              padding: "10px 20px", border: "none", borderRadius: "8px",
              background: (loading || (mode === "sim" && !simStatus.active)) ? "#ccc" : (mode === "sim" ? "#1976d2" : "#7b1fa2"),
              color: "#fff", fontWeight: 600, cursor: (loading || (mode === "sim" && !simStatus.active)) ? "default" : "pointer",
              fontSize: "14px",
            }}
          >
            {loading ? "..." : "Enviar"}
          </button>
        </div>
      </div>
    </div>
  );
}
