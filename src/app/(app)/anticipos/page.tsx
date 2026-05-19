"use client";

import { useEffect, useState } from "react";
import { fetchJson, postJson } from "../../lib";
import { Card, Badge, PageTitle, Loading, Empty } from "../../components/shared/UI";
import * as XLSX from "xlsx";

type AdvanceRow = {
  id: number;
  entity_type: "client" | "provider" | string;
  entity_id: number;
  entity_name: string;
  amount: number;
  used_amount: number;
  remaining: number;
  notes: string;
  created_at: string;
};

type Stats = {
  total_count: number;
  total_amount: number;
  total_used: number;
  total_remaining: number;
  client_count: number;
  provider_count: number;
};

type Period = "today" | "week" | "month" | "custom";

type UnpaidNV = { id: number; order_number: string; contact_name: string; phone: string; total: number; payment_paid: number; payment_pending: number; };
type UnpaidNP = { id: number; order_number: string; provider_name: string; total: number; payment_paid: number; payment_pending: number; };

export default function AnticiposPage() {
  const [advances, setAdvances] = useState<AdvanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"cards" | "list">("cards");
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterConsumed, setFilterConsumed] = useState("");
  const [period, setPeriod] = useState<Period>("month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  // Use advance modal state
  const [useAdvanceTarget, setUseAdvanceTarget] = useState<AdvanceRow | null>(null);
  const [unpaidNVs, setUnpaidNVs] = useState<UnpaidNV[]>([]);
  const [unpaidNPs, setUnpaidNPs] = useState<UnpaidNP[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<UnpaidNV | UnpaidNP | null>(null);
  const [useAmount, setUseAmount] = useState("");
  const [useAdvanceSearch, setUseAdvanceSearch] = useState("");
  const [showUseAdvanceDropdown, setShowUseAdvanceDropdown] = useState(false);
  const [usingAdvance, setUsingAdvance] = useState(false);

  function load() {
    setLoading(true);
    const qs = "?period=" + period + (period === "custom" && customFrom && customTo ? "&from=" + customFrom + "&to=" + customTo : "");
    fetchJson<AdvanceRow[]>("/advances" + qs)
      .then(setAdvances)
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [refreshKey, period, customFrom, customTo]);

  const filtered = advances.filter((a) => {
    if (search && !a.entity_name?.toLowerCase().includes(search.toLowerCase()) && !String(a.id).includes(search)) return false;
    if (filterType && a.entity_type !== filterType) return false;
    if (filterConsumed === "consumed" && Number(a.used_amount || 0) === 0) return false;
    if (filterConsumed === "available" && Number(a.used_amount || 0) > 0) return false;
    return true;
  });

  const stats: Stats = {
    total_count: advances.length,
    total_amount: advances.reduce((s, a) => s + Number(a.amount || 0), 0),
    total_used: advances.reduce((s, a) => s + Number(a.used_amount || 0), 0),
    total_remaining: advances.reduce((s, a) => s + Number(a.remaining || 0), 0),
    client_count: advances.filter(a => a.entity_type === "client").length,
    provider_count: advances.filter(a => a.entity_type === "provider").length,
  };

  function openUseAdvance(adv: AdvanceRow) {
    if (Number(adv.remaining) <= 0) { alert("Este anticipo no tiene saldo disponible"); return; }
    setUseAdvanceTarget(adv);
    setSelectedDoc(null);
    setUseAmount("");
    setUseAdvanceSearch("");
    if (adv.entity_type === "client") {
      fetchJson<UnpaidNV[]>("/orders/unpaid?contact_id=" + adv.entity_id)
        .then(setUnpaidNVs)
        .catch(console.error);
      setUnpaidNPs([]);
    } else {
      fetchJson<UnpaidNP[]>("/purchase-orders/unpaid?provider_id=" + adv.entity_id)
        .then(setUnpaidNPs)
        .catch(console.error);
      setUnpaidNVs([]);
    }
  }

  function selectDocForAdvance(doc: UnpaidNV | UnpaidNP) {
    setSelectedDoc(doc);
    const maxUse = Math.min(
      Number(useAdvanceTarget?.remaining || 0),
      Number((doc as any).payment_pending || 0)
    );
    setUseAmount(String(maxUse >= 0 ? maxUse : 0));
    setUseAdvanceSearch("");
    setShowUseAdvanceDropdown(false);
  }

  async function handleUseAdvance() {
    if (!useAdvanceTarget || !selectedDoc) return;
    const amount = Number(useAmount);
    if (!amount || amount <= 0) { alert("Ingresá un monto válido"); return; }
    if (amount > Number(useAdvanceTarget.remaining)) { alert("El monto supera el disponible del anticipo"); return; }
    setUsingAdvance(true);
    try {
      const body: any = { amount };
      if (useAdvanceTarget.entity_type === "client") {
        body.order_id = (selectedDoc as UnpaidNV).id;
      } else {
        body.purchase_order_id = (selectedDoc as UnpaidNP).id;
      }
      await postJson("/advances/" + useAdvanceTarget.id + "/use", body);
      setUseAdvanceTarget(null);
      setSelectedDoc(null);
      setUseAmount("");
      setRefreshKey(k => k + 1);
    } catch (e: any) {
      alert(e?.response?.data?.error || e?.message || "Error al usar el anticipo");
    } finally {
      setUsingAdvance(false);
    }
  }

  const isClientAdvance = useAdvanceTarget?.entity_type === "client";

  function handleExportExcel() {
    const data = filtered.map(a => ({
      "ID": a.id,
      "Fecha": new Date(a.created_at).toLocaleDateString("es-AR"),
      "Tipo": a.entity_type === "provider" ? "Proveedor" : "Cliente",
      "Entidad": a.entity_name || "-",
      "Total": Number(a.amount || 0),
      "Usado": Number(a.used_amount || 0),
      "Disponible": Number(a.remaining || 0),
      "Notas": a.notes || "-",
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Anticipos");
    XLSX.writeFile(wb, "Anticipos.xlsx");
  }

  const periodTabs = [
    { label: "Hoy", value: "today" },
    { label: "Semana", value: "week" },
    { label: "Mes", value: "month" },
    { label: "Personalizado", value: "custom" },
  ];

  return (
    <div>
      <div style={{ marginBottom: "16px" }}>
        <PageTitle>Anticipos</PageTitle>
        <p style={{ fontSize: "13px", color: "#888", margin: "2px 0 0" }}>
          Consultá los anticipos cargados de clientes y proveedores.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "10px", marginBottom: "16px" }}>
        <div style={{ background: "#1a1a2e", borderRadius: "12px", padding: "14px", color: "#fff" }}>
          <div style={{ fontSize: "11px", color: "#aaa", marginBottom: "4px" }}>Anticipos activos</div>
          <div style={{ fontSize: "24px", fontWeight: 800 }}>{stats.total_count}</div>
          <div style={{ fontSize: "12px", color: "#27ae60", marginTop: "2px" }}>
            ${stats.total_amount.toLocaleString("es-AR")} cargado
          </div>
        </div>
        <div style={{ background: "#fff", borderRadius: "12px", padding: "14px", border: "1px solid #eee" }}>
          <div style={{ fontSize: "11px", color: "#888", marginBottom: "4px" }}>Disponible</div>
          <div style={{ fontSize: "20px", fontWeight: 800, color: "#27ae60" }}>${stats.total_remaining.toLocaleString("es-AR")}</div>
          {stats.total_used > 0 && (
            <div style={{ fontSize: "12px", color: "#f39c12", marginTop: "2px" }}>
              ${stats.total_used.toLocaleString("es-AR")} aplicado
            </div>
          )}
        </div>
        <div style={{ background: "#fff", borderRadius: "12px", padding: "14px", border: "1px solid #eee" }}>
          <div style={{ fontSize: "11px", color: "#888", marginBottom: "4px" }}>Clientes</div>
          <div style={{ fontSize: "20px", fontWeight: 800 }}>{stats.client_count}</div>
        </div>
        <div style={{ background: "#fff", borderRadius: "12px", padding: "14px", border: "1px solid #eee" }}>
          <div style={{ fontSize: "11px", color: "#888", marginBottom: "4px" }}>Proveedores</div>
          <div style={{ fontSize: "20px", fontWeight: 800 }}>{stats.provider_count}</div>
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px", flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: "4px", background: "#f0f0f0", padding: "3px", borderRadius: "8px" }}>
          {(["today", "week", "month", "custom"] as Period[]).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              style={{ padding: "5px 12px", borderRadius: "6px", border: "none", background: period === p ? "#1a1a2e" : "transparent", color: period === p ? "#fff" : "#666", cursor: "pointer", fontSize: "12px", fontWeight: 700 }}>
              {p === "today" ? "Hoy" : p === "week" ? "Semana" : p === "custom" ? "Personalizado" : "Mes"}
            </button>
          ))}
        </div>

        {period === "custom" && (
          <div style={{ display: "flex", gap: "8px", alignItems: "center", marginTop: "6px" }}>
            <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
              style={{ padding: "5px 10px", borderRadius: "6px", border: "1px solid #ddd", fontSize: "12px" }} />
            <span style={{ fontSize: "12px", color: "#888" }}>hasta</span>
            <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
              style={{ padding: "5px 10px", borderRadius: "6px", border: "1px solid #ddd", fontSize: "12px" }} />
            {(customFrom || customTo) && (
              <button onClick={() => { setCustomFrom(""); setCustomTo(""); }}
                style={{ padding: "5px 10px", borderRadius: "6px", border: "1px solid #ddd", background: "#fff", fontSize: "12px", cursor: "pointer" }}>
                Limpiar
              </button>
            )}
            <button onClick={() => setRefreshKey(k => k + 1)}
              style={{ padding: "5px 12px", borderRadius: "6px", border: "none", background: "#27ae60", color: "#fff", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}>Aplicar</button>
          </div>
        )}
        <div style={{ marginLeft: "auto", display: "flex", gap: "6px", alignItems: "center" }}>
          <button
            onClick={handleExportExcel}
            disabled={filtered.length === 0}
            style={{
              padding: "7px 14px",
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
          <button onClick={() => setViewMode("cards")}
            style={{ padding: "6px 12px", borderRadius: "8px", border: "none", background: viewMode === "cards" ? "#1a1a2e" : "#e0e0e0", color: viewMode === "cards" ? "#fff" : "#333", cursor: "pointer", fontSize: "13px" }}>
            Cards
          </button>
          <button onClick={() => setViewMode("list")}
            style={{ padding: "6px 12px", borderRadius: "8px", border: "none", background: viewMode === "list" ? "#1a1a2e" : "#e0e0e0", color: viewMode === "list" ? "#fff" : "#333", cursor: "pointer", fontSize: "13px" }}>
            Lista
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: "8px", marginBottom: "12px", flexWrap: "wrap" }}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar..."
          style={{ flex: 1, minWidth: "160px", padding: "8px 12px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "13px" }} />
        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          style={{ padding: "8px 10px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "13px", minWidth: "140px" }}>
          <option value="">Tipo: Todos</option>
          <option value="client">Clientes</option>
          <option value="provider">Proveedores</option>
        </select>
        <select value={filterConsumed} onChange={e => setFilterConsumed(e.target.value)}
          style={{ padding: "8px 10px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "13px", minWidth: "160px" }}>
          <option value="">Consumo: Todos</option>
          <option value="consumed">Consumidos</option>
          <option value="available">Sin consumir</option>
        </select>
      </div>

      {loading ? <Loading /> : filtered.length === 0 ? (
        <Empty message="Sin anticipos cargados" />
      ) : viewMode === "cards" ? (
        <div style={{ display: "grid", gap: "10px" }}>
          {filtered.map(a => (
            <Card key={a.id}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px", flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 800, fontSize: "14px", color: "#1a1a2e" }}>#{a.id}</span>
                    <Badge color={a.entity_type === "provider" ? "#e67e22" : "#27ae60"}>
                      {a.entity_type === "provider" ? "Proveedor" : "Cliente"}
                    </Badge>
                    {Number(a.used_amount || 0) > 0 && (
                      <Badge color="#3498db">Consumido</Badge>
                    )}
                  </div>
                  <div style={{ fontSize: "15px", fontWeight: 700, color: "#222", marginBottom: "6px" }}>
                    {a.entity_name || "Sin nombre"}
                  </div>
                  <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", fontSize: "12px", color: "#666", marginBottom: "8px" }}>
                    <span>Total: <b style={{ color: "#1a1a2e" }}>${Number(a.amount).toLocaleString("es-AR")}</b></span>
                    <span>Usado: <b style={{ color: "#f39c12" }}>${Number(a.used_amount || 0).toLocaleString("es-AR")}</b></span>
                    <span>Disponible: <b style={{ color: "#27ae60" }}>${Number(a.remaining || 0).toLocaleString("es-AR")}</b></span>
                  </div>
                  <div style={{ fontSize: "11px", color: "#999" }}>
                    {new Date(a.created_at).toLocaleDateString("es-AR")}
                    {a.notes ? ` · ${a.notes}` : ""}
                  </div>
                </div>
                <div style={{ marginLeft: "12px", display: "flex", alignItems: "flex-start" }}>
                  {Number(a.remaining) > 0 && (
                    <button onClick={() => openUseAdvance(a)}
                      style={{ padding: "6px 12px", borderRadius: "8px", border: "1px solid #6c63ff", background: "#6c63ff", color: "#fff", cursor: "pointer", fontSize: "11px", fontWeight: 700, whiteSpace: "nowrap" }}>
                      🧾 Usar
                    </button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div style={{ background: "#fff", borderRadius: "12px", border: "1px solid #eee", overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "90px 1.1fr 100px 110px 110px 110px 100px", gap: "8px", padding: "10px 12px", background: "#f8f8f8", fontSize: "11px", fontWeight: 800, color: "#666", textTransform: "uppercase" }}>
            <div>ID</div>
            <div>Entidad</div>
            <div>Tipo</div>
            <div>Total</div>
            <div>Usado</div>
            <div>Disponible</div>
            <div></div>
          </div>
          {filtered.map(a => (
            <div key={a.id} style={{ display: "grid", gridTemplateColumns: "90px 1.1fr 100px 110px 110px 110px 100px", gap: "8px", padding: "12px", borderTop: "1px solid #f0f0f0", fontSize: "13px", alignItems: "center" }}>
              <div style={{ fontWeight: 800, color: "#1a1a2e" }}>#{a.id}</div>
              <div>
                <div style={{ fontWeight: 700 }}>{a.entity_name || "Sin nombre"}</div>
                <div style={{ fontSize: "11px", color: "#999" }}>{new Date(a.created_at).toLocaleDateString("es-AR")}</div>
              </div>
              <div>
                <Badge color={a.entity_type === "provider" ? "#e67e22" : "#27ae60"}>
                  {a.entity_type === "provider" ? "Proveedor" : "Cliente"}
                </Badge>
              </div>
              <div style={{ fontWeight: 700 }}>${Number(a.amount).toLocaleString("es-AR")}</div>
              <div style={{ fontWeight: 700, color: "#f39c12" }}>${Number(a.used_amount || 0).toLocaleString("es-AR")}</div>
              <div style={{ fontWeight: 700, color: "#27ae60" }}>${Number(a.remaining || 0).toLocaleString("es-AR")}</div>
              <div>
                {Number(a.remaining) > 0 && (
                  <button onClick={() => openUseAdvance(a)}
                    style={{ padding: "5px 10px", borderRadius: "6px", border: "1px solid #6c63ff", background: "#6c63ff", color: "#fff", cursor: "pointer", fontSize: "11px", fontWeight: 700 }}>
                    🧾 Usar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Use Advance Modal */}
      {useAdvanceTarget && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}
          onClick={e => e.target === e.currentTarget && (setUseAdvanceTarget(null), setSelectedDoc(null), setUseAmount(""))}>
          <div style={{ background: "#fff", borderRadius: "16px", padding: "24px", width: "100%", maxWidth: "480px" }}>
            <h2 style={{ margin: "0 0 6px", fontSize: "18px", fontWeight: 800 }}>🧾 Usar Anticipo</h2>
            <div style={{ fontSize: "13px", color: "#666", marginBottom: "16px", padding: "12px 14px", background: "#f8f8ff", borderRadius: "10px", border: "1px solid #e0e0ff" }}>
              <div style={{ fontWeight: 700, fontSize: "14px", marginBottom: "4px" }}>
                {isClientAdvance ? "Cliente:" : "Proveedor:"} <span style={{ color: "#1a1a2e" }}>{useAdvanceTarget.entity_name}</span>
              </div>
              <div style={{ display: "flex", gap: "16px", fontSize: "12px" }}>
                <span>Disponible: <b style={{ color: "#27ae60" }}>${Number(useAdvanceTarget.remaining).toLocaleString("es-AR")}</b></span>
                <span>Anticipo #{useAdvanceTarget.id}</span>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {/* Document selector */}
              <div>
                <label style={{ fontSize: "12px", fontWeight: 700, color: "#666", display: "block", marginBottom: "4px" }}>
                  {isClientAdvance ? "NV a aplicar" : "NP a aplicar"}
                </label>
                {selectedDoc ? (
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 12px", background: "#f0fff4", borderRadius: "8px", border: "1px solid #27ae60" }}>
                    <span style={{ flex: 1, fontSize: "14px", fontWeight: 700 }}>
                      {(selectedDoc as any).order_number}
                      {isClientAdvance
                        ? ` · ${(selectedDoc as UnpaidNV).contact_name}`
                        : ` · ${(selectedDoc as UnpaidNP).provider_name}`
                      }
                      <span style={{ marginLeft: "8px", color: "#f39c12", fontSize: "12px" }}>
                        ${(selectedDoc as any).payment_pending?.toLocaleString("es-AR")} pend.
                      </span>
                    </span>
                    <button onClick={() => { setSelectedDoc(null); setUseAmount(""); }}
                      style={{ background: "none", border: "none", color: "#e74c3c", cursor: "pointer", fontSize: "13px" }}>✕</button>
                  </div>
                ) : (
                  <div style={{ position: "relative" }}>
                    <input value={useAdvanceSearch}
                      onChange={e => { setUseAdvanceSearch(e.target.value); setShowUseAdvanceDropdown(true); }}
                      onFocus={() => setShowUseAdvanceDropdown(true)}
                      placeholder={isClientAdvance ? "Buscar NV por número o cliente..." : "Buscar NP por número o proveedor..."}
                      style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "13px", boxSizing: "border-box" }} />
                    {showUseAdvanceDropdown && (
                      <div style={{ position: "absolute", top: "100%", left: 0, right: 0, border: "1px solid #ddd", borderRadius: "8px", marginTop: "4px", maxHeight: "220px", overflowY: "auto", background: "#fff", zIndex: 10, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
                        {(isClientAdvance ? unpaidNVs : unpaidNPs).length === 0 ? (
                          <div style={{ padding: "12px", fontSize: "12px", color: "#999", textAlign: "center" }}>
                            {isClientAdvance ? "Este cliente no tiene NV pendientes" : "Este proveedor no tiene NP pendientes"}
                          </div>
                        ) : (isClientAdvance ? unpaidNVs : unpaidNPs)
                          .filter(doc => {
                            const d = doc as any;
                            const search = useAdvanceSearch.toLowerCase();
                            return !search || d.order_number?.toLowerCase().includes(search)
                              || (d.contact_name?.toLowerCase().includes(search))
                              || (d.provider_name?.toLowerCase().includes(search));
                          })
                          .slice(0, 15)
                          .map(doc => (
                            <div key={(doc as any).id} onClick={() => selectDocForAdvance(doc)}
                              style={{ padding: "10px 14px", cursor: "pointer", fontSize: "13px", borderBottom: "1px solid #f0f0f0", display: "flex", justifyContent: "space-between" }}
                              onMouseEnter={e => (e.currentTarget.style.background = "#f5f5f5")}
                              onMouseLeave={e => (e.currentTarget.style.background = "none")}>
                              <span>
                                <b>{(doc as any).order_number}</b>
                                {isClientAdvance
                                  ? ` · ${(doc as UnpaidNV).contact_name}`
                                  : ` · ${(doc as UnpaidNP).provider_name}`
                                }
                              </span>
                              <span style={{ color: "#f39c12", fontWeight: 700 }}>
                                ${(doc as any).payment_pending?.toLocaleString("es-AR")} pend.
                              </span>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Amount input */}
              <div>
                <label style={{ fontSize: "12px", fontWeight: 700, color: "#666", display: "block", marginBottom: "4px" }}>
                  Monto a usar *
                </label>
                <input type="number" value={useAmount} onChange={e => setUseAmount(e.target.value)}
                  placeholder="0.00"
                  min="0"
                  max={useAdvanceTarget.remaining}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "13px", boxSizing: "border-box" }} />
                <div style={{ fontSize: "11px", color: "#888", marginTop: "4px" }}>
                  Disponible: <b style={{ color: "#27ae60" }}>${Number(useAdvanceTarget.remaining).toLocaleString("es-AR")}</b>
                  {selectedDoc && (
                    <> · Pendiente: <b style={{ color: "#f39c12" }}>${Number((selectedDoc as any).payment_pending).toLocaleString("es-AR")}</b></>
                  )}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: "8px", marginTop: "20px" }}>
              <button onClick={() => { setUseAdvanceTarget(null); setSelectedDoc(null); setUseAmount(""); }}
                style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "1px solid #ddd", background: "#fff", cursor: "pointer", fontSize: "14px" }}>
                Cancelar
              </button>
              <button onClick={handleUseAdvance} disabled={usingAdvance || !selectedDoc || !Number(useAmount)}
                style={{
                  flex: 2, padding: "10px", borderRadius: "8px", border: "none",
                  background: !selectedDoc || !Number(useAmount) ? "#bfc6cd" : "#6c63ff",
                  color: "#fff", cursor: (!selectedDoc || !Number(useAmount) || usingAdvance) ? "not-allowed" : "pointer",
                  fontSize: "14px", fontWeight: 700, opacity: usingAdvance ? 0.7 : 1
                }}>
                {usingAdvance ? "Aplicando..." : "✅ Aplicar Anticipo"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
