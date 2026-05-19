"use client";

import { useState, useRef } from "react";
import { fetchJson, postJson } from "../../lib";
import { IconButton, Input, Loading } from "../shared/UI";
import * as XLSX from "xlsx";

// ─── Modal base ──────────────────────────────────────────────────
function ModalBackdrop({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
        display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
      }}
    >
      <div onClick={e => e.stopPropagation()} style={{
        background: "#fff", borderRadius: "16px", padding: "28px",
        width: "90%", maxWidth: "680px", maxHeight: "85vh", overflow: "auto",
      }}>
        {children}
      </div>
    </div>
  );
}

// ─── FEATURE 1: Importar Productos ───────────────────────────────


export function ImportModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{created: number; updated: number; errors: number; errorDetails: any[]} | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const data = new Uint8Array(ev.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet);
      setPreview(rows.slice(0, 10));
    };
    reader.readAsArrayBuffer(f);
  }

  async function doImport() {
    if (!file) return;
    setLoading(true);
    try {
      const data = new Uint8Array(await file.arrayBuffer());
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(sheet);
      const mapped = rows.map(r => ({
        sku: String(r.SKU || r.sku || ""),
        sku_externo: String(r.CODIGO || r.codigo_externo || r.sku_externo || ""),
        name: String(r.NOMBRE || r.nombre || r.name || ""),
        description: String(r.DESCRIPCION || r.descripcion || r.description || ""),
        commercial_description: String(r.DESCRIPCION_COMERCIAL || r.comercial || r.commercial_description || ""),
        price: parseFloat(r.PRECIO || r.precio || r.price || 0),
        cost_price: parseFloat(r.COSTO || r.costo || r.cost_price || 0),
        unit: String(r.UNIDAD || r.unit || "unidad"),
        stock_quantity: parseInt(r.STOCK || r.stock || r.stock_quantity || 0),
        min_stock: parseInt(r.MINIMO || r.minimo || r.min_stock || 0),
        category: String(r.CATEGORIA || r.categoria || r.category || "General"),
        brand: String(r.MARCA || r.marca || r.brand || "Generica"),
        is_active: true,
      }));
      const res = await postJson<any>("/products/import", { products: mapped });
      setResult(res);
    } catch (e: any) {
      setResult({ created: 0, updated: 0, errors: 1, errorDetails: [{error: e.message}] });
    }
    setLoading(false);
  }

  function downloadTemplate() {
    const template = [
      { SKU: "EJEMPLO-001", NOMBRE: "Producto ejemplo", CATEGORIA: "Ropa", MARCA: "Nike",
        PRECIO: 15000, COSTO: 8000, STOCK: 10, MINIMO: 2, UNIDAD: "unidad",
        DESCRIPCION: "Descripcion larga", DESCRIPCION_COMERCIAL: "Descripcion para venta",
        CODIGO: "EXT-001", ACTIVO: "Si" }
    ];
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Productos");
    XLSX.writeFile(wb, "plantilla_productos.xlsx");
  }

  const fileSelected = file !== null;

  return (
    <ModalBackdrop onClose={onClose}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, borderBottom: "1px solid #eee", paddingBottom: 14 }}>
        <span style={{ fontSize: 22 }}>{"\uD83D\uDCE5"}</span>
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Importar Productos</h3>
      </div>

      {!result ? (<>
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 18 }}>
          <button onClick={downloadTemplate} style={{
            padding: "10px 20px", background: "#6c63ff", color: "#fff", border: "none",
            borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600,
          }}>
            {"\uD83D\uDCC4"} Descargar plantilla
          </button>
          <span style={{ fontSize: 12, color: "#aaa" }}>.xlsx con columnas requeridas</span>
        </div>

        <div style={{ background: "#f8f8ff", border: "1px solid #e8e8ff", borderRadius: 8, padding: "10px 14px", marginBottom: 18, fontSize: 12, color: "#666", lineHeight: 1.6 }}>
          <strong style={{ color: "#6c63ff", display: "block", marginBottom: 4 }}>Columnas del archivo:</strong>
          SKU, NOMBRE, CATEGORIA, MARCA, PRECIO, COSTO, STOCK, MINIMO, UNIDAD, DESCRIPCION, DESCRIPCION_COMERCIAL, CODIGO, ACTIVO
        </div>

        <div onClick={() => fileRef.current?.click()} style={{
          border: "2px dashed " + (fileSelected ? "#6c63ff" : "#ddd"),
          borderRadius: 10, padding: 20, marginBottom: 16, textAlign: "center", cursor: "pointer",
          background: fileSelected ? "#f8f8ff" : "#fafafa",
        }}>
          {fileSelected ? (
            <div>
              <span style={{ fontSize: 28 }}>{"\uD83D\uDCC1"}</span>
              <p style={{ margin: "6px 0 2px", fontSize: 14, fontWeight: 600, color: "#333" }}>{file.name}</p>
              <p style={{ margin: 0, fontSize: 12, color: "#888" }}>{(file.size / 1024).toFixed(1)} KB</p>
              <button onClick={(e) => { e.stopPropagation(); setFile(null); setPreview([]); if (fileRef.current) fileRef.current.value = ""; }}
                style={{ marginTop: 8, padding: "4px 12px", background: "#fee", color: "#c00", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 12 }}>
                Quitar archivo
              </button>
            </div>
          ) : (
            <div>
              <span style={{ fontSize: 28 }}>{"\uD83D\uDCC1"}</span>
              <p style={{ margin: "6px 0 2px", fontSize: 14, color: "#888" }}>Hace click o arrastra un archivo</p>
              <p style={{ margin: 0, fontSize: 12, color: "#bbb" }}>.xlsx, .xls o .csv</p>
            </div>
          )}
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} style={{ display: "none" }} />
        </div>

        {preview.length > 0 && (
          <div style={{ fontSize: 12, background: "#f9f9f9", padding: 12, borderRadius: 8, marginBottom: 16 }}>
            <strong style={{ display: "block", marginBottom: 6 }}>{"\uD83D\uDC40"} Vista previa ({preview.length} filas):</strong>
            <div style={{ maxHeight: 150, overflow: "auto" }}>
              {preview.slice(0, 5).map((r, i) => (
                <div key={i} style={{ padding: "4px 8px", borderBottom: "1px solid #eee", fontSize: 12 }}>
                  <strong>{r.NOMBRE || r.nombre || r.name}</strong> -- SKU: {r.SKU || r.sku}
                </div>
              ))}
              {preview.length > 5 && <div style={{ padding: 4, color: "#888", fontSize: 11 }}>... y {preview.length - 5} mas</div>}
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", borderTop: "1px solid #eee", paddingTop: 14 }}>
          <button onClick={onClose} style={{
            padding: "10px 24px", background: "#f0f0f0", color: "#333", border: "none",
            borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 500,
          }}>
            Cancelar
          </button>
          <button onClick={doImport} disabled={!file || loading} style={{
            padding: "10px 24px", background: file && !loading ? "#6c63ff" : "#ccc", color: "#fff", border: "none",
            borderRadius: 8, cursor: file && !loading ? "pointer" : "not-allowed", fontSize: 13, fontWeight: 600,
          }}>
            {loading ? "Importando..." : "Importar"}
          </button>
        </div>
      </>) : (
        <div>
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <span style={{ fontSize: 40 }}>{"\u2705"}</span>
            <p style={{ fontSize: 16, fontWeight: 700, color: "#2ecc71", margin: "8px 0 4px" }}>Importacion completada</p>
            <div style={{ display: "flex", gap: 20, justifyContent: "center", marginTop: 12 }}>
              <div><strong style={{ color: "#6c63ff" }}>{result.created}</strong> creados</div>
              <div><strong style={{ color: "#f39c12" }}>{result.updated}</strong> actualizados</div>
              <div><strong style={{ color: "#e74c3c" }}>{result.errors}</strong> errores</div>
            </div>
          </div>
          {result.errorDetails?.length > 0 && (
            <div style={{ fontSize: 12, color: "#c00", maxHeight: 150, overflow: "auto", background: "#fee", padding: 10, borderRadius: 8, margin: "0 0 12px" }}>
              {result.errorDetails.map((e: any, i: number) => <p key={i} style={{ margin: "2px 0" }}>{e.sku || e.name}: {e.error}</p>)}
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "flex-end", borderTop: "1px solid #eee", paddingTop: 14 }}>
            <button onClick={() => { onDone(); onClose(); }} style={{
              padding: "10px 24px", background: "#6c63ff", color: "#fff", border: "none",
              borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600,
            }}>
              Listo
            </button>
          </div>
        </div>
      )}
    </ModalBackdrop>
  );
}

// ─── FEATURE 2: Exportar Reporte Excel ───────────────────────────
export function ExportReportButton({ products }: { products: any[] }) {
  async function doExport() {
    const data = await fetchJson<any[]>("/products/report");
    const rows = data.map((p: any) => ({
      SKU: p.sku,
      NOMBRE: p.name,
      CATEGORIA: p.category_name || "",
      MARCA: p.brand_name || "",
      PRECIO: p.price,
      COSTO: p.cost_price,
      STOCK: p.stock_quantity,
      MINIMO: p.min_stock,
      UNIDAD: p.unit || "unidad",
      DESCRIPCION: p.description || "",
      DESCRIPCION_COMERCIAL: p.commercial_description || "",
      CODIGO: p.sku_externo || "",
      ACTIVO: p.is_active ? "Si" : "No",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Reporte Productos");
    // Auto-width
    const colWidths = Object.keys(rows[0] || {}).map(k => ({ wch: Math.max(k.length, 15) }));
    ws["!cols"] = colWidths;
    XLSX.writeFile(wb, "reporte_productos.xlsx");
  }
  return (
    <IconButton variant="secondary" title="Exportar reporte Excel" onClick={doExport}>📊</IconButton>
  );
}

export function UpdateCostModal({
  products, allProducts, inputItems, onClose, onDone,
}: {
  products: any[]; allProducts: any[]; inputItems: any[];
  onClose: () => void; onDone: () => void;
}) {
  const [mode, setMode] = useState<"product" | "input">("product");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [adjustType, setAdjustType] = useState<"percent" | "amount">("percent");
  const [adjustValue, setAdjustValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<number | null>(null);
  const [inputMethod, setInputMethod] = useState<"fixed"|"reposition"|"average"|"custom">("fixed");
  const [customCost, setCustomCost] = useState("");
  const [avgCount, setAvgCount] = useState("5");

  const items = mode === "product" ? allProducts : inputItems;
  const isSingle = selectedIds.length === 1 && mode === "product";
  const isMulti = selectedIds.length > 1 && mode === "product";
  const isInput = mode === "input";

  function toggleAll() {
    if (selectAll) setSelectedIds([]);
    else setSelectedIds(items.filter((i: any) => mode !== "product" || !(parseFloat(i.computed_cost) > 0)).map((i: any) => i.id));
    setSelectAll(!selectAll);
  }

  function toggleItem(id: number) {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
    setSelectAll(false);
  }

  function getLabel() {
    if (!selectedIds.length) return <span>Valor:</span>;
    if (isInput && inputMethod === "fixed") return <span>Nuevo costo interno ($):</span>;
    if (isSingle) return <span>Nuevo costo interno ($):</span>;
    return <span style={{fontSize:13}}>Aumentar cada precio en:</span>;
  }

  function getHint() {
    if (!selectedIds.length) return "Selecciona items. Esto cambia costos internos, no precio de venta.";
    if (isInput && (inputMethod === "reposition" || inputMethod === "average")) return "";
    if (isInput || isSingle) return "Ej: 15000";
    if (adjustType === "percent") return "Ej: 20 (aumenta 20%)";
    return "Ej: 500 (aumenta $500 c/u)";
  }

  async function doUpdate() {
    if (!selectedIds.length) return;
    setLoading(true);
    try {
      if (isInput && inputMethod !== "fixed") {
        let updatedCount = 0;
        const token = typeof window !== "undefined" ? localStorage.getItem("token") : "";
        const API_BASE = process.env.NEXT_PUBLIC_API_URL || "/api";
        for (const id of selectedIds) {
          const body: any = { method: inputMethod === "custom" ? "custom" : inputMethod };
          if (inputMethod === "custom") body.custom_value = Number(customCost) || 0;
          if (inputMethod === "average") body.avg_count = Number(avgCount) || 5;
          const res = await fetch(API_BASE + "/input-items/" + id + "/cost", {
            method: "PATCH",
            headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
            body: JSON.stringify(body),
          });
          if (res.ok) updatedCount++;
          else { const err = await res.json().catch(() => ({})); console.warn("Error en insumo " + id + ": " + (err.error || "desconocido")); }
        }
        setResult(updatedCount);
        setLoading(false);
        return;
      }

      let endpoint: string;
      let body: any;
      if (isInput) {
        endpoint = "/input-items/update-costs";
        body = { inputItemIds: selectedIds, newCost: parseFloat(adjustValue) };
      } else if (isSingle) {
        endpoint = "/products/update-costs";
        body = { productIds: selectedIds, newCostPrice: parseFloat(adjustValue) };
      } else {
        endpoint = "/products/update-costs";
        body = adjustType === "percent"
          ? { productIds: selectedIds, increasePercent: parseFloat(adjustValue) }
          : { productIds: selectedIds, increaseAmount: parseFloat(adjustValue) };
      }
      const res = await postJson<any>(endpoint, body);
      setResult(res.updated);
    } catch (e: any) {
      alert("Error: " + e.message);
    }
    setLoading(false);
  }

  function canSubmit() {
    if (!selectedIds.length) return false;
    if (isInput && (inputMethod === "reposition" || inputMethod === "average")) return true;
    return adjustValue !== "";
  }

  return (
    <ModalBackdrop onClose={onClose}>
      <h3 style={{ margin: "0 0 16px", fontSize: 18 }}>{"\uD83D\uDCB0"} Actualizar costos internos</h3>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button onClick={() => { setMode("product"); setSelectedIds([]); setSelectAll(false); }}
          style={{ padding: "6px 16px", borderRadius: 8, border: "none", cursor: "pointer",
            background: mode === "product" ? "#6c63ff" : "#f0f0f0",
            color: mode === "product" ? "#fff" : "#333" }}>Productos</button>
        <button onClick={() => { setMode("input"); setSelectedIds([]); setSelectAll(false); setInputMethod("fixed"); }}
          style={{ padding: "6px 16px", borderRadius: 8, border: "none", cursor: "pointer",
            background: mode === "input" ? "#6c63ff" : "#f0f0f0",
            color: mode === "input" ? "#fff" : "#333" }}>Insumos</button>
      </div>

      {!result ? (<>
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer", fontSize: 13 }}>
            <input type="checkbox" checked={selectAll} onChange={toggleAll} />
            {mode === "product" ? "Todos los productos" : "Todos los insumos"}
          </label>
          <span style={{ fontSize: 12, color: "#888" }}>{selectedIds.length} seleccionados</span>
        </div>

        <div style={{ maxHeight: 250, overflow: "auto", border: "1px solid #eee", borderRadius: 8, marginBottom: 12 }}>
          {items.map((item: any) => (
            <label key={item.id} style={{
              display: "flex", alignItems: "center", gap: 8, padding: "6px 10px",
              cursor: mode === "product" && parseFloat(item.computed_cost) > 0 ? "not-allowed" : "pointer",
              fontSize: 13, borderBottom: "1px solid #f5f5f5",
              background: selectedIds.includes(item.id) ? "#f0eeff" : "transparent",
              opacity: mode === "product" && parseFloat(item.computed_cost) > 0 ? 0.5 : 1,
            }}>
              <input type="checkbox" checked={selectedIds.includes(item.id)}
                disabled={mode === "product" && parseFloat(item.computed_cost) > 0}
                onChange={() => toggleItem(item.id)} />
              <span style={{ flex: 1 }}>{item.name}</span>
              <span style={{ color: "#888", fontSize: 11 }}>
                {mode === "product" ? (parseFloat(item.computed_cost) > 0 ? "$" + item.computed_cost + " (insumos)" : "$" + (item.cost_price || 0)) : "$" + (item.default_cost || 0)}
              </span>
            </label>
          ))}
        </div>

        {isInput && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#555", marginBottom: 8 }}>Método</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {[
                { value: "fixed" as const, label: "Valor fijo", desc: "Mismo costo a todos" },
                { value: "reposition" as const, label: "Última compra", desc: "Costo de última NP" },
                { value: "average" as const, label: "Promedio", desc: "Promedio últimas compras" },
                { value: "custom" as const, label: "Personalizado", desc: "Valor específico" },
              ].map(m => (
                <button key={m.value} onClick={() => setInputMethod(m.value)}
                  style={{ padding: "8px 12px", borderRadius: 8, border: "2px solid", fontSize: 12, cursor: "pointer", textAlign: "left", lineHeight: 1.4,
                    borderColor: inputMethod === m.value ? "#6c63ff" : "#ddd",
                    background: inputMethod === m.value ? "#f0eeff" : "#fff", color: "#333", flex: 1, minWidth: 90 }}>
                  <div style={{ fontWeight: 700 }}>{m.label}</div>
                  <div style={{ fontSize: 10, color: "#888", marginTop: 2 }}>{m.desc}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {isMulti && mode === "product" && (
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <button onClick={() => setAdjustType("percent")}
              style={{ padding: "6px 16px", borderRadius: 8, border: "none", cursor: "pointer", background: adjustType === "percent" ? "#6c63ff" : "#f0f0f0", color: adjustType === "percent" ? "#fff" : "#333", fontSize: 13 }}>Aumentar %</button>
            <button onClick={() => setAdjustType("amount")}
              style={{ padding: "6px 16px", borderRadius: 8, border: "none", cursor: "pointer", background: adjustType === "amount" ? "#6c63ff" : "#f0f0f0", color: adjustType === "amount" ? "#fff" : "#333", fontSize: 13 }}>Aumentar $</button>
          </div>
        )}

        {!(isInput && (inputMethod === "reposition" || inputMethod === "average")) && (
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 16 }}>
            <label style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap" }}>{getLabel()}</label>
            <input type="number" value={adjustValue} onChange={e => setAdjustValue(e.target.value)}
              style={{ flex: 1, padding: "8px 12px", border: "1px solid #ddd", borderRadius: 8, fontSize: 14 }}
              placeholder={getHint()} />
            {isMulti && adjustType === "percent" && <span style={{ fontSize: 14, color: "#888" }}>%</span>}
          </div>
        )}

        {isInput && inputMethod === "average" && (
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 16 }}>
            <label style={{ fontSize: 13, fontWeight: 600 }}>Promedio últimas:</label>
            <input type="number" value={avgCount} onChange={e => setAvgCount(e.target.value)}
              style={{ width: 80, padding: "8px 12px", border: "1px solid #ddd", borderRadius: 8, fontSize: 14 }} placeholder="5" />
            <span style={{ fontSize: 13, color: "#888" }}>compras</span>
          </div>
        )}

        {isInput && inputMethod === "custom" && (
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 16 }}>
            <label style={{ fontSize: 13, fontWeight: 600 }}>Nuevo costo ($):</label>
            <input type="number" value={customCost} onChange={e => setCustomCost(e.target.value)}
              style={{ flex: 1, padding: "8px 12px", border: "1px solid #ddd", borderRadius: 8, fontSize: 14 }} placeholder="Ej: 15000" />
          </div>
        )}

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "8px 20px", background: "#f0f0f0", border: "none", borderRadius: 8, cursor: "pointer" }}>Cancelar</button>
          <button onClick={doUpdate} disabled={!canSubmit() || loading}
            style={{ padding: "8px 20px", background: canSubmit() ? "#6c63ff" : "#ccc", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>
            {loading ? "Actualizando..." : "Actualizar " + selectedIds.length + " items"}
          </button>
        </div>
      </>) : (
        <div>
          <p style={{ fontSize: 16, color: "#2ecc71", fontWeight: 600 }}>
            {"\u2705"} {result} {mode === "product" ? "productos" : "insumos"} actualizados
          </p>
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
            <button onClick={() => { onDone(); onClose(); }} style={{ padding: "8px 20px", background: "#6c63ff", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" }}>Listo</button>
          </div>
        </div>
      )}
    </ModalBackdrop>
  );
}



export function UpdatePriceModal({ products, onClose, onDone, apiEndpoint }: { products: any[]; onClose: () => void; onDone: () => void; apiEndpoint?: string }) {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [adjustType, setAdjustType] = useState<"percent" | "amount">("percent");
  const [adjustValue, setAdjustValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<number | null>(null);
  const isSingle = selectedIds.length === 1;
  const isMulti = selectedIds.length > 1;

  function toggleAll() {
    if (selectAll) setSelectedIds([]);
    else setSelectedIds(products.map((p: any) => p.id));
    setSelectAll(!selectAll);
  }

  function toggleItem(id: number) {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    setSelectAll(false);
  }

  function getLabel() {
    if (!selectedIds.length) return <span>Valor:</span>;
    if (isSingle) return <span>Nuevo precio de venta ($):</span>;
    return <span style={{fontSize:13}}>Aumentar cada precio en:</span>;
  }

  function getHint() {
    if (!selectedIds.length) return "Selecciona productos. Esto cambia precio de venta.";
    if (isSingle) return "Ej: 20000";
    if (adjustType === "percent") return "Ej: 20 (aumenta 20%)";
    return "Ej: 500 (aumenta $500 c/u)";
  }

  async function doUpdate() {
    if (!selectedIds.length || !adjustValue) return;
    setLoading(true);
    try {
      let body: any;
      if (isSingle) body = { productIds: selectedIds, newPrice: parseFloat(adjustValue) };
      else if (adjustType === "percent") body = { productIds: selectedIds, increasePercent: parseFloat(adjustValue) };
      else body = { productIds: selectedIds, increaseAmount: parseFloat(adjustValue) };
      const endpoint = apiEndpoint || "/products/update-prices";
      const res = await postJson<any>(endpoint, body);
      setResult(res.updated);
    } catch (e: any) { alert("Error: " + e.message); }
    setLoading(false);
  }

  function canSubmit() { return selectedIds.length > 0 && adjustValue !== ""; }

  return (
    <ModalBackdrop onClose={onClose}>
      <h3 style={{ margin: "0 0 16px", fontSize: 18 }}>💵 Actualizar precios de venta</h3>
      {!result ? (<>
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer", fontSize: 13 }}>
            <input type="checkbox" checked={selectAll} onChange={toggleAll} />
            Todos los productos
          </label>
          <span style={{ fontSize: 12, color: "#888" }}>{selectedIds.length} seleccionados</span>
        </div>
        <div style={{ maxHeight: 250, overflow: "auto", border: "1px solid #eee", borderRadius: 8, marginBottom: 12 }}>
          {products.map((item: any) => (
            <label key={item.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", cursor: "pointer", fontSize: 13, borderBottom: "1px solid #f5f5f5", background: selectedIds.includes(item.id) ? "#f0eeff" : "transparent" }}>
              <input type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => toggleItem(item.id)} />
              <span style={{ flex: 1 }}>{item.name}</span>
              <span style={{ color: "#888", fontSize: 11 }}>${Number(item.price || 0).toLocaleString("es-AR")}</span>
            </label>
          ))}
        </div>
        {isMulti && (
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <button onClick={() => setAdjustType("percent")} style={{ padding: "6px 16px", borderRadius: 8, border: "none", cursor: "pointer", background: adjustType === "percent" ? "#6c63ff" : "#f0f0f0", color: adjustType === "percent" ? "#fff" : "#333", fontSize: 13 }}>Aumentar %</button>
            <button onClick={() => setAdjustType("amount")} style={{ padding: "6px 16px", borderRadius: 8, border: "none", cursor: "pointer", background: adjustType === "amount" ? "#6c63ff" : "#f0f0f0", color: adjustType === "amount" ? "#fff" : "#333", fontSize: 13 }}>Aumentar $</button>
          </div>
        )}
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 16 }}>
          <label style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap" }}>{getLabel()}</label>
          <input type="number" value={adjustValue} onChange={e => setAdjustValue(e.target.value)} style={{ flex: 1, padding: "8px 12px", border: "1px solid #ddd", borderRadius: 8, fontSize: 14 }} placeholder={getHint()} />
          {isMulti && adjustType === "percent" && <span style={{ fontSize: 14, color: "#888" }}>%</span>}
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "8px 20px", background: "#f0f0f0", border: "none", borderRadius: 8, cursor: "pointer" }}>Cancelar</button>
          <button onClick={doUpdate} disabled={!canSubmit() || loading} style={{ padding: "8px 20px", background: canSubmit() ? "#6c63ff" : "#ccc", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>{loading ? "Actualizando..." : "Actualizar " + selectedIds.length + " productos"}</button>
        </div>
      </>) : (
        <div>
          <p style={{ fontSize: 16, color: "#2ecc71", fontWeight: 600 }}>✅ {result} productos actualizados</p>
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}><button onClick={() => { onDone(); onClose(); }} style={{ padding: "8px 20px", background: "#6c63ff", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" }}>Listo</button></div>
        </div>
      )}
    </ModalBackdrop>
  );
}
