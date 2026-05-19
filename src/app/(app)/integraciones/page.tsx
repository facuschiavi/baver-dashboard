"use client";

import { useState, useEffect, useCallback } from "react";

type Integration = {
  id: number;
  provider: string;
  enabled: boolean;
  config: any;
  last_sync: string | null;
  created_at: string;
  updated_at: string;
};

export default function IntegracionesPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [mpConfig, setMpConfig] = useState({ access_token: "", webhook_secret: "" });
  const [mpEnabled, setMpEnabled] = useState(false);
  const [spConfig, setSpConfig] = useState({ shop_url: "", client_id: "", client_secret: "", sync_interval: "30", attribute_option: "auto" });
  const [spEnabled, setSpEnabled] = useState(false);
  const [spStatus, setSpStatus] = useState<any>(null);
  const [checkResult, setCheckResult] = useState<any>(null);
  const [syncing, setSyncing] = useState(false);
  const [saving, setSaving] = useState("");
  const [error, setError] = useState("");
  const [testing, setTesting] = useState(false);

  const api = useCallback(async (path: string, opts: any = {}) => {
    const token = localStorage.getItem("token");
    const res = await fetch(path, {
      ...opts,
      headers: { ...opts.headers, "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
    });
    return res.json();
  }, []);

  const loadIntegrations = useCallback(async () => {
    const data = await api("/api/integrations");
    if (Array.isArray(data)) {
      setIntegrations(data);
      const mp = data.find((i: any) => i.provider === "mercadopago");
      if (mp) {
        setMpEnabled(mp.enabled);
        if (mp.config) {
          const c = typeof mp.config === "string" ? JSON.parse(mp.config) : mp.config;
          setMpConfig({ access_token: c.access_token || "", webhook_secret: c.webhook_secret || "" });
        }
      }
      const sp = data.find((i: any) => i.provider === "shopify");
      if (sp) {
        setSpEnabled(sp.enabled);
        if (sp.config) {
          const c = typeof sp.config === "string" ? JSON.parse(sp.config) : sp.config;
          setSpConfig({ shop_url: c.shop_url || "", client_id: c.client_id || "", client_secret: c.client_secret || "", sync_interval: String(c.sync_interval_minutes || "30"), attribute_option: c.attribute_option || "auto" });
        }
      }
    }
    // Cargar status de Shopify si está configurado
    const spStat = await api("/api/integrations/shopify/status");
    if (spStat && !spStat.error) setSpStatus(spStat);
  }, [api]);

  useEffect(() => { loadIntegrations(); }, [loadIntegrations]);

  async function handleSaveMP() {
    if (!mpConfig.access_token) { setError("Access Token es requerido"); return; }
    setSaving("mp"); setError("");
    const result = await api("/api/integrations/mercadopago", {
      method: "PUT",
      body: JSON.stringify({ config: mpConfig, enabled: mpEnabled }),
    });
    setSaving("");
    if (result.error) { setError(result.error); return; }
    await loadIntegrations();
  }

  async function handleTestMP() {
    setTesting(true); setCheckResult(null);
    const result = await api("/api/integrations/mercadopago/check");
    setTesting(false);
    if (result.error) { setCheckResult({ error: result.error }); return; }
    setCheckResult(result);
  }

  async function handleSaveShopify() {
    if (!spConfig.shop_url || !spConfig.client_id || !spConfig.client_secret) { setError("Shop URL, Client ID y Client Secret son requeridos"); return; }
    setSaving("sp"); setError("");
    const result = await api("/api/integrations/shopify", {
      method: "PUT",
      body: JSON.stringify({
        config: { ...spConfig, sync_interval_minutes: parseInt(spConfig.sync_interval) || 30 },
        enabled: spEnabled,
      }),
    });
    setSaving("");
    if (result.error) { setError(result.error); return; }
    await loadIntegrations();
  }

  async function handleSync() {
    setSyncing(true);
    const result = await api("/api/integrations/shopify/sync", { method: "POST" });
    setSyncing(false);
    if (result.error) { setCheckResult({ error: result.error }); return; }
    setCheckResult(result);
    await loadIntegrations();
  }

  return (
    <div className="page-container" style={{ padding: "24px", maxWidth: "900px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "24px", fontWeight: 800, margin: "0 0 4px" }}>🔗 Integraciones</h1>
      <p style={{ fontSize: "14px", color: "#888", margin: "0 0 24px" }}>
        Conectá servicios externos para automatizar cobros, productos y procesos.
      </p>

      {/* Mercado Pago */}
      <div style={{ background: "var(--card-bg, #fff)", borderRadius: "16px", padding: "24px", border: "1px solid var(--border, #eee)", marginBottom: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
          <span style={{ fontSize: "32px" }}>🧾</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "18px", fontWeight: 700 }}>Mercado Pago</div>
            <div style={{ fontSize: "13px", color: "#888" }}>Cobro automático con link de pago + webhook de confirmación</div>
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
            <input type="checkbox" checked={mpEnabled} onChange={e => setMpEnabled(e.target.checked)} />
            <span style={{ fontSize: "14px", fontWeight: 600 }}>{mpEnabled ? "Activo" : "Inactivo"}</span>
          </label>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div>
            <label style={{ fontSize: "12px", fontWeight: 700, color: "#666", display: "block", marginBottom: "4px" }}>Access Token</label>
            <input
              type="password"
              value={mpConfig.access_token}
              onChange={e => setMpConfig(prev => ({ ...prev, access_token: e.target.value }))}
              placeholder="APP_USR-... o TEST-..."
              style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid var(--border, #ddd)", fontSize: "14px", background: "var(--input-bg, #fff)" }}
            />
          </div>
          <div>
            <label style={{ fontSize: "12px", fontWeight: 700, color: "#666", display: "block", marginBottom: "4px" }}>Webhook Secret (opcional)</label>
            <input
              type="text"
              value={mpConfig.webhook_secret}
              onChange={e => setMpConfig(prev => ({ ...prev, webhook_secret: e.target.value }))}
              placeholder="Secret de notificaciones IPN"
              style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid var(--border, #ddd)", fontSize: "14px", background: "var(--input-bg, #fff)" }}
            />
          </div>
        </div>

        <div style={{ display: "flex", gap: "8px", marginTop: "16px" }}>
          <button onClick={handleSaveMP} disabled={saving === "mp"}
            style={{ padding: "10px 24px", borderRadius: "8px", border: "none", background: "#6c63ff", color: "#fff", cursor: "pointer", fontWeight: 700, fontSize: "14px", opacity: saving === "mp" ? 0.7 : 1 }}>
            {saving === "mp" ? "Guardando..." : "💾 Guardar"}
          </button>
          <button onClick={handleTestMP} disabled={testing || !mpConfig.access_token}
            style={{ padding: "10px 24px", borderRadius: "8px", border: "1px solid var(--border, #ddd)", background: "transparent", cursor: "pointer", fontSize: "14px", opacity: testing ? 0.7 : 1 }}>
            {testing ? "Verificando..." : "🔍 Probar conexión"}
          </button>
        </div>

        {checkResult && checkResult.connected !== undefined && (
          <div style={{ marginTop: "12px", padding: "12px 16px", borderRadius: "8px", fontSize: "13px", background: checkResult.connected ? "#efe" : "#fee", color: checkResult.connected ? "#070" : "#c00" }}>
            {checkResult.connected ? `✅ Conectado — User ID: ${checkResult.user_id}` : `❌ Error: ${checkResult.error}`}
          </div>
        )}

        <div style={{ marginTop: "16px", padding: "12px 16px", background: "var(--bg-secondary, #f5f5f5)", borderRadius: "8px" }}>
          <div style={{ fontSize: "12px", fontWeight: 700, color: "#666", marginBottom: "4px" }}>URL de Webhook</div>
          <code style={{ fontSize: "13px", wordBreak: "break-all" }}>{typeof window !== "undefined" ? `${window.location.protocol}//${window.location.host}/api/integrations/mercadopago/webhook` : ""}</code>
        </div>
      </div>

      {/* Shopify */}
      <div style={{ background: "var(--card-bg, #fff)", borderRadius: "16px", padding: "24px", border: "1px solid var(--border, #eee)", marginBottom: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
          <span style={{ fontSize: "32px" }}>🛒</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "18px", fontWeight: 700 }}>Shopify</div>
            <div style={{ fontSize: "13px", color: "#888" }}>Sincronización de productos, órdenes y clientes (solo lectura)</div>
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
            <input type="checkbox" checked={spEnabled} onChange={e => setSpEnabled(e.target.checked)} />
            <span style={{ fontSize: "14px", fontWeight: 600 }}>{spEnabled ? "Activo" : "Inactivo"}</span>
          </label>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div>
            <label style={{ fontSize: "12px", fontWeight: 700, color: "#666", display: "block", marginBottom: "4px" }}>Shop URL</label>
            <input
              type="text"
              value={spConfig.shop_url}
              onChange={e => setSpConfig(prev => ({ ...prev, shop_url: e.target.value }))}
              placeholder="baversion.myshopify.com"
              style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid var(--border, #ddd)", fontSize: "14px", background: "var(--input-bg, #fff)" }}
            />
          </div>
          <div>
            <label style={{ fontSize: "12px", fontWeight: 700, color: "#666", display: "block", marginBottom: "4px" }}>Client ID (API Key)</label>
            <input
              type="text"
              value={spConfig.client_id}
              onChange={e => setSpConfig(prev => ({ ...prev, client_id: e.target.value }))}
              placeholder="3153a1eabc22a83c..."
              style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid var(--border, #ddd)", fontSize: "14px", background: "var(--input-bg, #fff)" }}
            />
          </div>
          <div>
            <label style={{ fontSize: "12px", fontWeight: 700, color: "#666", display: "block", marginBottom: "4px" }}>Client Secret</label>
            <input
              type="password"
              value={spConfig.client_secret}
              onChange={e => setSpConfig(prev => ({ ...prev, client_secret: e.target.value }))}
              placeholder="shpss_..."
              style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid var(--border, #ddd)", fontSize: "14px", background: "var(--input-bg, #fff)" }}
            />
            <div style={{ fontSize: "11px", color: "#999", marginTop: "4px" }}>
              Admin de Shopify → Configuración → Apps y canales de venta → Desarrollar apps → Crear app → Configurar scopes: read_products, read_orders, read_customers, read_inventory
            </div>
          </div>
          <div>
            <label style={{ fontSize: "12px", fontWeight: 700, color: "#666", display: "block", marginBottom: "4px" }}>Atributo a sincronizar</label>
            <select
              value={spConfig.attribute_option || "auto"}
              onChange={e => setSpConfig(prev => ({ ...prev, attribute_option: e.target.value }))}
              style={{ width: "100%", maxWidth: "300px", padding: "10px 14px", borderRadius: "8px", border: "1px solid var(--border, #ddd)", fontSize: "14px", background: "var(--input-bg, #fff)" }}
            >
              <option value="auto">Auto (detectar Talle/Talla/Size)</option>
              <option value="talle">Talle</option>
              <option value="color">Color</option>
              <option value="none">Ninguno (cada variant como producto)</option>
            </select>
            <div style={{ fontSize: "11px", color: "#999", marginTop: "4px" }}>
              El atributo seleccionado se mapea como atributo interno del producto. El resto de opciones dividen los productos.
            </div>
          </div>

        </div>

        <div style={{ display: "flex", gap: "8px", marginTop: "16px" }}>
          <button onClick={handleSaveShopify} disabled={saving === "sp"}
            style={{ padding: "10px 24px", borderRadius: "8px", border: "none", background: "#6c63ff", color: "#fff", cursor: "pointer", fontWeight: 700, fontSize: "14px", opacity: saving === "sp" ? 0.7 : 1 }}>
            {saving === "sp" ? "Guardando..." : "💾 Guardar"}
          </button>
          <button onClick={handleSync} disabled={syncing || !spConfig.client_id || !spConfig.client_secret}
            style={{ padding: "10px 24px", borderRadius: "8px", border: "1px solid var(--border, #ddd)", background: "transparent", cursor: "pointer", fontSize: "14px", opacity: syncing ? 0.7 : 1 }}>
            {syncing ? "Sincronizando..." : "🔄 Sync Now"}
          </button>
        </div>

        {spStatus && (
          <div style={{ marginTop: "12px", display: "flex", gap: "16px", flexWrap: "wrap" }}>
            {spStatus.connected && (
              <>
                <div style={{ padding: "8px 12px", borderRadius: "8px", background: "#efe", fontSize: "13px", color: "#070" }}>✅ Conectado</div>
                <div style={{ padding: "8px 12px", borderRadius: "8px", background: "var(--bg-secondary, #f5f5f5)", fontSize: "13px" }}>
                  📦 {spStatus.products_synced} productos
                </div>
                <div style={{ padding: "8px 12px", borderRadius: "8px", background: "var(--bg-secondary, #f5f5f5)", fontSize: "13px" }}>
                  📋 {spStatus.orders_synced} órdenes
                </div>
                {spStatus.last_sync && (
                  <div style={{ padding: "8px 12px", borderRadius: "8px", background: "var(--bg-secondary, #f5f5f5)", fontSize: "13px" }}>
                    🕐 Última sync: {new Date(spStatus.last_sync).toLocaleString()}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {checkResult && checkResult.success !== undefined && (
          <div style={{ marginTop: "12px", padding: "12px 16px", borderRadius: "8px", fontSize: "13px", background: checkResult.success ? "#efe" : "#fee", color: checkResult.success ? "#070" : "#c00" }}>
            {checkResult.success ? `✅ ${checkResult.message}` : `❌ ${checkResult.error}`}
            {checkResult.details?.errors?.length > 0 && (
              <div style={{ marginTop: "4px", fontSize: "12px", color: "#c00" }}>
                {checkResult.details.errors.map((e: string, i: number) => <div key={i}>⚠️ {e}</div>)}
              </div>
            )}
          </div>
        )}
      </div>

      {error && <div style={{ marginTop: "12px", padding: "10px 14px", background: "#fee", borderRadius: "8px", color: "#c00", fontSize: "13px" }}>{error}</div>}
    </div>
  );
}
