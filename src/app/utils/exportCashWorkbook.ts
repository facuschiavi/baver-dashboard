import * as XLSX from "xlsx";
import { fetchJson } from "../lib";

type Period = "today" | "week" | "month" | "custom";

function buildQuery(base: string, period: Period, customFrom?: string, customTo?: string) {
  const params = new URLSearchParams();
  params.set("period", period);
  if (period === "custom" && customFrom && customTo) {
    params.set("from", customFrom);
    params.set("to", customTo);
    params.set("date_from", customFrom);
    params.set("date_to", customTo);
  }
  return `${base}${base.includes("?") ? "&" : "?"}${params.toString()}`;
}

function dtParts(v: any) {
  const d = new Date(v);
  return {
    fecha: isNaN(d.getTime()) ? "-" : d.toLocaleDateString("es-AR"),
    hora: isNaN(d.getTime()) ? "-" : d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    fechaHora: isNaN(d.getTime()) ? "-" : d.toLocaleString("es-AR"),
    sort: isNaN(d.getTime()) ? 0 : d.getTime(),
  };
}

function normalizeCobro(r: any) {
  const dt = dtParts(r.created_at);
  return {
    ID: r.id ?? "",
    Fecha: dt.fecha,
    Hora: dt.hora,
    FechaHora: dt.fechaHora,
    Tipo: "Cobro",
    Monto: Number(r.amount ?? 0),
    Ingreso: Number(r.amount ?? 0),
    Egreso: 0,
    Neto: Number(r.amount ?? 0),
    MetodoCuenta: r.account_name ?? r.financial_account_name ?? "-",
    Cliente: r.client_name ?? "-",
    Proveedor: "-",
    Tercero: r.client_name ?? "-",
    Referencia: r.order_number ? `NV ${r.order_number}` : (r.reason ?? "-"),
    NV: r.order_number ?? "-",
    NP: "-",
    Motivo: r.reason ?? "-",
    Modulo: "Cobros",
    Usuario: r.created_by_name ?? r.user_name ?? "-",
    Notas: r.notes ?? "",
    order_id: r.order_id ?? "",
    purchase_order_id: "",
    client_id: r.client_id ?? "",
    supplier_id: "",
    advance_id: r.advance_id ?? "",
    account_id: r.financial_account_id ?? "",
    session_id: r.session_id ?? "",
    _sort: dt.sort,
  };
}

function normalizePago(r: any) {
  const dt = dtParts(r.created_at);
  const supplier = r.supplier_name ?? r.provider_name ?? "-";
  return {
    ID: r.id ?? "",
    Fecha: dt.fecha,
    Hora: dt.hora,
    FechaHora: dt.fechaHora,
    Tipo: "Pago",
    Monto: Number(r.amount ?? 0),
    Ingreso: 0,
    Egreso: Number(r.amount ?? 0),
    Neto: -Number(r.amount ?? 0),
    MetodoCuenta: r.account_name ?? r.financial_account_name ?? "-",
    Cliente: "-",
    Proveedor: supplier,
    Tercero: supplier,
    Referencia: r.order_number ? `NP ${r.order_number}` : (r.reason ?? "-"),
    NV: "-",
    NP: r.order_number ?? "-",
    Motivo: r.reason ?? "-",
    Modulo: "Pagos",
    Usuario: r.created_by_name ?? r.user_name ?? "-",
    Notas: r.notes ?? "",
    order_id: "",
    purchase_order_id: r.purchase_order_id ?? "",
    client_id: "",
    supplier_id: r.supplier_id ?? "",
    advance_id: r.advance_id ?? "",
    account_id: r.financial_account_id ?? "",
    session_id: r.session_id ?? "",
    _sort: dt.sort,
  };
}

export async function exportCashWorkbook(opts: {
  source: "cobros" | "pagos";
  currentRows: any[];
  period: Period;
  customFrom?: string;
  customTo?: string;
}) {
  const { source, currentRows, period, customFrom, customTo } = opts;

  const cobros = source === "cobros"
    ? currentRows
    : await fetchJson<any[]>(buildQuery("/cash-movements?type=in", period, customFrom, customTo));

  const pagos = source === "pagos"
    ? currentRows
    : await fetchJson<any[]>(buildQuery("/payment-movements", period, customFrom, customTo));

  const cobrosRows = cobros.map(normalizeCobro).map(({ _sort, ...x }) => x);
  const pagosRows = pagos.map(normalizePago).map(({ _sort, ...x }) => x);
  const movimientos = [...cobros.map(normalizeCobro), ...pagos.map(normalizePago)]
    .sort((a, b) => a._sort - b._sort)
    .map(({ _sort, ...x }) => x);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(cobrosRows), "Cobros");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(pagosRows), "Pagos");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(movimientos), "Movimientos");

  const from = customFrom || period;
  const to = customTo || period;
  XLSX.writeFile(wb, `Movimientos_${from}_${to}.xlsx`);
}
