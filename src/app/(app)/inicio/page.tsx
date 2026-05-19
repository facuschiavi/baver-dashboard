"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { fetchJson } from "../../lib";
import { Loading } from "../../components/shared/UI";

type MiniSummary = {
  saldo_caja: number;
  ventas_hoy: number;
  cobros_hoy: number;
  ot_pendientes: number;
  suscripciones_vencer: number;
  entregas_pendientes: number;
};

const cardStyle: React.CSSProperties = {
  background: "var(--bg-secondary)",
  borderRadius: "16px",
  padding: "20px",
  border: "1px solid var(--border-color)",
};

export default function HomePage() {
  const router = useRouter();
  const [data, setData] = useState<MiniSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetchJson<MiniSummary>("/dashboard/mini-summary");
      setData(res);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <Loading />;

  const now = new Date();
  const dayName = now.toLocaleDateString("es-AR", { weekday: "long" });
  const dateStr = now.toLocaleDateString("es-AR", {
    day: "numeric", month: "long", year: "numeric",
  });

  const formatMoney = (n: number) =>
    "$" + Math.round(n).toLocaleString("es-AR");

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: "32px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
          Panel de control
        </h1>
        <p style={{ fontSize: "13px", color: "var(--text-secondary)", margin: "6px 0 0", textTransform: "capitalize" }}>
          {dayName}, {dateStr}
        </p>
      </div>

      {/* KPI row — saldo grande a la izquierda, métricas chicas a la derecha */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "16px", marginBottom: "32px" }}>
        {/* Saldo — card grande */}
        <div style={{
          ...cardStyle,
          display: "flex", flexDirection: "column", justifyContent: "center",
          background: "var(--bg-card)",
        }}>
          <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "8px", fontWeight: 600, letterSpacing: "0.5px" }}>
            SALDO DE CAJA
          </div>
          <div style={{ fontSize: "36px", fontWeight: 800, color: "var(--text-primary)", marginBottom: "4px" }}>
            {formatMoney(data?.saldo_caja ?? 0)}
          </div>
          <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
            Disponible en efectivo y bancos
          </div>
        </div>

        {/* Métricas chicas — grid 3x2 */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
          <KpiCard
            label="Ventas hoy"
            value={formatMoney(data?.ventas_hoy ?? 0)}
            trend={data?.ventas_hoy ?? 0 > 0 ? "up" : "neutral"}
            icon="🧾"
          />
          <KpiCard
            label="Cobros hoy"
            value={formatMoney(data?.cobros_hoy ?? 0)}
            trend="neutral"
            icon="💰"
          />
          <KpiCard
            label="OT pendientes"
            value={String(data?.ot_pendientes ?? 0)}
            alert={(data?.ot_pendientes ?? 0) > 0}
            icon="🔧"
          />
          <KpiCard
            label="Suscr. por vencer"
            value={String(data?.suscripciones_vencer ?? 0)}
            alert={(data?.suscripciones_vencer ?? 0) > 0}
            icon="🔄"
          />
          <KpiCard
            label="Entregas pend."
            value={String(data?.entregas_pendientes ?? 0)}
            alert={(data?.entregas_pendientes ?? 0) > 0}
            icon="🚚"
          />
          <KpiCard
            label="Clientes activos"
            value="—"
            trend="neutral"
            icon="👥"
          />
        </div>
      </div>

      {/* Accesos — mismos destinos del sidebar, organizados por intención */}
      <div style={{ ...cardStyle, marginBottom: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "18px" }}>
          <div>
            <h2 style={{ fontSize: "12px", fontWeight: 700, margin: 0, color: "var(--text-secondary)", letterSpacing: "1px" }}>
              ACCESOS DEL SISTEMA
            </h2>
            <p style={{ fontSize: "12px", color: "var(--text-secondary)", margin: "5px 0 0" }}>
              Atajos ordenados para operar sin abrir el menú lateral.
            </p>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "16px" }}>
          <ActionSection title="Operación" items={[
            ["📊", "Estadísticas", "/estadisticas"],
            ["🧾", "Ventas", "/ventas"],
            ["🔄", "Suscripciones", "/suscripciones"],
            ["🔧", "O. Trabajo", "/ordenes-trabajo"],
            ["📄", "Presupuestos", "/presupuestos"],
            ["💰", "Cobros", "/cobros"],
            ["📥", "Compras", "/compras"],
            ["🧾", "Gastos", "/gastos"],
            ["💸", "Pagos", "/pagos"],
            ["🚚", "Entregas", "/entregas"],
            ["💳", "Anticipos", "/anticipos"],
          ]} onGo={router.push} />

          <ActionSection title="Gestión" items={[
            ["📦", "Productos", "/productos"],
            ["🛠️", "Servicios", "/servicios"],
            ["📋", "Planes", "/planes"],
            ["📍", "Leads", "/leads"],
            ["👥", "Contactos", "/contactos"],
            ["🏢", "Entidades", "/entidades"],
            ["🏭", "Proveedores", "/proveedores"],
          ]} onGo={router.push} />

          <ActionSection title="Mi negocio" items={[
            ["🏪", "Mi Negocio", "/negocio"],
            ["🤖", "Mis Agentes", "/agentes"],
            ["⚙️", "Parámetros", "/parametros"],
            ["🔌", "Integraciones", "/integraciones"],
            ["🎨", "Diseño", "/diseno"],
            ["🏭", "Fabricación", "/fabricacion"],
            ["📋", "Producción", "/produccion"],
          ]} onGo={router.push} />
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value, icon, trend, alert: isAlert }: {
  label: string;
  value: string;
  icon: string;
  trend?: "up" | "down" | "neutral";
  alert?: boolean;
}) {
  const borderColor = isAlert ? "1px solid rgba(239, 68, 68, 0.3)" : "1px solid var(--border-color)";
  const accentColor = isAlert ? "#ef4444" : trend === "up" ? "#22c55e" : "var(--text-secondary)";

  return (
    <div style={{
      ...cardStyle,
      display: "flex", flexDirection: "column",
      border: borderColor,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
        <span style={{ fontSize: "11px", color: "var(--text-secondary)", fontWeight: 600, letterSpacing: "0.3px" }}>
          {label.toUpperCase()}
        </span>
        <span style={{ fontSize: "16px" }}>{icon}</span>
      </div>
      <div style={{ fontSize: "22px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "2px" }}>
        {value}
      </div>
      {trend && (
        <span style={{ fontSize: "11px", color: accentColor }}>
          {trend === "up" ? "↑ Con movimiento" : trend === "down" ? "↓" : "—"}
        </span>
      )}
      {isAlert && (
        <span style={{ fontSize: "11px", color: "#ef4444" }}>
          ⚠ Requiere atención
        </span>
      )}
    </div>
  );
}

function ActionSection({ title, items, onGo }: {
  title: string;
  items: [string, string, string][];
  onGo: (href: string) => void;
}) {
  return (
    <div style={{
      background: "var(--bg-input)",
      border: "1px solid var(--border-color)",
      borderRadius: "14px",
      padding: "14px",
    }}>
      <div style={{ fontSize: "12px", fontWeight: 800, color: "var(--text-secondary)", marginBottom: "10px", letterSpacing: "0.4px" }}>
        {title.toUpperCase()}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(118px, 1fr))", gap: "8px" }}>
        {items.map(([icon, label, href]) => (
          <ActionButton key={href} icon={icon} label={label} onClick={() => onGo(href)} />
        ))}
      </div>
    </div>
  );
}

function ActionButton({ icon, label, onClick }: {
  icon: string; label: string; onClick: () => void;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        minHeight: "46px",
        display: "flex", alignItems: "center", gap: "8px",
        padding: "10px 11px", borderRadius: "10px",
        background: hover ? "var(--accent)" : "transparent",
        color: hover ? "#fff" : "var(--text-primary)",
        border: hover ? "1px solid var(--accent)" : "1px solid var(--border-color)",
        cursor: "pointer", fontSize: "12px", fontWeight: 650,
        transition: "all 0.15s ease",
        textAlign: "left",
      }}
    >
      <span style={{ fontSize: "15px", width: "18px", flexShrink: 0 }}>{icon}</span>
      <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</span>
    </button>
  );
}
