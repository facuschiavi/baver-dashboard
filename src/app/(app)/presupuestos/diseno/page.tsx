"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { fetchJson, putJson } from "../../../lib";

type BudgetDesign = {
  id?: number;
  client_id?: number;
  template_html: string;
  logo_url: string;
  primary_color: string;
  footer_text: string;
  show_prices: boolean;
};

const defaultTemplate = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<style>
  body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
  .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid {{COLOR}}; padding-bottom: 20px; }
  .header h1 { color: {{COLOR}}; margin: 0 0 5px; font-size: 24px; }
  .header h2 { margin: 0; font-size: 16px; font-weight: normal; color: #666; }
  .meta { display: flex; justify-content: space-between; margin: 20px 0; }
  .meta-box { background: #f9f9f9; padding: 12px 16px; border-radius: 8px; border-left: 4px solid {{COLOR}}; flex: 1; margin: 0 4px; }
  .meta-box p { margin: 4px 0; font-size: 13px; }
  table { width: 100%; border-collapse: collapse; margin: 20px 0; }
  th { background: {{COLOR}}; color: #fff; padding: 10px 8px; text-align: left; font-size: 12px; }
  td { font-size: 13px; }
  .totals { margin-top: 20px; text-align: right; }
  .totals p { margin: 4px 0; font-size: 14px; }
  .totals .total { font-size: 20px; font-weight: bold; color: {{COLOR}}; }
  .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #999; border-top: 1px solid #eee; padding-top: 12px; }
  .notes { background: #fff8e1; padding: 10px 14px; border-radius: 6px; margin: 16px 0; font-size: 13px; }
</style>
</head>
<body>
<div class="header">
  {{LOGO}}
  <h1>PRESUPUESTO</h1>
  <h2>{{NUMERO}}</h2>
</div>
<div class="meta">
  <div class="meta-box">
    <p><strong>Cliente:</strong> {{CONTACT}}</p>
    <p><strong>Fecha:</strong> {{FECHA}}</p>
  </div>
  <div class="meta-box">
    <p><strong>Validez:</strong> {{VENCE}}</p>
    <p><strong>Estado:</strong> {{ESTADO}}</p>
  </div>
</div>
<table>
  <thead>
    <tr>
      <th>Descripción</th>
      <th style="text-align:right">Cantidad</th>
      <th style="text-align:right">Precio Unit.</th>
      <th style="text-align:right">Subtotal</th>
    </tr>
  </thead>
  <tbody>
    {{ITEMS}}
  </tbody>
</table>
<div class="totals">
  <p>Subtotal: {{SUBTOTAL}}</p>
  <p>Descuento: -{{DESCUENTO}}</p>
  <p class="total">TOTAL: {{TOTAL}}</p>
</div>
{{NOTAS}}
<div class="footer">{{FOOTER}}</div>
</body>
</html>`;

export default function BudgetDesignPage() {
  const router = useRouter();
  const [design, setDesign] = useState<BudgetDesign>({
    template_html: defaultTemplate,
    logo_url: "",
    primary_color: "#6c63ff",
    footer_text: "Gracias por su confianza",
    show_prices: true,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchJson<BudgetDesign>("/budgets/design")
        if (data && data.id) setDesign(data);
      } catch {}
    })();
  }, []);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      await putJson("/budgets/design", design);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) {
      alert("Error: " + e.message);
    }
    setSaving(false);
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" }}>
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>Diseño de Presupuesto PDF</h1>
          <p style={{ fontSize: "13px", color: "var(--text-secondary)", margin: "6px 0 0" }}>Personalizá la plantilla de los presupuestos que se exportan a PDF</p>
        </div>
        <button onClick={() => router.push("/presupuestos")}
          style={{ background: "none", border: "1px solid var(--border-color)", borderRadius: "10px", padding: "8px 14px", cursor: "pointer", color: "var(--text-primary)", fontSize: "13px" }}>
          ← Volver
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
        <div style={{ background: "var(--bg-secondary)", borderRadius: "16px", padding: "20px", border: "1px solid var(--border-color)" }}>
          <h2 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)", margin: "0 0 16px" }}>Configuración</h2>

          <div style={{ marginBottom: "14px" }}>
            <label style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-secondary)", margin: "0 0 4px", display: "block" }}>Color principal</label>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <input type="color" value={design.primary_color} onChange={e => setDesign({ ...design, primary_color: e.target.value })}
                style={{ width: "40px", height: "40px", borderRadius: "8px", border: "1px solid var(--border-color)", cursor: "pointer" }} />
              <input value={design.primary_color} onChange={e => setDesign({ ...design, primary_color: e.target.value })}
                style={{ flex: 1, padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--bg-input)", color: "var(--text-primary)", fontSize: "13px" }} />
            </div>
          </div>

          <div style={{ marginBottom: "14px" }}>
            <label style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-secondary)", margin: "0 0 4px", display: "block" }}>Texto del footer</label>
            <input value={design.footer_text} onChange={e => setDesign({ ...design, footer_text: e.target.value })}
              style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--bg-input)", color: "var(--text-primary)", fontSize: "13px" }} />
          </div>

          <div style={{ marginBottom: "14px" }}>
            <label style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-secondary)", margin: "0 0 4px", display: "flex", alignItems: "center", gap: "8px" }}>
              <input type="checkbox" checked={design.show_prices} onChange={e => setDesign({ ...design, show_prices: e.target.checked })}
                style={{ width: "16px", height: "16px", cursor: "pointer" }} />
              Mostrar precios en el PDF
            </label>
          </div>

          <div style={{ marginBottom: "14px" }}>
            <label style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-secondary)", margin: "0 0 4px", display: "block" }}>URL del logo</label>
            <input value={design.logo_url} onChange={e => setDesign({ ...design, logo_url: e.target.value })}
              placeholder="https://ejemplo.com/logo.png"
              style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--bg-input)", color: "var(--text-primary)", fontSize: "13px" }} />
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-secondary)", margin: "0 0 4px", display: "block" }}>Variables disponibles</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
              {["{{NUMERO}}","{{CONTACT}}","{{FECHA}}","{{VENCE}}","{{ESTADO}}","{{ITEMS}}","{{SUBTOTAL}}","{{DESCUENTO}}","{{TOTAL}}","{{NOTAS}}","{{FOOTER}}","{{LOGO}}","{{COLOR}}"].map(v => (
                <span key={v} style={{ background: "var(--bg-input)", borderRadius: "4px", padding: "2px 6px", fontSize: "11px", color: "var(--accent)", fontFamily: "monospace" }}>{v}</span>
              ))}
            </div>
          </div>

          <button onClick={handleSave} disabled={saving}
            style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "none", background: saving ? "#888" : "var(--accent)", color: "#fff", cursor: "pointer", fontWeight: 700, fontSize: "13px" }}>
            {saving ? "Guardando..." : saved ? "✓ Guardado" : "Guardar plantilla"}
          </button>
        </div>

        <div style={{ background: "var(--bg-secondary)", borderRadius: "16px", padding: "20px", border: "1px solid var(--border-color)" }}>
          <h2 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)", margin: "0 0 10px" }}>Template HTML</h2>
          <p style={{ fontSize: "11px", color: "var(--text-secondary)", margin: "0 0 10px" }}>
            Usá las variables de arriba. Dejalo vacío para usar el template por defecto.
          </p>
          <textarea value={design.template_html} onChange={e => setDesign({ ...design, template_html: e.target.value })}
            style={{ width: "100%", height: "500px", padding: "12px", borderRadius: "8px", border: "1px solid var(--border-color)", background: "#1e1e2e", color: "#e0e0e0", fontSize: "12px", fontFamily: "monospace", resize: "vertical", lineHeight: "1.5" }}
            spellCheck={false} />
        </div>
      </div>
    </div>
  );
}
