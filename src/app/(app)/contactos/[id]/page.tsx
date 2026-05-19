"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { fetchJson, postJson, putJson, deleteJson } from "../../../lib";
import { Card, IconButton, Loading, PageTitle, Input } from "../../../components/shared/UI";

type Contact = {
  id: number; name: string; phone: string; email: string; address: string;
  location: string; notes: string; whatsapp: string; instagram: string;
  tiktok: string; condicion_iva: string; cuit: string; calificacion: number;
  entity_name?: string;
};

type Order = {
  id: number; order_number: string; total: string; created_at: string;
  status_name: string; payment_status_name: string; paid_amount?: string; balance_due?: string;
};

type Payment = {
  id: number; amount: string; paid_at: string; payment_method_name: string;
  order_number: string;
};

type CashMovement = {
  id: number; amount: string; type: string; reason: string; notes: string;
  created_at: string; created_by_name: string;
};

type TopProduct = {
  product_id: number; product_name: string; total_qty: number; total_spent: string;
};

type TimelineEvent = {
  event_type: string; id: number; title: string; event_at: string;
  amount: string; status_name: string;
};

type ContactNote = {
  id: number; content: string; created_by_name: string; created_at: string;
};

type Stats = {
  total_orders: number; total_spent: number; total_paid: number;
  balance: number; avg_ticket: number; last_order_date: string;
  unique_products_bought: number;
};

export default function Contact360Page() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [contact, setContact] = useState<Contact | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [cashMovements, setCashMovements] = useState<CashMovement[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [notes, setNotes] = useState<ContactNote[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [billingCycles, setBillingCycles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"resumen"|"ordenes"|"pagos"|"timeline"|"notas"|"suscripciones">("resumen");

  // New note state
  const [newNote, setNewNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [editingNote, setEditingNote] = useState<{id: number; content: string} | null>(null);

  // New order modal state
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [newOrderContact, setNewOrderContact] = useState<Contact | null>(null);
  const [newOrderProducts, setNewOrderProducts] = useState<any[]>([]);
  const [newOrderItems, setNewOrderItems] = useState<{product_id: number; product_name: string; quantity: string; unit_price: string}[]>([]);
  const [newOrderTotal, setNewOrderTotal] = useState(0);
  const [savingOrder, setSavingOrder] = useState(false);

  // Pay modal
  const [showPayModal, setShowPayModal] = useState(false);
  const [payOrderIds, setPayOrderIds] = useState<number[]>([]);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("");
  const [payMethods, setPayMethods] = useState<{id: number; name: string}[]>([]);
  const [savingPay, setSavingPay] = useState(false);
  const [payError, setPayError] = useState("");

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  function load360() {
    setLoading(true);
    fetchJson<any>("/contacts/" + id + "/360")
      .then((data) => {
        setContact(data.contact);
        setOrders(data.orders || []);
        setPayments(data.payments || []);
        setCashMovements(data.cash_movements || []);
        setTopProducts(data.top_products || []);
        setTimeline(data.timeline || []);
        setNotes(data.notes || []);
        setStats(data.stats);
        setSubscriptions(data.subscriptions || []);
        setBillingCycles(data.billing_cycles || []);
      })
      .catch((e) => setError(e.message || "Error al cargar"))
      .finally(() => setLoading(false));
  }

  useEffect(() => { if (id) load360(); }, [id]);

  // Note handlers
  async function handleAddNote() {
    if (!newNote.trim()) return;
    setSavingNote(true);
    try {
      await postJson("/contacts/" + id + "/notes", { content: newNote });
      setNewNote("");
      await load360();
    } catch (e) { console.error(e); }
    setSavingNote(false);
  }

  async function handleUpdateNote(noteId: number, content: string) {
    try {
      await putJson("/contacts/" + id + "/notes/" + noteId, { content });
      setEditingNote(null);
      await load360();
    } catch (e) { console.error(e); }
  }

  async function handleDeleteNote(noteId: number) {
    if (!confirm("Eliminar nota?")) return;
    try {
      await deleteJson("/contacts/" + id + "/notes/" + noteId);
      await load360();
    } catch (e) { console.error(e); }
  }

  // Quick order
  async function openNewOrder() {
    try {
      const [contactData, productsData] = await Promise.all([
        fetchJson<any>("/contacts/" + id),
        fetchJson<any[]>("/products")
      ]);
      setNewOrderContact(contactData);
      setNewOrderProducts(productsData.filter((p: any) => !p.discontinued));
      setNewOrderItems([]);
      setNewOrderTotal(0);
      setShowNewOrder(true);
    } catch (e) { console.error(e); }
  }

  function addProductToOrder(product: any) {
    setNewOrderItems(prev => {
      const existing = prev.find(i => i.product_id === product.id);
      if (existing) {
        return prev.map(i => i.product_id === product.id
          ? { ...i, quantity: String(Number(i.quantity) + 1) }
          : i
        );
      }
      return [...prev, {
        product_id: product.id,
        product_name: product.name,
        quantity: "1",
        unit_price: String(product.price || 0)
      }];
    });
  }

  function removeOrderItem(idx: number) {
    setNewOrderItems(prev => prev.filter((_, i) => i !== idx));
  }

  function updateOrderItem(idx: number, field: string, value: string) {
    setNewOrderItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  }

  useEffect(() => {
    const total = newOrderItems.reduce((sum, item) => {
      return sum + (Number(item.quantity) || 0) * (Number(item.unit_price) || 0);
    }, 0);
    setNewOrderTotal(total);
  }, [newOrderItems]);

  async function handleCreateOrder() {
    if (newOrderItems.length === 0) return;
    setSavingOrder(true);
    try {
      const order = await postJson<any>("/orders", {
        contact_id: Number(id),
        items: newOrderItems.map(i => ({
          product_id: i.product_id,
          product_name: i.product_name,
          quantity: Number(i.quantity),
          unit_price: Number(i.unit_price),
          subtotal: Number(i.quantity) * Number(i.unit_price)
        })),
        subtotal: newOrderTotal,
        total: newOrderTotal
      });
      setShowNewOrder(false);
      load360();
    } catch (e) { console.error(e); }
    setSavingOrder(false);
  }

  // Quick payment
  async function openPayModal() {
    try {
      const methods = await fetchJson<any[]>("/payment-methods");
      setPayMethods(methods);
      setPayAmount("");
      setPayMethod("");
      setPayOrderIds([]);
      setPayError("");
      setShowPayModal(true);
    } catch (e) { console.error(e); }
  }

  async function handlePay() {
    if (payOrderIds.length === 0 || !payMethod || !payAmount) return;
    setSavingPay(true);
    setPayError("");
    try {
      const selectedOrders = orders
        .filter(o => payOrderIds.includes(o.id) && o.payment_status_name !== "Pagado")
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      let remaining = Number(payAmount);
      if (!remaining || remaining <= 0) throw new Error("Monto inválido");

      for (const order of selectedOrders) {
        if (remaining <= 0) break;
        const due = Number(order.balance_due ?? order.total ?? 0);
        if (!due || due <= 0) continue;
        const amount = Math.min(remaining, due);
        await postJson<any>("/orders/" + order.id + "/payments", {
          amount,
          payment_method_id: Number(payMethod)
        });
        remaining -= amount;
      }
      setShowPayModal(false);
      load360();
    } catch (e: any) {
      const msg = e?.message || "Error al procesar el pago";
      setPayError(msg);
      console.error(e);
    }
    setSavingPay(false);
  }

  const theme = typeof window !== "undefined"
    ? document.documentElement.getAttribute("data-theme")
    : null;
  const isDark = theme === "dark";
  const bg = isDark ? "#1a1a2e" : "#fff";
  const text = isDark ? "#e2e8f0" : "#333";
  const cardBg = isDark ? "#0f0f1e" : "#f8f9fa";
  const border = isDark ? "#2a2a3e" : "#e0e0e0";
  const muted = isDark ? "#8888aa" : "#888";

  function s(val: string | number) {
    const n = typeof val === "string" ? parseFloat(val) : val;
    return isNaN(n) ? "$0" : "$" + n.toLocaleString("es-AR", {minimumFractionDigits:2, maximumFractionDigits:2});
  }

  function f(date: string) {
    if (!date) return "-";
    return new Date(date).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
  }

  function fd(date: string) {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("es-AR");
  }

  if (loading) return <div style={{padding:"20px"}}><Loading /></div>;
  if (error) return <div style={{padding:"20px", color:"#e74c3c"}}>Error: {error}</div>;
  if (!contact) return <div style={{padding:"20px"}}>Contacto no encontrado</div>;

  const neg = stats && stats.balance < 0;
  const pos = stats && stats.balance > 0;

  const sectionTitle = { fontSize: "14px", fontWeight: 700, marginBottom: "12px", color: text };
  const th = { padding: "8px", fontSize: "12px", color: muted, whiteSpace: "nowrap" as const, borderBottom: "2px solid " + border, textAlign: "left" as const };
  const td = { padding: "8px", fontSize: "13px", borderBottom: "1px solid " + border };

  const btnPrimary = { padding: "8px 14px", borderRadius: "8px", border: "none", background: "#6c63ff", color: "#fff", cursor: "pointer", fontWeight: 600, fontSize: "13px" };
  const btnSecondary = { padding: "8px 14px", borderRadius: "8px", border: "1px solid " + border, background: "transparent", color: text, cursor: "pointer", fontWeight: 500, fontSize: "13px" };
  const inputStyle = { width: "100%", padding: "8px 10px", border: "1px solid " + border, borderRadius: "8px", fontSize: "13px", background: bg, color: text, boxSizing: "border-box" as const, marginBottom: "8px" };
  const iconBtn = { background: "none", border: "none", cursor: "pointer", fontSize: "16px", padding: "4px", opacity: .7 };

  function tabBtn(t: string, label: string) {
    const active = tab === t;
    return (
      <button key={t} onClick={() => setTab(t as any)}
        style={{
          padding: "8px 14px", borderRadius: "8px", border: "none", cursor: "pointer",
          fontWeight: active ? 700 : 400,
          background: active ? "#6c63ff" : cardBg,
          color: active ? "#fff" : text,
          fontSize: "13px", whiteSpace: "nowrap"
        }}>
        {label}
      </button>
    );
  }

  return (
    <div style={{padding: isMobile ? "12px" : "20px", maxWidth: "1200px", margin: "0 auto", color: text, background: bg, minHeight: "100vh"}}>
      {/* Back + Header */}
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"16px", gap:"12px", flexWrap:"wrap"}}>
        <div>
          <div style={{display:"flex", alignItems:"center", gap:"8px", marginBottom:"4px"}}>
            <IconButton variant="ghost" onClick={() => router.back()}>←</IconButton>
            <PageTitle>{contact.name}</PageTitle>
            {contact.entity_name && <span style={{fontSize:"11px", background:"#6c63ff22", color:"#6c63ff", padding:"2px 8px", borderRadius:"8px"}}>{contact.entity_name}</span>}
          </div>
          <div style={{display:"flex", flexWrap:"wrap", gap:"6px", fontSize:"13px", color: muted, marginLeft:"40px"}}>
            {contact.phone && <span>📞 {contact.phone}</span>}
            {contact.whatsapp && <span>💬 {contact.whatsapp}</span>}
            {contact.email && <span>✉️ {contact.email}</span>}
            {contact.location && <span>📍 {contact.location}</span>}
            {contact.address && <span>🏠 {contact.address}</span>}
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div style={{display:"flex", gap:"8px", marginBottom:"20px", flexWrap:"wrap"}}>
        <button onClick={openNewOrder} style={btnPrimary}>➕ Nueva venta</button>
        {stats && stats.balance > 0 && (
          <button onClick={() => openPayModal()} style={btnSecondary}>💳 Cobrar ${Number(stats.balance).toLocaleString("es-AR", {minimumFractionDigits:2, maximumFractionDigits:2})}</button>
        )}
      </div>

      {/* Stats cards */}
      {stats && (
        <div style={{display:"grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(auto-fit, minmax(140px, 1fr))", gap:"10px", marginBottom:"20px"}}>
          {[
            {label:"Órdenes", value: String(stats.total_orders)},
            {label:"Gastado", value: s(stats.total_spent)},
            {label:"Pagado", value: s(stats.total_paid)},
            {label:"Saldo", value: s(Math.abs(stats.balance)), color: neg ? "#e74c3c" : pos ? "#27ae60" : muted,
             prefix: neg ? "- " : pos ? "+ " : ""},
            {label:"Ticket prom.", value: s(stats.avg_ticket)},
            {label:"Prod. únicos", value: String(stats.unique_products_bought)},
            ...(stats.last_order_date ? [{label:"Últ. compra", value: fd(stats.last_order_date)}] : [])
          ].map(stat => (
            <div key={stat.label} style={{background: cardBg, borderRadius:"12px", padding:"12px", border:"1px solid " + border}}>
              <div style={{fontSize:"11px", color: muted, marginBottom:"4px"}}>{stat.label}</div>
              <div style={{fontSize: stat.label==="Órdenes"?"22px":"17px", fontWeight:800, color: stat.color || text}}>
                {(stat as any).prefix || ""}{stat.value}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Products más comprados */}
      {topProducts.length > 0 && (
        <Card style={{marginBottom:"16px"}}>
          <div style={sectionTitle}>🏆 Más comprados</div>
          <div style={{display:"flex", gap:"8px", flexWrap:"wrap"}}>
            {topProducts.map((p, i) => (
              <div key={p.product_id || i} style={{background: cardBg, borderRadius:"8px", padding:"8px 12px", fontSize:"12px", border:"1px solid " + border}}>
                <div style={{fontWeight:600, marginBottom:"2px"}}>{p.product_name}</div>
                <div style={{color: muted}}>{p.total_qty}x · {s(p.total_spent)}</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Tabs */}
      <div style={{display:"flex", gap:"6px", marginBottom:"16px", overflowX:"auto", paddingBottom:"4px"}}>
        {tabBtn("resumen", "📊 Resumen")}
        {tabBtn("ordenes", "📦 Órdenes (" + orders.length + ")")}
        {tabBtn("pagos", "💳 Pagos (" + payments.length + ")")}
        {tabBtn("timeline", "📋 Actividad (" + timeline.length + ")")}
        {tabBtn("notas", "📝 Notas (" + notes.length + ")")}
        {tabBtn("suscripciones", "🔄 Suscripciones (" + subscriptions.length + ")")}
      </div>

      {/* ── TAB CONTENT ── */}
      <Card>
        {/* RESUME - latest orders + top products + quick stats */}
        {tab === "resumen" && (
          <div>
            {orders.length === 0 && topProducts.length === 0 ? (
              <div style={{textAlign:"center", padding:"20px", color: muted}}>Sin actividad aún</div>
            ) : (
              <>
                {orders.length > 0 && (
                  <>
                    <div style={sectionTitle}>Últimas órdenes</div>
                    <div style={{overflowX:"auto", marginBottom:"16px"}}>
                      <table style={{width:"100%", borderCollapse:"collapse", fontSize:"13px"}}>
                        <thead>
                          <tr>
                            <th style={th}>N°</th>
                            <th style={th}>Total</th>
                            <th style={th}>Estado</th>
                            <th style={th}>Pago</th>
                            <th style={th}>Fecha</th>
                          </tr>
                        </thead>
                        <tbody>
                          {orders.slice(0, 5).map(o => (
                            <tr key={o.id}>
                              <td style={{...td, fontWeight:600}}>{o.order_number || "#" + o.id}</td>
                              <td style={{...td, fontWeight:700}}>{s(o.total)}</td>
                              <td style={td}>{o.status_name || "-"}</td>
                              <td style={td}>{o.payment_status_name || "-"}</td>
                              <td style={{...td, fontSize:"12px"}}>{fd(o.created_at)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
                {notes.length > 0 && (
                  <>
                    <div style={sectionTitle}>Últimas notas</div>
                    {notes.slice(0, 3).map(n => (
                      <div key={n.id} style={{padding:"8px 0", borderBottom:"1px solid " + border, fontSize:"13px"}}>
                        <div style={{marginBottom:"2px"}}>{n.content}</div>
                        <div style={{fontSize:"11px", color: muted}}>{n.created_by_name || "?"} · {f(n.created_at)}</div>
                      </div>
                    ))}
                  </>
                )}
              </>
            )}
          </div>
        )}

        {/* ORDERS */}
        {tab === "ordenes" && (
          orders.length === 0
            ? <div style={{textAlign:"center", padding:"20px", color: muted}}>Sin órdenes</div>
            : <div style={{overflowX:"auto"}}>
                <table style={{width:"100%", borderCollapse:"collapse", fontSize:"13px"}}>
                  <thead>
                    <tr>
                      <th style={th}>N°</th>
                      <th style={th}>Total</th>
                      <th style={th}>Estado</th>
                      <th style={th}>Pago</th>
                      <th style={th}>Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map(o => (
                      <tr key={o.id}>
                        <td style={{...td, fontWeight:600}}>{o.order_number || "#" + o.id}</td>
                        <td style={{...td, fontWeight:700}}>{s(o.total)}</td>
                        <td style={td}>{o.status_name || "-"}</td>
                        <td style={td}>{o.payment_status_name || "-"}</td>
                        <td style={{...td, fontSize:"12px"}}>{f(o.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
        )}

        {/* PAYMENTS */}
        {tab === "pagos" && (
          payments.length === 0
            ? <div style={{textAlign:"center", padding:"20px", color: muted}}>Sin pagos registrados</div>
            : <div style={{overflowX:"auto"}}>
                <table style={{width:"100%", borderCollapse:"collapse", fontSize:"13px"}}>
                  <thead>
                    <tr>
                      <th style={th}>Orden</th>
                      <th style={th}>Monto</th>
                      <th style={th}>Método</th>
                      <th style={th}>Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map(p => (
                      <tr key={p.id}>
                        <td style={{...td, fontWeight:600}}>{p.order_number || "-"}</td>
                        <td style={{...td, fontWeight:700, color:"#27ae60"}}>{s(p.amount)}</td>
                        <td style={td}>{p.payment_method_name || "-"}</td>
                        <td style={{...td, fontSize:"12px"}}>{f(p.paid_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
        )}

        {/* SUSCRIPCIONES */}
        {tab === "suscripciones" && (
          subscriptions.length === 0
            ? <div style={{textAlign:"center", padding:"20px", color: muted}}>Sin suscripciones activas</div>
            : <div>
                {subscriptions.map(s => {
                  const subCycles = billingCycles.filter((bc: any) => bc.subscription_id === s.id);
                  return (
                    <div key={s.id} style={{marginBottom:"20px", padding:"14px", backgroundColor: cardBg, borderRadius:"8px", border:"1px solid " + border}}>
                      <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"10px"}}>
                        <div>
                          <strong style={{fontSize:"15px", color: text}}>{s.plan_name}</strong>
                          <span style={{marginLeft:"8px", fontSize:"12px", padding:"2px 8px", borderRadius:"10px",
                            backgroundColor: s.status === 'active' ? "#27ae6022" : "#88888822",
                            color: s.status === 'active' ? "#27ae60" : "#888"}}>{s.status}</span>
                        </div>
                        <div style={{fontSize:"14px", fontWeight:700, color: text}}>{"$" + Number(s.billing_amount || s.plan_amount || 0).toLocaleString("es-AR", {minimumFractionDigits:2, maximumFractionDigits:2})}</div>
                      </div>
                      <div style={{display:"flex", gap:"16px", fontSize:"12px", color:muted, marginBottom:"10px"}}>
                        <span>Ciclo: {s.billing_cycle}</span>
                        <span>Inicio: {f(s.start_date)}</span>
                        {s.next_billing_date && <span>Próximo: {f(s.next_billing_date)}</span>}
                      </div>

                      {subCycles.length > 0 && (
                        <div style={{overflowX:"auto"}}>
                          <table style={{width:"100%", borderCollapse:"collapse", fontSize:"12px"}}>
                            <thead>
                              <tr>
                                <th style={th}>Período</th>
                                <th style={th}>Monto</th>
                                <th style={th}>Vence</th>
                                <th style={th}>Estado</th>
                                <th style={th}>NV</th>
                              </tr>
                            </thead>
                            <tbody>
                              {subCycles.map((bc: any) => (
                                <tr key={bc.id} style={{borderBottom: "1px solid " + border}}>
                                  <td style={td}>{f(bc.period_start)} → {f(bc.period_end)}</td>
                                  <td style={{...td, fontWeight:600}}>{"$" + Number(bc.amount || 0).toLocaleString("es-AR", {minimumFractionDigits:2, maximumFractionDigits:2})}</td>
                                  <td style={td}>{bc.due_date ? f(bc.due_date) : "-"}</td>
                                  <td style={td}>
                                    <span style={{padding:"2px 8px", borderRadius:"10px", fontSize:"11px",
                                      backgroundColor: bc.status === 'paid' ? "#27ae6022" : bc.status === 'billed' ? "#3498db22" : bc.status === 'overdue' ? "#e74c3c22" : "#f1c40f22",
                                      color: bc.status === 'paid' ? "#27ae60" : bc.status === 'billed' ? "#3498db" : bc.status === 'overdue' ? "#e74c3c" : "#f39c12"}}>
                                      {bc.status || "pending"}
                                    </span>
                                  </td>
                                  <td style={td}>
                                    {bc.order_number
                                      ? <a href={"/ventas"} style={{color:"#6c63ff", textDecoration:"underline", cursor:"pointer"}}>{bc.order_number}</a>
                                      : <span style={{color:muted}}>-</span>}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                      {subCycles.length === 0 && <div style={{fontSize:"12px", color:muted, padding:"8px 0"}}>Sin billing cycles</div>}
                    </div>
                  );
                })}
              </div>
        )}

        {/* TIMELINE */}
        {tab === "timeline" && (
          timeline.length === 0
            ? <div style={{textAlign:"center", padding:"20px", color: muted}}>Sin actividad registrada</div>
            : <div style={{maxHeight:"500px", overflowY:"auto"}}>
                {timeline.map((ev, i) => {
                  const icons: Record<string, string> = { order: "🛒", payment: "💰", note: "📝" };
                  const colors: Record<string, string> = { order: "#6c63ff", payment: "#27ae60", note: "#f39c12" };
                  return (
                    <div key={ev.event_type + "-" + ev.id + "-" + i}
                      style={{display:"flex", gap:"12px", padding:"10px 0", borderBottom: "1px solid " + border, alignItems:"flex-start"}}>
                      <div style={{width:"32px", height:"32px", borderRadius:"50%", background: (colors[ev.event_type] || "#888") + "22",
                        display:"flex", alignItems:"center", justifyContent:"center", fontSize:"14px", flexShrink:0}}>
                        {icons[ev.event_type] || "•"}
                      </div>
                      <div style={{flex:1, minWidth:0}}>
                        <div style={{fontSize:"13px", fontWeight:600, color: text}}>
                          {ev.event_type === "order" ? "Orden " + (ev.title || "#" + ev.id)
                            : ev.event_type === "payment" ? ev.title
                            : ev.title ? ev.title.substring(0, 120) : "Nota"}
                        </div>
                        {ev.event_type !== "note" && ev.amount && (
                          <div style={{fontSize:"13px", fontWeight:700, color: ev.event_type === "payment" ? "#27ae60" : "#e74c3c"}}>
                            {s(ev.amount)}
                          </div>
                        )}
                        <div style={{fontSize:"11px", color: muted}}>
                          {f(ev.event_at)}
                          {ev.status_name ? " · " + ev.status_name : ""}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
        )}

        {/* NOTES */}
        {tab === "notas" && (
          <div>
            {/* Add note */}
            <div style={{display:"flex", gap:"8px", marginBottom:"16px"}}>
              <input
                value={newNote}
                onChange={e => setNewNote(e.target.value)}
                placeholder="Agregar nota..."
                onKeyDown={e => e.key === "Enter" && handleAddNote()}
                style={{...inputStyle, marginBottom:0, flex:1}}
              />
              <button onClick={handleAddNote} disabled={savingNote || !newNote.trim()} style={btnPrimary}>
                {savingNote ? "..." : "Agregar"}
              </button>
            </div>

            {notes.length === 0
              ? <div style={{textAlign:"center", padding:"20px", color: muted}}>Sin notas aún</div>
              : notes.map(n => (
                  <div key={n.id} style={{padding:"10px 0", borderBottom:"1px solid " + border}}>
                    {editingNote && editingNote.id === n.id ? (
                      <div style={{display:"flex", gap:"8px", flexDirection:"column"}}>
                        <textarea
                          value={editingNote.content}
                          onChange={e => setEditingNote({...editingNote, content: e.target.value})}
                          style={{...inputStyle, minHeight:"60px", resize:"vertical"}}
                        />
                        <div style={{display:"flex", gap:"6px"}}>
                          <button onClick={() => handleUpdateNote(n.id, editingNote.content)} style={btnPrimary}>Guardar</button>
                          <button onClick={() => setEditingNote(null)} style={btnSecondary}>Cancelar</button>
                        </div>
                      </div>
                    ) : (
                      <div style={{display:"flex", justifyContent:"space-between", gap:"8px"}}>
                        <div style={{flex:1}}>
                          <div style={{fontSize:"13px", whiteSpace:"pre-wrap", color: text}}>{n.content}</div>
                          <div style={{fontSize:"11px", color: muted, marginTop:"4px"}}>
                            {n.created_by_name || "?"} · {f(n.created_at)}
                          </div>
                        </div>
                        <div style={{display:"flex", gap:"4px", flexShrink:0, alignItems:"flex-start"}}>
                          <button onClick={() => setEditingNote({id: n.id, content: n.content})} style={iconBtn}>✏️</button>
                          <button onClick={() => handleDeleteNote(n.id)} style={iconBtn}>🗑️</button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
          </div>
        )}
      </Card>

      {/* ── NEW ORDER MODAL ── */}
      {showNewOrder && (
        <div onClick={() => setShowNewOrder(false)} style={{position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", display:"flex", alignItems:"center", justifyContent:"center", padding:"20px", zIndex:1000}}>
          <div onClick={e => e.stopPropagation()} style={{background: bg, borderRadius:"18px", padding:"24px", width:"100%", maxWidth:"600px", maxHeight:"90vh", overflowY:"auto", boxShadow:"0 24px 70px rgba(0,0,0,0.25)"}}>
            <h3 style={{margin:"0 0 12px", fontSize:"18px"}}>Nueva venta · {contact.name}</h3>

            {/* Product selector */}
            <div style={sectionTitle}>Agregar producto</div>
            <select
              onChange={e => {
                if (!e.target.value) return;
                const p = newOrderProducts.find(x => x.id === Number(e.target.value));
                if (p) addProductToOrder(p);
                e.target.value = "";
              }}
              value=""
              style={inputStyle}>
              <option value="">Seleccionar producto...</option>
              {newOrderProducts.map(p => (
                <option key={p.id} value={p.id}>{p.name} · {s(p.price)}</option>
              ))}
            </select>

            {/* Items list */}
            {newOrderItems.length > 0 && (
              <div style={{marginTop:"12px"}}>
                {newOrderItems.map((item, i) => (
                  <div key={i} style={{display:"flex", gap:"8px", alignItems:"center", marginBottom:"8px", flexWrap:"wrap"}}>
                    <span style={{flex:1, minWidth:"120px", fontSize:"13px", fontWeight:600}}>{item.product_name}</span>
                    <input type="number" value={item.quantity} min="1"
                      onChange={e => updateOrderItem(i, "quantity", e.target.value)}
                      style={{width:"60px", padding:"6px", border:"1px solid " + border, borderRadius:"6px", fontSize:"13px", background: bg, color: text, textAlign:"center"}} />
                    <input type="number" value={item.unit_price} min="0" step="0.01"
                      onChange={e => updateOrderItem(i, "unit_price", e.target.value)}
                      style={{width:"90px", padding:"6px", border:"1px solid " + border, borderRadius:"6px", fontSize:"13px", background: bg, color: text, textAlign:"right"}} />
                    <span style={{fontSize:"13px", fontWeight:600, width:"70px", textAlign:"right"}}>{s(Number(item.quantity) * Number(item.unit_price))}</span>
                    <button onClick={() => removeOrderItem(i)} style={iconBtn}>✕</button>
                  </div>
                ))}
                <div style={{textAlign:"right", fontSize:"16px", fontWeight:800, padding:"8px 0", borderTop:"2px solid " + border, marginTop:"8px"}}>
                  Total: {s(newOrderTotal)}
                </div>
              </div>
            )}

            <div style={{display:"flex", gap:"8px", justifyContent:"flex-end", marginTop:"16px"}}>
              <button onClick={() => setShowNewOrder(false)} style={btnSecondary}>Cancelar</button>
              <button onClick={handleCreateOrder} disabled={newOrderItems.length === 0 || savingOrder} style={btnPrimary}>
                {savingOrder ? "..." : "Crear venta"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── PAY MODAL ── */}
      {showPayModal && (
        <div onClick={() => setShowPayModal(false)} style={{position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", display:"flex", alignItems:"flex-start", justifyContent:"center", padding:"20px", paddingTop:"40px", zIndex:1000, overflowY:"auto"}}>
          <div onClick={e => e.stopPropagation()} style={{background: bg, borderRadius:"18px", padding:"24px", width:"100%", maxWidth:"500px", boxShadow:"0 24px 70px rgba(0,0,0,0.25)"}}>
            <h3 style={{margin:"0 0 16px", fontSize:"18px"}}>Cobrar · {contact.name}</h3>
            <div style={{fontSize:"13px", color: muted, marginBottom:"12px"}}>
              Saldo pendiente: <strong style={{color: "#e74c3c"}}>{stats ? s(Math.abs(stats.balance)) : "$0"}</strong>
            </div>

            {/* NVs impagas */}
            {orders.filter(o => o.payment_status_name !== "Pagado").length === 0 ? (
              <div style={{padding:"16px", textAlign:"center", color: muted, border:"1px dashed " + border, borderRadius:"12px"}}>
                Todas las órdenes están pagadas
              </div>
            ) : (
              <div>
                <div style={{fontSize:"13px", fontWeight:700, marginBottom:"8px"}}>Órdenes pendientes</div>
                {orders.filter(o => o.payment_status_name !== "Pagado").map(o => {
                  const total = parseFloat(o.total) || 0;
                  const due = parseFloat(o.balance_due || o.total) || 0;
                  const selected = payOrderIds.includes(o.id);
                  return (
                    <div key={o.id}
                      style={{
                        display:"flex", alignItems:"center", gap:"10px", padding:"10px 12px",
                        border: selected ? "2px solid #6c63ff" : "1px solid " + border,
                        borderRadius:"10px", marginBottom:"8px", cursor:"pointer",
                        background: selected ? "#6c63ff0a" : "transparent"
                      }}
                      onClick={() => {
                        setPayOrderIds(prev => {
                          const next = prev.includes(o.id) ? prev.filter(id => id !== o.id) : [...prev, o.id];
                          const totalDue = orders
                            .filter(ord => next.includes(ord.id))
                            .reduce((acc, ord) => acc + (parseFloat(ord.balance_due || ord.total || "0") || 0), 0);
                          setPayAmount(next.length ? String(totalDue) : "");
                          return next;
                        });
                      }}>
                      <input type="checkbox" checked={selected} onChange={() => {}} style={{accentColor:"#6c63ff"}} />
                      <div style={{flex:1, minWidth:0}}>
                        <div style={{fontWeight:600, fontSize:"13px"}}>{o.order_number || "#" + o.id}</div>
                        <div style={{fontSize:"11px", color: muted}}>{o.status_name || "-"}</div>
                      </div>
                      <div style={{textAlign:"right"}}><div style={{fontWeight:700, fontSize:"14px"}}>{s(due)}</div>{due !== total && <div style={{fontSize:"10px", color: muted}}>Total {s(total)}</div>}</div>
                    </div>
                  );
                })}
              </div>
            )}

            {payOrderIds.length > 0 && (
              <div style={{marginTop:"16px", padding:"16px", background: cardBg, borderRadius:"12px", border:"1px solid " + border}}>
                <div style={{fontSize:"13px", color: muted, marginBottom:"8px"}}>Monto a cobrar</div>
                <input type="number" value={payAmount} min="0" step="0.01"
                  onChange={e => setPayAmount(e.target.value)}
                  style={inputStyle} />
                {payOrderIds.length > 1 && (
                  <div style={{fontSize:"12px", color: muted, marginBottom:"12px", marginTop:"6px"}}>
                    Se imputará de la NV más vieja a la más nueva hasta agotar el monto. La última puede quedar parcialmente paga.
                    <div style={{fontSize:"11px", marginTop:"4px"}}>Se registrará un cobro separado por cada NV alcanzada, en una sola acción.</div>
                  </div>
                )}

                <div style={{fontSize:"13px", color: muted, marginBottom:"8px"}}>Método de pago</div>
                <select value={payMethod} onChange={e => setPayMethod(e.target.value)} style={inputStyle}>
                  <option value="">Seleccionar...</option>
                  {payMethods.map(m => <option key={m.id} value={String(m.id)}>{m.name}</option>)}
                </select>

                {payError && <div style={{fontSize:"13px", color:"#e74c3c", marginBottom:"8px", padding:"8px 12px", background:"#e74c3c11", borderRadius:"8px", border:"1px solid #e74c3c33"}}>{payError}</div>}
              <div style={{display:"flex", gap:"8px", justifyContent:"flex-end", marginTop:"16px"}}>
                  <button onClick={() => setShowPayModal(false)} style={btnSecondary}>Cancelar</button>
                  <button onClick={handlePay} disabled={payOrderIds.length === 0 || !payMethod || !payAmount || savingPay} style={btnPrimary}>
                    {savingPay ? "..." : "Cobrar"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
