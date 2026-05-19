"use client";

import React from "react";

// ─── Card ─────────────────────────────────────────────────────────
export function Card({ children, style, onClick }: { children: React.ReactNode; style?: React.CSSProperties; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: "#fff",
        borderRadius: "12px",
        padding: "20px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ─── Card Header ────────────────────────────────────────────────
export function CardHeader({ title, action, children }: { title?: React.ReactNode; action?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "16px",
      }}
    >
      <h2 style={{ fontSize: "16px", fontWeight: 700, margin: 0, color: "#333" }}>{title ?? children}</h2>
      {action}
    </div>
  );
}

// ─── IconButton ──────────────────────────────────────────────────
type IconButtonVariant = "primary" | "secondary" | "danger" | "ghost";

export function IconButton({
  children,
  onClick,
  variant = "secondary",
  title,
  disabled,
  style,
}: {
  children: React.ReactNode;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  variant?: IconButtonVariant;
  title?: string;
  disabled?: boolean;
  style?: React.CSSProperties;
}) {
  const styles: Record<IconButtonVariant, React.CSSProperties> = {
    primary: { background: "#6c63ff", color: "#fff", border: "none" },
    secondary: { background: "#f0f0f0", color: "#333", border: "none" },
    danger: { background: "#fee", color: "#e74c3c", border: "none" },
    ghost: { background: "transparent", color: "#888", border: "1px solid #eee" },
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        width: "34px",
        height: "34px",
        borderRadius: "8px",
        fontSize: "16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.4 : 1,
        ...styles[variant],
        ...style,
      }}
    >
      {children}
    </button>
  );
}

// ─── Button ────────────────────────────────────────────────────
export function Button({
  children,
  onClick,
  variant = "primary",
  disabled,
  style,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
  style?: React.CSSProperties;
}) {
  const colors = {
    primary: { bg: "#6c63ff", color: "#fff" },
    secondary: { bg: "#f0f0f0", color: "#333" },
    danger: { bg: "#e74c3c", color: "#fff" },
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "8px 16px",
        borderRadius: "8px",
        border: "none",
        fontSize: "13px",
        fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer",
        background: disabled ? "#ccc" : colors[variant].bg,
        color: colors[variant].color,
        opacity: disabled ? 0.7 : 1,
        ...style,
      }}
    >
      {children}
    </button>
  );
}

// ─── Input ──────────────────────────────────────────────────────
export function Input({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  style,
  disabled = false,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
}) {
  return (
    <div style={{ marginBottom: "12px" }}>
      {label && (
        <label style={{ fontSize: "13px", fontWeight: 600, display: "block", marginBottom: "4px", color: "#555" }}>
          {label}
        </label>
      )}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        style={{
          width: "100%",
          padding: "8px 12px",
          border: "1px solid #ddd",
          borderRadius: "8px",
          fontSize: "14px",
          boxSizing: "border-box",
          ...(disabled ? { background: "#f5f5f5", color: "#888", cursor: "not-allowed" } : {}),
          ...style,
        }}
      />
    </div>
  );
}

// ─── Select ─────────────────────────────────────────────────────
export function Select({
  label,
  value,
  onChange,
  options,
  style,
  disabled,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  style?: React.CSSProperties;
  disabled?: boolean;
}) {
  return (
    <div style={{ marginBottom: "12px" }}>
      {label && (
        <label style={{ fontSize: "13px", fontWeight: 600, display: "block", marginBottom: "4px", color: "#555" }}>
          {label}
        </label>
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        style={{
          width: "100%",
          padding: "8px 12px",
          border: "1px solid #ddd",
          borderRadius: "8px",
          fontSize: "14px",
          boxSizing: "border-box",
          background: "#fff",
          ...(disabled ? { background: "#f5f5f5", color: "#888", cursor: "not-allowed" } : {}),
          ...style,
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// ─── Badge ─────────────────────────────────────────────────────
export function Badge({ children, color = "#6c63ff" }: { children: React.ReactNode; color?: string }) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: "12px",
        fontSize: "11px",
        fontWeight: 600,
        background: color + "22",
        color: color,
      }}
    >
      {children}
    </span>
  );
}

// ─── Page Title ─────────────────────────────────────────────────
export function PageTitle({ title, children }: { title?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <h1
      style={{
        fontSize: "22px",
        fontWeight: 700,
        marginBottom: "20px",
        color: "#1a1a2e",
      }}
    >
      {title ?? children}
    </h1>
  );
}

// ─── Loading ────────────────────────────────────────────────────
export function Loading() {
  return (
    <div style={{ textAlign: "center", padding: "40px", color: "#888" }}>
      Cargando...
    </div>
  );
}

// ─── Empty ──────────────────────────────────────────────────────
export function Empty({ message }: { message: string }) {
  return (
    <div
      style={{
        textAlign: "center",
        padding: "40px",
        color: "#aaa",
        fontSize: "14px",
      }}
    >
      {message}
    </div>
  );
}
