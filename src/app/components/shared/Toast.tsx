"use client";

import { useEffect, useState } from "react";

type ToastProps = {
  message: string;
  type: "success" | "error" | "info";
  onClose: () => void;
};

export default function Toast({ message, type, onClose }: ToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 300);
    }, 3500);
    return () => clearTimeout(timer);
  }, [onClose]);

  const colors = {
    success: { bg: "#27ae60", icon: "✓" },
    error: { bg: "#e74c3c", icon: "✗" },
    info: { bg: "#3498db", icon: "ℹ" },
  };

  const c = colors[type];

  return (
    <div
      style={{
        position: "fixed",
        bottom: "24px",
        right: "24px",
        background: c.bg,
        color: "#fff",
        padding: "12px 20px",
        borderRadius: "10px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
        fontSize: "14px",
        fontWeight: 600,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        gap: "10px",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(20px)",
        transition: "opacity 0.3s, transform 0.3s",
        maxWidth: "400px",
      }}
    >
      <span>{c.icon}</span>
      <span>{message}</span>
      <button
        onClick={() => { setVisible(false); setTimeout(onClose, 300); }}
        style={{
          background: "rgba(255,255,255,0.2)",
          border: "none",
          color: "#fff",
          borderRadius: "50%",
          width: "22px",
          height: "22px",
          fontSize: "12px",
          cursor: "pointer",
          marginLeft: "8px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        ✕
      </button>
    </div>
  );
}
