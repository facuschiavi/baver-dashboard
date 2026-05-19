"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  label: string;
  icon: string;
  href: string;
};

type NavSection = {
  title: string;
  items: NavItem[];
};

const NAV_STRUCTURE: NavSection[] = [
  {
    title: "MIS DATOS",
    items: [
      { label: "Inicio", icon: "🏠", href: "/inicio" },
      { label: "Mi Negocio", icon: "🏪", href: "/negocio" },
      { label: "Mis Agentes", icon: "🤖", href: "/agentes" },
      { label: "Parámetros", icon: "⚙️", href: "/parametros" },
      { label: "Integraciones", icon: "🔌", href: "/integraciones" },
    ],
  },
  {
    title: "GESTIÓN",
    items: [
      { label: "Productos", icon: "📦", href: "/productos" },
      { label: "Servicios", icon: "🛠️", href: "/servicios" },
      { label: "Planes", icon: "📋", href: "/planes" },
      { label: "Leads", icon: "📍", href: "/leads" },
      { label: "Contactos", icon: "👥", href: "/contactos" },
      { label: "Entidades", icon: "🏢", href: "/entidades" },
      { label: "Proveedores", icon: "🏭", href: "/proveedores" },
    ],
  },
  {
    title: "OPERACIÓN",
    items: [
      { label: "Estadísticas", icon: "📊", href: "/estadisticas" },
      { label: "Ventas", icon: "🧾", href: "/ventas" },
      { label: "Suscripciones", icon: "🔄", href: "/suscripciones" },
      { label: "O. Trabajo", icon: "🔧", href: "/ordenes-trabajo" },
      { label: "Presupuestos", icon: "📄", href: "/presupuestos" },
      { label: "Cobros", icon: "💰", href: "/cobros" },
      { label: "Compras", icon: "📥", href: "/compras" },
      { label: "Gastos", icon: "🧾", href: "/gastos" },
      { label: "Pagos", icon: "💸", href: "/pagos" },
      { label: "Entregas", icon: "🚚", href: "/entregas" },
      { label: "Anticipos", icon: "💳", href: "/anticipos" },
      { label: "Diseño", icon: "🎨", href: "/diseno" },
      { label: "Fabricación", icon: "🏭", href: "/fabricacion" },
      { label: "Producción", icon: "📋", href: "/produccion" },
    ],
  },
];

export default function Sidebar({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();

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
          {NAV_STRUCTURE.map((section) => (
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
