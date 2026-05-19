"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { fetchJson } from "../../lib";

type ModuleKey = "base" | "retail" | "subscriptions" | "workshop" | "budgets" | "integrations" | "notifications";

type NavItem = {
  label: string;
  icon: string;
  href: string;
  moduleKey: ModuleKey;
};

type NavSection = {
  title: string;
  items: NavItem[];
};

type ClientModulesResponse = {
  modules: Record<ModuleKey, boolean>;
};

const NAV_STRUCTURE: NavSection[] = [
  {
    title: "MIS DATOS",
    items: [
      { label: "Inicio", icon: "🏠", href: "/inicio", moduleKey: "base" },
      { label: "Mi Negocio", icon: "🏪", href: "/negocio", moduleKey: "base" },
      { label: "Mis Agentes", icon: "🤖", href: "/agentes", moduleKey: "base" },
      { label: "Parámetros", icon: "⚙️", href: "/parametros", moduleKey: "base" },
      { label: "Integraciones", icon: "🔌", href: "/integraciones", moduleKey: "integrations" },
          { label: "Notificaciones", icon: "🔔", href: "/notificaciones", moduleKey: "notifications" },
    ],
  },
  {
    title: "GESTIÓN",
    items: [
      { label: "Productos", icon: "📦", href: "/productos", moduleKey: "retail" },
      { label: "Servicios", icon: "🛠️", href: "/servicios", moduleKey: "retail" },
      { label: "Planes", icon: "📋", href: "/planes", moduleKey: "subscriptions" },
      { label: "Leads", icon: "📍", href: "/leads", moduleKey: "base" },
      { label: "Contactos", icon: "👥", href: "/contactos", moduleKey: "base" },
      { label: "Entidades", icon: "🏢", href: "/entidades", moduleKey: "base" },
      { label: "Proveedores", icon: "🏭", href: "/proveedores", moduleKey: "retail" },
    ],
  },
  {
    title: "OPERACIÓN",
    items: [
      { label: "Estadísticas", icon: "📊", href: "/estadisticas", moduleKey: "base" },
      { label: "Ventas", icon: "🧾", href: "/ventas", moduleKey: "retail" },
      { label: "Facturación Electr.", icon: "🧾", href: "/facturacion", moduleKey: "retail" },
      { label: "Suscripciones", icon: "🔄", href: "/suscripciones", moduleKey: "subscriptions" },
      { label: "O. Trabajo", icon: "🔧", href: "/ordenes-trabajo", moduleKey: "base" },
      { label: "Presupuestos", icon: "📄", href: "/presupuestos", moduleKey: "budgets" },
      { label: "Cobros", icon: "💰", href: "/cobros", moduleKey: "retail" },
      { label: "Compras", icon: "📥", href: "/compras", moduleKey: "retail" },
      { label: "Gastos", icon: "🧾", href: "/gastos", moduleKey: "retail" },
      { label: "Pagos", icon: "💸", href: "/pagos", moduleKey: "retail" },
      { label: "Entregas", icon: "🚚", href: "/entregas", moduleKey: "retail" },
      { label: "Anticipos", icon: "💳", href: "/anticipos", moduleKey: "retail" },
      { label: "Diseño", icon: "🎨", href: "/diseno", moduleKey: "workshop" },
      { label: "Fabricación", icon: "🏭", href: "/fabricacion", moduleKey: "workshop" },
      { label: "Producción", icon: "📋", href: "/produccion", moduleKey: "workshop" },
    ],
  },
];

const DEFAULT_MODULES: Record<ModuleKey, boolean> = {
  base: true,
  retail: true,
  subscriptions: true,
  workshop: true,
  notifications: true,
  budgets: true,
  integrations: true,
};

function isModuleVisible(modules: Record<ModuleKey, boolean>, moduleKey: ModuleKey) {
  if (moduleKey === "base") return true;
  if (moduleKey === "subscriptions" || moduleKey === "workshop" || moduleKey === "budgets") {
    return modules.retail !== false && modules[moduleKey] !== false;
  }
  return modules[moduleKey] !== false;
}

export default function Sidebar({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const [modules, setModules] = useState<Record<ModuleKey, boolean>>(DEFAULT_MODULES);

  useEffect(() => {
    let alive = true;
    fetchJson<ClientModulesResponse>("/client-modules")
      .then((data) => {
        if (alive && data?.modules) setModules({ ...DEFAULT_MODULES, ...data.modules, base: true });
      })
      .catch(() => {
        if (alive) setModules(DEFAULT_MODULES);
      });
    return () => { alive = false; };
  }, []);

  const visibleNav = useMemo(() => {
    return NAV_STRUCTURE.map((section) => ({
      ...section,
      items: section.items.filter((item) => isModuleVisible(modules, item.moduleKey)),
    })).filter((section) => section.items.length > 0);
  }, [modules]);

  return (
    <>
      {open && (
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 40,
          }}
          onClick={onClose}
        />
      )}

      <aside className="sidebar"
        style={{
          position: "fixed", top: 0, left: 0, height: "100vh", width: "260px",
          background: "#1a1a2e", color: "#fff", zIndex: 50,
          transform: open ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 0.25s ease",
          display: "flex", flexDirection: "column", overflowY: "auto",
        }}
      >
        <div style={{ padding: "20px 16px 16px", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
          <div style={{ fontSize: "18px", fontWeight: 700 }}>VIB3.ia</div>
          <div style={{ fontSize: "12px", opacity: 0.5 }}>Panel de control</div>
        </div>

        <nav style={{ flex: 1, padding: "8px 0" }}>
          {visibleNav.map((section) => (
            <div key={section.title} style={{ marginBottom: "8px" }}>
              <div style={{
                fontSize: "10px", fontWeight: 700, letterSpacing: "1px",
                opacity: 0.4, padding: "8px 16px 4px",
              }}>
                {section.title}
              </div>
              {section.items.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link key={item.href} href={item.href} onClick={onClose}
                    style={{
                      display: "flex", alignItems: "center", gap: "10px",
                      padding: "10px 16px", fontSize: "14px",
                      color: active ? "#fff" : "rgba(255,255,255,0.7)",
                      background: active ? "rgba(255,255,255,0.1)" : "transparent",
                      textDecoration: "none",
                      borderLeft: active ? "3px solid #6c63ff" : "3px solid transparent",
                    }}
                  >
                    <span style={{ fontSize: "16px" }}>{item.icon}</span>
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div style={{ padding: "16px", borderTop: "1px solid rgba(255,255,255,0.1)", fontSize: "12px", opacity: 0.4 }}>
          v0.1.0-alpha
        </div>
      </aside>
    </>
  );
}
