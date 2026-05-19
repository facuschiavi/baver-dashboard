"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function LogoutPage() {
  const router = useRouter();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          router.push("/login");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [router]);

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
      color: "#fff",
      fontFamily: "system-ui, sans-serif",
      padding: "20px"
    }}>
      <div style={{
        background: "rgba(255,255,255,0.1)",
        borderRadius: "24px",
        padding: "48px 40px",
        textAlign: "center",
        maxWidth: "420px",
        width: "100%",
        backdropFilter: "blur(10px)",
        border: "1px solid rgba(255,255,255,0.2)"
      }}>
        <div style={{ fontSize: "64px", marginBottom: "24px" }}>👋</div>

        <h1 style={{
          fontSize: "28px",
          fontWeight: 700,
          marginBottom: "16px",
          color: "#fff"
        }}>
          ¡Hasta luego!
        </h1>

        <p style={{
          fontSize: "16px",
          color: "rgba(255,255,255,0.8)",
          marginBottom: "32px",
          lineHeight: 1.6
        }}>
          Tu sesión ha sido cerrada correctamente.
          <br />¡Te esperamos pronto!
        </p>

        <div style={{
          fontSize: "14px",
          color: "rgba(255,255,255,0.6)",
          marginBottom: "24px"
        }}>
          Redirigiendo en <strong style={{ color: "#6c63ff" }}>{countdown}</strong> segundos...
        </div>

        <button
          onClick={() => router.push("/login")}
          style={{
            padding: "14px 32px",
            borderRadius: "12px",
            border: "none",
            background: "#6c63ff",
            color: "#fff",
            fontSize: "15px",
            fontWeight: 700,
            cursor: "pointer",
            transition: "all 0.2s"
          }}
        >
          Ir al Login
        </button>
      </div>
    </div>
  );
}
