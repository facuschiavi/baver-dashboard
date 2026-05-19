"use client";

import { useState, useEffect, useCallback } from "react";
import { postJson, fetchJson as getJson, deleteJson } from "../../lib";

interface Entity {
  id: number;
  name: string;
  client_id: number;
  is_active: boolean;
}

interface EntityDesign {
  id: number;
  entity_id: number;
  name: string;
  template_url: string | null;
  image_path: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  entity_name?: string;
}

const API = process.env.NEXT_PUBLIC_API_URL || "/api";

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

export default function EntidadesPage() {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [designs, setDesigns] = useState<EntityDesign[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEntity, setSelectedEntity] = useState<number | null>(null);
  const [designName, setDesignName] = useState("");
  const [saving, setSaving] = useState(false);
  const [editDesign, setEditDesign] = useState<EntityDesign | null>(null);

  const loadEntities = useCallback(async () => {
    try {
      const data = await getJson<Entity[]>("/entities");
      setEntities(data);
    } catch (e) {
      console.error("Error loading entities:", e);
    }
  }, []);

  const loadDesigns = useCallback(async () => {
    try {
      const data = await getJson<EntityDesign[]>("/entity-designs");
      setDesigns(data);
    } catch (e) {
      console.error("Error loading designs:", e);
    }
  }, []);

  useEffect(() => {
    Promise.all([loadEntities(), loadDesigns()]).finally(() => setLoading(false));
  }, [loadEntities, loadDesigns]);

  function readFileAsBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function handleSave() {
    if (!selectedEntity || !designName.trim()) return;
    setSaving(true);
    try {
      const fileInput = document.getElementById("design-file") as HTMLInputElement;
      let templateUrl: string | null = null;

      if (fileInput?.files?.[0]) {
        const base64 = await readFileAsBase64(fileInput.files[0]);
        const res = await fetch(`${API}/entity-designs/upload`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getToken()}`,
          },
          body: JSON.stringify({ image: base64 }),
        });
        const raw = await res.text();
        let data: { url?: string; error?: string } = {};
        try {
          data = raw ? JSON.parse(raw) : {};
        } catch {
          throw new Error(`El servidor respondió con un error no-JSON (${res.status}). Si subiste una imagen pesada, probá comprimirla.`);
        }
        if (!res.ok) throw new Error(data.error || `Error al subir archivo (${res.status})`);
        templateUrl = data.url || null;
      }

      await postJson("/entity-designs", {
        entity_id: selectedEntity,
        name: designName.trim(),
        template_url: templateUrl,
      });

      setDesignName("");
      if (fileInput) fileInput.value = "";
      loadDesigns();
    } catch (e) {
      console.error(e);
      alert("Error al guardar: " + (e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("¿Eliminar este diseño?")) return;
    try {
      await deleteJson(`/entity-designs/${id}`);
      loadDesigns();
    } catch (e) {
      console.error(e);
    }
  }

  const filteredDesigns = selectedEntity
    ? designs.filter(d => d.entity_id === selectedEntity)
    : designs;

  if (loading) {
    return <div style={{ padding: 24, fontSize: 14, color: "#888" }}>Cargando...</div>;
  }

  return (
    <div style={{ padding: "20px 24px", maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>🏢 Diseños por Entidad</h1>
      <p style={{ fontSize: 13, color: "#888", margin: "0 0 24px" }}>
        Templates pre-cargados para que los contactos de una entidad no tengan que subir su diseño.
      </p>

      {/* Selector de entidad */}
      <div style={{ marginBottom: 24 }}>
        <label style={{ fontSize: 12, fontWeight: 700, color: "#888", display: "block", marginBottom: 6 }}>
          ENTIDAD
        </label>
        <select
          value={selectedEntity || ""}
          onChange={e => {
            setSelectedEntity(e.target.value ? Number(e.target.value) : null);
            setDesignName("");
            setEditDesign(null);
          }}
          style={{
            width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid #ddd",
            fontSize: 14, background: "#fff", cursor: "pointer",
          }}
        >
          <option value="">Todas las entidades</option>
          {entities.map(e => (
            <option key={e.id} value={e.id}>{e.name}</option>
          ))}
        </select>
      </div>

      {/* Formulario para agregar diseño */}
      {selectedEntity && (
        <div style={{ background: "#f9f9ff", border: "1px solid #e0e0ff", borderRadius: 12, padding: 20, marginBottom: 24 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 16px" }}>➕ Agregar diseño</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: "#888", display: "block", marginBottom: 4 }}>NOMBRE DEL DISEÑO</label>
              <input
                value={designName}
                onChange={e => setDesignName(e.target.value)}
                placeholder="Ej: Titular 2026, Suplente, Arquero..."
                style={{
                  width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid #ddd",
                  fontSize: 14, background: "#fff",
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: "#888", display: "block", marginBottom: 4 }}>ARCHIVO DEL TEMPLATE</label>
              <input
                id="design-file"
                type="file"
                accept="image/*"
                style={{
                  width: "100%", padding: "10px", borderRadius: 10, border: "1px solid #ddd",
                  fontSize: 13, background: "#fff",
                }}
              />
            </div>
            <button
              onClick={handleSave}
              disabled={saving || !designName.trim()}
              style={{
                padding: "10px 20px", borderRadius: 10, border: "none",
                background: saving ? "#aaa" : "#6c63ff", color: "#fff",
                fontSize: 14, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer",
                alignSelf: "flex-start",
              }}
            >
              {saving ? "Guardando..." : "💾 Guardar diseño"}
            </button>
          </div>
        </div>
      )}

      {/* Lista de diseños */}
      <div>
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 16px" }}>
          {selectedEntity
            ? `Diseños de ${entities.find(e => e.id === selectedEntity)?.name || "..."}`
            : "Todos los diseños"}
        </h2>

        {filteredDesigns.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "#ccc", fontSize: 14 }}>
            {selectedEntity
              ? "No hay diseños cargados para esta entidad todavía."
              : "Seleccioná una entidad para ver o agregar diseños."}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {filteredDesigns.map(d => (
              <div
                key={d.id}
                style={{
                  display: "flex", alignItems: "center", gap: 16,
                  padding: "12px 16px", borderRadius: 12, border: "1px solid #eee",
                  background: "#fff",
                }}
              >
                {/* Preview */}
                <div
                  style={{
                    width: 60, height: 60, borderRadius: 10, overflow: "hidden",
                    background: "#f5f5f5", flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >
                  {d.template_url ? (
                    <img src={d.template_url} alt={d.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <span style={{ fontSize: 20, opacity: 0.3 }}>🖼️</span>
                  )}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{d.name}</div>
                  <div style={{ fontSize: 12, color: "#888" }}>
                    {d.entity_name || `Entidad #${d.entity_id}`}
                    {d.template_url ? ` · Con template` : ` · Sin template`}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => handleDelete(d.id)}
                    style={{
                      padding: "6px 12px", borderRadius: 8, border: "1px solid #e74c3c",
                      background: "#fff", color: "#e74c3c", cursor: "pointer",
                      fontSize: 12, fontWeight: 600,
                    }}
                  >
                    🗑️ Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
