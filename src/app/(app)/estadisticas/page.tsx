"use client";

import { useEffect, useState, useCallback } from "react";
import { fetchJson } from "../../lib";
import { PageTitle, Loading } from "../../components/shared/UI";

type Period = "today" | "week" | "month" | "custom";

type KpiBlock = {
  total: number;
  pagadas?: number;
  pendientes?: number;
  cobradas?: number;
  realizadas?: number;
};

type ProductInfo = {
  product_name: string;
  cantidad: number;
  ingreso: number;
};

type HourData = {
  hora: number;
  cantidad: number;
  ingreso: number;
};

type Stats = {
  total_ingresos: number;
  total_gastos: number;
  neto_flujo: number;
  compras: KpiBlock;
  ventas: KpiBlock;
  entregas: KpiBlock;
  producto_mas_vendido: ProductInfo | null;
  disenos: { total: number; realizados: number; en_produccion: number };
  nuevos_clientes: number;
  ticket_promedio: number;
  ventas_por_hora: HourData[];
  top5_productos: ProductInfo[];
};

export default function EstadisticasPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>("month");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [isCustom, setIsCustom] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let params = "?period=" + period;
      if (period === "custom" && fromDate && toDate) params += "&from=" + fromDate + "&to=" + toDate;
      const data = await fetchJson<Stats>("/dashboard/owner-stats" + params);
      setStats(data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, [period, fromDate, toDate]);

  useEffect(() => { load(); }, [load]);

  function handlePeriod(p: Period) {
    setPeriod(p);
    if (p !== "custom") setIsCustom(false);
    else setIsCustom(true);
  }

  function toggleCustom() {
    if (isCustom) { setPeriod("month"); setIsCustom(false); }
    else { setPeriod("custom"); setIsCustom(true); }
  }

  function fmt(n: number) { return "$" + n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function nm(n: number) { return n?.toLocaleString("es-AR") || "0"; }

  function KpiCard({ title, value, color, bg }: { title: string; value: string | number; color?: string; bg?: string }) {
    const isDark = bg === "dark" || false;
    return (
      <div style={{
        background: isDark ? "#1a1a2e" : "#fff",
        borderRadius: "12px",
        padding: "16px",
        border: isDark ? "none" : "1px solid #eee",
      }}>
        <div style={{ fontSize: "11px", color: isDark ? "#aaa" : "#888", marginBottom: "6px", textTransform: "uppercase", fontWeight: 600 }}>{title}</div>
        <div style={{ fontSize: "20px", fontWeight: 800, color: color || (isDark ? "#fff" : "#1a1a2e") }}>
          {typeof value === "number" && title.toLowerCase().includes("$") ? fmt(value) : value}
        </div>
      </div>
    );
  }

  function MiniCard({ label, value, color }: { label: string; value: string | number; color?: string }) {
    return (
      <div style={{ textAlign: "center", padding: "8px 12px", borderRadius: "8px", background: "#f8f8ff" }}>
        <div style={{ fontSize: "11px", color: "#888", marginBottom: "2px" }}>{label}</div>
        <div style={{ fontSize: "16px", fontWeight: 700, color: color || "#1a1a2e" }}>{value}</div>
      </div>
    );
  }

  function KpiGroup({ title, data, keys, labels, colors }: { title: string; data: KpiBlock; keys: (keyof KpiBlock)[]; labels: string[]; colors?: string[] }) {
    return (
      <div style={{ background: "#fff", borderRadius: "12px", padding: "16px", border: "1px solid #eee" }}>
        <h4 style={{ margin: "0 0 12px", fontSize: "15px", color: "#1a1a2e" }}>{title}</h4>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          {keys.map((k, i) => (
            <MiniCard key={k} label={labels[i] || k} value={nm(data[k] || 0)} color={colors?.[i]} />
          ))}
        </div>
      </div>
    );
  }

  function BarChart({ data, labelKey, valueKey, color }: { data: any[]; labelKey: string; valueKey: string; color?: string }) {
    if (!data?.length) return <p style={{ color: "#888", fontSize: "13px" }}>Sin datos en este período</p>;
    const max = Math.max(...data.map(d => d[valueKey]));
    return (
      <div style={{ display: "flex", alignItems: "flex-end", gap: "6px", padding: "12px 0", minHeight: "150px" }}>
        {data.map((d, i) => {
          const h = max > 0 ? (d[valueKey] / max) * 100 : 0;
          return (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ fontSize: "9px", color: "#888", marginBottom: "2px" }}>{nm(d[valueKey])}</div>
              <div style={{ width: "100%", height: Math.max(h, 4) + "px", background: color || "#6c63ff", borderRadius: "4px 4px 0 0", minHeight: "4px" }} />
              <div style={{ fontSize: "9px", color: "#888", marginTop: "4px" }}>{d[labelKey]}</div>
            </div>
          );
        })}
      </div>
    );
  }

  if (loading && !stats) return <div style={{ padding: "20px" }}><Loading /></div>;

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "20px" }}>
      <PageTitle title="📊 Estadísticas del negocio" />

      {/* Period filter */}
      <div style={{ display: "flex", gap: "6px", alignItems: "center", marginBottom: "20px", flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: "4px", background: "#f0f0f0", padding: "3px", borderRadius: "8px" }}>
          {(["today", "week", "month"] as Period[]).map(p => (
            <button key={p} onClick={() => handlePeriod(p)}
              style={{ padding: "6px 14px", borderRadius: "6px", border: "none",
                background: period === p && !isCustom ? "#1a1a2e" : "transparent",
                color: period === p && !isCustom ? "#fff" : "#666",
                cursor: "pointer", fontSize: "13px", fontWeight: 700 }}>
              {p === "today" ? "Hoy" : p === "week" ? "Semana" : "Mes"}
            </button>
          ))}
          <button onClick={toggleCustom}
            style={{ padding: "6px 14px", borderRadius: "6px", border: "none",
              background: isCustom ? "#1a1a2e" : "transparent",
              color: isCustom ? "#fff" : "#666",
              cursor: "pointer", fontSize: "13px", fontWeight: 700 }}>
            Personalizado
          </button>
        </div>
        {isCustom && (
          <div style={{ display: "flex", gap: "6px", alignItems: "center", marginLeft: "8px" }}>
            <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
              style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid #ddd", fontSize: "13px" }} />
            <span style={{ color: "#888", fontSize: "13px" }}>→</span>
            <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
              style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid #ddd", fontSize: "13px" }} />
            <button onClick={load} style={{ padding: "6px 14px", borderRadius: "6px", border: "none",
              background: "#6c63ff", color: "#fff", cursor: "pointer", fontSize: "13px", fontWeight: 700 }}>
              Aplicar
            </button>
          </div>
        )}
        {loading && <span style={{ marginLeft: "8px", color: "#888", fontSize: "13px" }}>Cargando...</span>}
      </div>

      {!stats ? <p style={{ color: "#888" }}>Sin datos disponibles</p> : (
        <>
          {/* Top KPIs */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "12px", marginBottom: "24px" }}>
            <KpiCard title="💰 Ingresos" value={fmt(stats.total_ingresos)} bg="dark" color="#2ecc71" />
            <KpiCard title="📉 Gastos" value={fmt(stats.total_gastos)} bg="dark" color="#e74c3c" />
            <KpiCard title="📊 Neto flujo" value={fmt(stats.neto_flujo)} bg="dark"
              color={stats.neto_flujo >= 0 ? "#2ecc71" : "#e74c3c"} />
            <KpiCard title="🎫 Ticket promedio" value={fmt(stats.ticket_promedio)} />
            <KpiCard title="👤 Clientes nuevos" value={nm(stats.nuevos_clientes)} />
          </div>

          {/* Groups */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "12px", marginBottom: "24px" }}>
            <KpiGroup title="🛒 Compras" data={stats.compras}
              keys={["total", "pagadas", "pendientes"]}
              labels={["Hechas", "Pagadas", "Pendientes"]}
              colors={["#1a1a2e", "#27ae60", "#e74c3c"]} />
            <KpiGroup title="📦 Ventas" data={stats.ventas}
              keys={["total", "cobradas", "pendientes"]}
              labels={["Hechas", "Cobradas", "Pendientes"]}
              colors={["#1a1a2e", "#27ae60", "#e74c3c"]} />
            <KpiGroup title="🚚 Entregas" data={stats.entregas}
              keys={["total", "realizadas", "pendientes"]}
              labels={["Totales", "Realizadas", "Pendientes"]}
              colors={["#1a1a2e", "#27ae60", "#e74c3c"]} />
            {/* Diseños as separate mini cards since KpiBlock only has total */}
            <div style={{ background: "#fff", borderRadius: "12px", padding: "16px", border: "1px solid #eee" }}>
              <h4 style={{ margin: "0 0 12px", fontSize: "15px", color: "#1a1a2e" }}>🎨 Diseños</h4>
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <MiniCard label="Totales" value={nm(stats.disenos.total)} />
                <MiniCard label="Realizados" value={nm(stats.disenos.realizados)} color="#27ae60" />
                <MiniCard label="En producción" value={nm(stats.disenos.en_produccion)} color="#e67e22" />
              </div>
            </div>
          </div>

          {/* Top product */}
          {stats.producto_mas_vendido && (
            <div style={{ background: "#fff", borderRadius: "12px", padding: "16px", border: "1px solid #eee", marginBottom: "16px" }}>
              <h4 style={{ margin: "0 0 8px", fontSize: "15px", color: "#1a1a2e" }}>🏆 Producto más vendido</h4>
              <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
                <MiniCard label="Producto" value={stats.producto_mas_vendido.product_name} />
                <MiniCard label="Cantidad" value={nm(stats.producto_mas_vendido.cantidad)} color="#6c63ff" />
                <MiniCard label="Ingreso" value={fmt(stats.producto_mas_vendido.ingreso)} color="#27ae60" />
              </div>
            </div>
          )}

          {/* Top 5 */}
          {stats.top5_productos?.length > 0 && (
            <div style={{ background: "#fff", borderRadius: "12px", padding: "16px", border: "1px solid #eee", marginBottom: "16px" }}>
              <h4 style={{ margin: "0 0 12px", fontSize: "15px", color: "#1a1a2e" }}>📈 Top 5 productos</h4>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #eee" }}>
                    <th style={{ textAlign: "left", padding: "8px 4px" }}>#</th>
                    <th style={{ textAlign: "left", padding: "8px 4px" }}>Producto</th>
                    <th style={{ textAlign: "right", padding: "8px 4px" }}>Cant.</th>
                    <th style={{ textAlign: "right", padding: "8px 4px" }}>Ingreso</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.top5_productos.map((p, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #f5f5f5" }}>
                      <td style={{ padding: "8px 4px", color: "#888" }}>{i + 1}</td>
                      <td style={{ padding: "8px 4px", fontWeight: 500 }}>{p.product_name}</td>
                      <td style={{ padding: "8px 4px", textAlign: "right" }}>{nm(p.cantidad)}</td>
                      <td style={{ padding: "8px 4px", textAlign: "right", color: "#27ae60" }}>{fmt(p.ingreso)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Ventas por hora */}
          {stats.ventas_por_hora?.length > 0 && (
            <div style={{ background: "#fff", borderRadius: "12px", padding: "16px", border: "1px solid #eee" }}>
              <h4 style={{ margin: "0 0 4px", fontSize: "15px", color: "#1a1a2e" }}>⏰ Ventas por hora (últimos 7 días)</h4>
              <BarChart data={stats.ventas_por_hora} labelKey="hora" valueKey="cantidad" color="#6c63ff" />
              <div style={{ fontSize: "11px", color: "#888", textAlign: "center", marginTop: "4px" }}>
                Más actividad: {stats.ventas_por_hora.reduce((a, b) => b.cantidad > (a?.cantidad || 0) ? b : a)?.hora || "-"}:00hs
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
