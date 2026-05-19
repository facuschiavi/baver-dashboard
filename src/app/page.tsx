"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HomeRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    router.replace(token ? "/inicio" : "/login");
  }, [router]);

  return null;
}
