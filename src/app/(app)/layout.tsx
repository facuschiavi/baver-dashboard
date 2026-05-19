"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "../components/shared/AppShell";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
    }
    setMounted(true);
  }, [router]);

  if (!mounted) return null;

  return <AppShell>{children}</AppShell>;
}
