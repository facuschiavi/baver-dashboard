import type { Client, Order, Product } from "./types";

const API = process.env.NEXT_PUBLIC_API_URL || "/api";

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

export async function fetchJson<T>(path: string, includeDiscontinued = false): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (includeDiscontinued) headers["X-Include-Discontinued"] = "1";

  const url = includeDiscontinued && !path.includes('?') ? `${API}${path}?include_discontinued=true` : `${API}${path}`;
  const response = await fetch(url, {
    cache: "no-store",
    headers,
  });

  if (response.status === 401) {
    localStorage.removeItem("token");
    if (typeof window !== "undefined") window.location.reload();
    throw new Error("Sesión expirada");
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const err = new Error(`Error cargando ${path}`);
    (err as any).body = body;
    (err as any).status = response.status;
    throw err;
  }

  return response.json();
}

export async function postJson<T>(path: string, body: unknown): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const response = await fetch(`${API}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (response.status === 401) {
    localStorage.removeItem("token");
    if (typeof window !== "undefined") window.location.reload();
    throw new Error("Sesión expirada");
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const err = new Error(`Error enviando ${path}`);
    (err as any).body = body;
    (err as any).status = response.status;
    throw err;
  }

  return response.json();
}

export async function putJson<T>(path: string, body: unknown): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const response = await fetch(`${API}${path}`, {
    method: "PUT",
    headers,
    body: JSON.stringify(body),
  });

  if (response.status === 401) {
    localStorage.removeItem("token");
    if (typeof window !== "undefined") window.location.reload();
    throw new Error("Sesión expirada");
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const err = new Error(`Error actualizando ${path}`);
    (err as any).body = body;
    (err as any).status = response.status;
    throw err;
  }

  return response.json();
}

export async function deleteJson<T>(path: string): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const response = await fetch(`${API}${path}`, {
    method: "DELETE",
    headers,
  });

  if (response.status === 401) {
    localStorage.removeItem("token");
    if (typeof window !== "undefined") window.location.reload();
    throw new Error("Sesión expirada");
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const err = new Error(`Error eliminando ${path}`);
    (err as any).body = body;
    (err as any).status = response.status;
    throw err;
  }

  return response.json();
}

export function money(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export function formatDate(value: string) {
  return new Date(value).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateInput(value?: string) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

export function getOrderItems(order: Order) {
  return order.items
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function findClient(clients: Client[], order: Order) {
  return clients.find(
    (client) => client.id === order.client_id || client.name === order.client_name
  );
}
export function getCategories(products: Product[]) {
  return Array.from(
    new Set(products.map((product) => product.category_name).filter(Boolean))
  ).sort();
}
