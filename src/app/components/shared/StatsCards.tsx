"use client";
import { useEffect, useState } from "react";
import { fetchJson } from "../../lib";

type Period = "today" | "week" | "month";

type Props = {
  apiPath: string;
  stats: Record<string, any>;
  setStats: (s: any) => void;
  period: Period;
  setPeriod: (p: Period) => void;
};

export default function StatsCards({ apiPath, stats, setStats, period, setPeriod }: Props) {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetchJson(apiPath + "?period=" + period)
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [period, apiPath]);

  if (loading) return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "10px", marginBottom: "16px" }}>
      {[1,2,3,4].map(i => (
        <div key={i} style={{ background: "#f5f5f5", borderRadius: "12px", padding: "14px", height: "70px", animation: "pulse 1.5s infinite" }} />
      ))}
    </div>
  );

  if (!stats) return null;

  return (
    <>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "10px", marginBottom: "12px" }}>
        {Object.entries(stats).filter(([k]) => k !== 'by_day' && k !== 'sources').map(([key, value]) => {
          if (value === null || value === undefined) return null;
          const label = key.replace(/_/g, " ").replace(/([A-Z])/g, " $1").trim();
          const isNum = typeof value === "number";
          const isObj = !isNum;
          if (isObj) return null;
          const color = key.includes("pending") || key.includes("lost") || key.includes("low") ? "#e74c3c"
            : key.includes("collected") || key.includes("converted") || key.includes("value") ? "#27ae60"
            : "#1a1a2e";
          return (
            <div key={key} style={{ background: key === "total" || key.includes("revenue") || key.includes("value") || key.includes("count") ? "#1a1a2e" : "#fff", borderRadius: "12px", padding: "14px", border: key === "total" || key.includes("revenue") ? "none" : "1px solid #eee" }}>
              <div style={{ fontSize: "11px", color: key === "total" || key.includes("revenue") ? "#aaa" : "#888", marginBottom: "4px", textTransform: "capitalize" }}>{label}</div>
              <div style={{ fontSize: "20px", fontWeight: 800, color: key === "total" || key.includes("revenue") || key.includes("value") ? "#fff" : color }}>
                {key.includes("rate") ? value + "%" : key.includes("value") || key.includes("revenue") ? "$" + Number(value).toLocaleString("es-AR") : Number(value).toLocaleString("es-AR")}
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: "4px", background: "#f0f0f0", padding: "3px", borderRadius: "8px", marginBottom: "12px", width: "fit-content" }}>
        {(["today", "week", "month"] as Period[]).map(p => (
          <button key={p} onClick={() => setPeriod(p)}
            style={{ padding: "5px 12px", borderRadius: "6px", border: "none", background: period === p ? "#1a1a2e" : "transparent", color: period === p ? "#fff" : "#666", cursor: "pointer", fontSize: "12px", fontWeight: 700 }}>
            {p === "today" ? "Hoy" : p === "week" ? "Semana" : "Mes"}
          </button>
        ))}
      </div>
    </>
  );
}
