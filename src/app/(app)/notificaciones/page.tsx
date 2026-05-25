"use client";

import { useEffect, useState, useCallback } from "react";
import { fetchJson, postJson, putJson, deleteJson } from "../../lib";
import { Card, CardHeader, IconButton, PageTitle, Loading, Input, Button, Select } from "../../components/shared/UI";

type Setting = { id:number; event_type:string; email_enabled:boolean; whatsapp_enabled:boolean; notify_roles:string[]; template_id:number|null; description:string; template_name:string };
type CronJob = { id:number; event_type:string; cron_expr:string; notify_roles:string[]; enabled:boolean; last_run:string|null; description:string; template_id:number|null };
type User = { id:number; username:string; name:string; email:string; rol:string };
type Template = { id:number; client_id:number|null; name:string; subject:string; html_body:string; text_body:string; whatsapp_body:string|null; is_system:boolean; is_active:boolean };
type VariableDef = { id:number; client_id:number|null; label:string; code:string; description?:string; source_entity:string; source_field:string; default_value?:string; applies_to:string[]; is_system:boolean; is_active:boolean };

type EditorDraft = { id?:number; is_system?:boolean; name:string; subject:string; html_body:string; text_body:string; whatsapp_body?:string };

const dayOptions = [{v:"1",l:"Lun"},{v:"2",l:"Mar"},{v:"3",l:"Mié"},{v:"4",l:"Jue"},{v:"5",l:"Vie"},{v:"6",l:"Sáb"},{v:"0",l:"Dom"}];
const fallbackVars = [
  {label:"Negocio", token:"{{business_name}}"},{label:"N° pedido", token:"{{order_number}}"},{label:"Total", token:"{{total}}"},
  {label:"Factura", token:"{{invoice_number}}"},{label:"Producto", token:"{{product_name}}"},{label:"Stock", token:"{{stock}}"},
  {label:"Saldo caja", token:"{{cash_balance}}"},{label:"Resultado", token:"{{net_total}}"},
];
const icons: Record<string,string> = { order:"🛒", invoice:"🧾", low_stock:"📦", stock:"📦", payment:"💰", delivery:"🚚", work_order:"🔧", advance:"💵", daily_summary:"📊", daily_cash_close:"🧾", daily_reminders:"📌" };

function iconFor(type:string){ return Object.entries(icons).find(([k]) => type.startsWith(k))?.[1] || "🔔"; }
function parseCron(expr:string){ const p=(expr||"0 9 * * *").trim().split(/\s+/); const min=p[0]||"0", hour=p[1]||"9", dow=p[4]||"*"; return { time:`${String(hour).padStart(2,"0")}:${String(min).padStart(2,"0")}`, days:dow==="*"?dayOptions.map(d=>d.v):dow.split(",") }; }
function composeCron(time:string, days:string[]){ const [h,m]=(time||"09:00").split(":"); return `${Number(m||0)} ${Number(h||9)} * * ${days.length===7?"*":days.join(",")||"*"}`; }
function wrapStyle(html:string, st:any){ return `<div style="background:${st.bg};color:${st.color};font-size:${st.fontSize}px;text-align:${st.align};padding:${st.padding}px;border-radius:${st.radius}px;font-family:${st.font}, Arial, sans-serif;max-width:640px;margin:0 auto;">\n${html}\n</div>`; }
function stripHtml(html:string){ return String(html||"").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim(); }

function TabButton({active, children, onClick}:{active:boolean;children:React.ReactNode;onClick:()=>void}){
  return <button onClick={onClick} style={{ padding:"9px 14px", borderRadius:10, border:"none", cursor:"pointer", fontSize:13, fontWeight:700, background:active?"#1a1a2e":"#f2f2f5", color:active?"#fff":"#555" }}>{children}</button>;
}
function Toggle({value,onChange}:{value:boolean;onChange:()=>void}){
  return <button onClick={onChange} style={{ border:"none", borderRadius:999, padding:"5px 10px", fontSize:12, fontWeight:700, cursor:"pointer", background:value?"#e8f8ef":"#f2f2f2", color:value?"#27ae60":"#888" }}>{value?"✅ Activo":"○ Inactivo"}</button>;
}
function RoleChip({role,on,onClick}:{role:string;on:boolean;onClick:()=>void}){
  return <button onClick={onClick} style={{ border:"1px solid "+(on?"#6c63ff55":"#e5e5e5"), background:on?"#f0efff":"#fafafa", color:on?"#6c63ff":"#666", borderRadius:999, padding:"5px 10px", fontSize:12, cursor:"pointer", fontWeight:600 }}>{on?"✓ ":""}{role}</button>;
}
function NativeSelect({value,onChange,templates}:{value:number|null;onChange:(id:number|null)=>void;templates:Template[]}){
  return <select value={value||""} onChange={e=>onChange(e.target.value?Number(e.target.value):null)} style={{ padding:"7px 10px", border:"1px solid #ddd", borderRadius:8, background:"#fff", fontSize:12, maxWidth:260 }}><option value="">⚙️ Automático</option>{templates.map(t=><option key={t.id} value={t.id}>{t.is_system?"Base · ":"Cliente · "}{t.name}</option>)}</select>;
}
function Modal({title,onClose,children,width="760px"}:{title:string;onClose:()=>void;children:React.ReactNode;width?:string}){
  return <div onClick={e=>e.currentTarget===e.target&&onClose()} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.38)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}><div style={{ width:"100%", maxWidth:width, maxHeight:"92vh", overflow:"auto", background:"#fff", borderRadius:16, padding:24, boxShadow:"0 8px 32px rgba(0,0,0,.12)" }}><div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:18 }}><h3 style={{ margin:0, fontSize:18, fontWeight:800, color:"#1a1a2e" }}>{title}</h3><IconButton variant="ghost" onClick={onClose}>✕</IconButton></div>{children}</div></div>;
}

export default function NotificationsPage(){
  const [tab,setTab] = useState<"notifications"|"templates"|"variables">("notifications");
  const [settings,setSettings] = useState<Setting[]>([]);
  const [cronJobs,setCronJobs] = useState<CronJob[]>([]);
  const [users,setUsers] = useState<User[]>([]);
  const [templates,setTemplates] = useState<Template[]>([]);
  const [variables,setVariables] = useState<VariableDef[]>([]);
  const [fields,setFields] = useState<Record<string,string[]>>({});
  const [loading,setLoading] = useState(true);
  const [editor,setEditor] = useState<EditorDraft|null>(null);
  const [activeField,setActiveField] = useState<"subject"|"html_body"|"whatsapp_body">("html_body");
  const [preview,setPreview] = useState<{subject:string;html:string;whatsapp?:string}|null>(null);
  const [varForm,setVarForm] = useState({ label:"", code:"", source_entity:"payload", source_field:"", default_value:"", description:"" });
  const [waStatus, setWaStatus] = useState(null);
  const [showQr, setShowQr] = useState(false);
  const [style,setStyle] = useState({ bg:"#ffffff", color:"#333333", fontSize:"15", align:"left", padding:"24", radius:"12", font:"Arial" });

  const load = useCallback(async()=>{
    setLoading(true);
    try {
      const [a,b,c,d,e,f] = await Promise.all([
        fetchJson<{settings:Setting[]}>("/notifications/settings"), fetchJson<{jobs:CronJob[]}>("/notifications/cron"), fetchJson<User[]>("/users"),
        fetchJson<{templates:Template[]}>("/notifications/templates"), fetchJson<{variables:VariableDef[]}>("/notifications/variables"), fetchJson<{fields:Record<string,string[]>}>("/notifications/variable-fields"),
      ]);
      setSettings(a.settings||[]); setCronJobs(b.jobs||[]); setUsers(c||[]); setTemplates(d.templates||[]); setVariables(e.variables||[]); setFields(f.fields||{});
    } catch(e){ console.error(e); } finally { setLoading(false); }
  },[]);
  useEffect(()=>{ load(); },[load]);
  useEffect(()=>{
    fetchJson<{connected:boolean;phone?:string;error?:string}>("/openwa/status")
      .then(d=>setWaStatus({connected:d.connected,phone:d.phone,loading:false}))
      .catch(e=>setWaStatus({error:e.message,loading:false}));
  },[]);

  const roles = [...new Set(users.map(u=>u.rol))].sort();
  const variableButtons = [...variables.map(v=>({label:v.label,token:`{{${v.code}}}`})), ...fallbackVars].filter((v,i,a)=>a.findIndex(x=>x.token===v.token)===i);

  async function updateSetting(s:Setting, patch:Partial<Setting>){ const old=settings; setSettings(p=>p.map(x=>x.id===s.id?{...x,...patch}:x)); try{ await putJson(`/notifications/settings/${s.id}`,patch); }catch{ setSettings(old); alert("No se pudo guardar"); } }
  async function updateCron(j:CronJob, patch:Partial<CronJob>){ const old=cronJobs; setCronJobs(p=>p.map(x=>x.id===j.id?{...x,...patch}:x)); try{ await putJson(`/notifications/cron/${j.id}`,patch); }catch{ setCronJobs(old); alert("No se pudo guardar"); } }
  async function saveTemplate(){ if(!editor?.name || !editor?.html_body) return alert("Nombre y cuerpo son obligatorios"); if(editor.id) await putJson(`/notifications/templates/${editor.id}`,editor); else await postJson(`/notifications/templates`,editor); setEditor(null); await load(); }
  async function previewTemplate(t:Template|EditorDraft, channel:"mail"|"whatsapp"="mail"){ const isCurrentDraft = editor === t; if((t as Template).id && !isCurrentDraft){ const r=await postJson<{preview:{subject:string;html:string;whatsapp?:string}}>(`/notifications/templates/${(t as Template).id}/preview`,{}); if(channel==="whatsapp") setPreview({subject:`WhatsApp · ${t.name}`,html:"",whatsapp:r.preview.whatsapp||""}); else setPreview(r.preview); } else { const whatsapp=(t.whatsapp_body||t.text_body||stripHtml(t.html_body)); if(channel==="whatsapp") setPreview({subject:`WhatsApp · ${t.name||"Preview"}`,html:"",whatsapp}); else setPreview({ subject:t.subject||"Preview", html:t.html_body }); } }
  async function sendTest(t:Template){ const to=prompt("Email destino para enviar prueba:"); if(!to)return; await postJson(`/notifications/templates/${t.id}/test`,{to}); alert("Test enviado ✅"); }
  async function sendWhatsAppTest(t:Template){ const to=prompt("WhatsApp destino para enviar prueba:"); if(!to)return; await postJson(`/notifications/templates/${t.id}/test-whatsapp`,{to}); alert("WhatsApp enviado ✅"); }
  function customizeTemplate(t:Template){ setActiveField("html_body"); setEditor({name:`${t.name} personalizada`,subject:t.subject||"",html_body:t.html_body||"<p></p>",text_body:t.text_body||"",whatsapp_body:t.whatsapp_body||""}); }
  async function removeTemplate(t:Template){ if(!confirm("¿Desactivar plantilla?")) return; await deleteJson(`/notifications/templates/${t.id}`); await load(); }
  async function saveVariable(){ if(!varForm.label) return alert("Poné un nombre visible"); if(varForm.source_entity!=="static"&&!varForm.source_field) return alert("Elegí campo"); await postJson(`/notifications/variables`,{...varForm,applies_to:["all"]}); setVarForm({label:"",code:"",source_entity:"payload",source_field:"",default_value:"",description:""}); await load(); }
  async function removeVariable(v:VariableDef){ if(!confirm("¿Desactivar variable?")) return; await deleteJson(`/notifications/variables/${v.id}`); await load(); }
  function insertVar(token:string){ if(!editor)return; setEditor({...editor,[activeField]:(editor[activeField]||"")+token}); }

  if(loading) return <Loading/>;
  return <div style={{ padding:20, maxWidth:1100, margin:"0 auto" }}>
    <PageTitle title="Notificaciones" />
    {/* WhatsApp Connection Status */}
    <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16, padding:"10px 14px", background:"#f8f9fa", borderRadius:10, border:"1px solid #e9ecef" }}>
      <span style={{fontSize:20}}>💬</span>
      <div style={{flex:1}}>
        <b style={{fontSize:13,color:"#333"}}>WhatsApp (OpenWA)</b>
        {waStatus ? (
          <span style={{fontSize:12,color:waStatus.connected?"#27ae60":"#999",marginLeft:8}}>
            {waStatus.connected ? "Conectado" + (waStatus.phone ? " ("+waStatus.phone+")" : "") : waStatus.loading ? "Cargando..." : "Desconectado"}
          </span>
        ) : <span style={{fontSize:12,color:"#999",marginLeft:8}}>No verificado</span>}
        {waStatus?.error && <span style={{fontSize:11,color:"#e74c3c",marginLeft:8}}>Error: {waStatus.error}</span>}
        {waStatus?.qrCode && <span style={{fontSize:11,color:"#6c63ff",marginLeft:8}}>QR generado</span>}
      </div>
      <button onClick={async()=>{
        try{
          setWaStatus({loading:true});
          const d=await fetchJson<{connected:boolean;phone?:string;error?:string}>("/openwa/status");
          setWaStatus({connected:d.connected,phone:d.phone,loading:false});
          if(!d.connected) setShowQr(true);
        }catch(e){setWaStatus({error:e.message,loading:false});}
      }} style={{padding:"6px 14px",borderRadius:8,border:"1px solid #ddd",background:"#fff",fontSize:12,cursor:"pointer"}}>Verificar</button>
      <button onClick={()=>setShowQr(true)} style={{padding:"6px 14px",borderRadius:8,border:"1px solid #6c63ff",background:"#6c63ff",color:"#fff",fontSize:12,cursor:"pointer"}}>Conectar QR</button>
    </div>

    {/* QR Modal */}
    {showQr && <Modal title="Conectar WhatsApp" onClose={()=>setShowQr(false)} width="420px">
      <div style={{textAlign:"center",padding:"10px 0"}}>
        <p style={{fontSize:13,color:"#666",marginBottom:16}}>Escanea el QR desde WhatsApp {'>'} Dispositivos vinculados {'>'} Vincular dispositivo</p>
        <button onClick={async()=>{
          try{
            setWaStatus(p=>({...p,loading:true}));
            const d=await fetchJson<{connected:boolean;phone?:string;qrCode?:string;error?:string}>("/openwa/qr");
            if(d.connected) {
              setWaStatus({connected:true,phone:d.phone,loading:false});
              setShowQr(false);
            } else if(d.qrCode) {
              setWaStatus({qrCode:d.qrCode,loading:false});
            } else {
              setWaStatus({error:d.error||'Error',loading:false});
            }
          }catch(e){setWaStatus({error:e.message,loading:false});}
        }} style={{padding:"10px 24px",borderRadius:8,border:"1px solid #6c63ff",background:"#6c63ff",color:"#fff",fontSize:14,cursor:"pointer"}}>
          {waStatus?.loading ? 'Generando...' : 'Generar QR'}
        </button>
        {waStatus?.qrCode && <div style={{marginTop:16,display:"flex",justifyContent:"center",padding:12,background:"#fff",borderRadius:12,border:"1px solid #e9ecef"}}>
          <img src={waStatus.qrCode} alt="QR" style={{width:260,height:260}}/>
        </div>}
        {waStatus?.error && <p style={{color:"#e74c3c",fontSize:13,marginTop:12}}>{waStatus.error}</p>}
      </div>
    </Modal>}
    <div style={{ display:"flex", gap:8, margin:"8px 0 18px", flexWrap:"wrap" }}><TabButton active={tab==="notifications"} onClick={()=>setTab("notifications")}>🔔 Notificaciones</TabButton><TabButton active={tab==="templates"} onClick={()=>setTab("templates")}>🧩 Plantillas</TabButton><TabButton active={tab==="variables"} onClick={()=>setTab("variables")}>📚 Variables</TabButton></div>

    {tab==="notifications" && <>
      <Card style={{ marginBottom:14 }}><CardHeader title="⚡ Triggered" /><p style={{ margin:"-8px 0 14px", fontSize:13, color:"#777" }}>Se disparan por sucesos del sistema: ventas, pagos, facturas, stock, entregas.</p>{settings.map(s=><div key={s.id} style={{ display:"grid", gridTemplateColumns:"32px 1fr auto auto", gap:12, alignItems:"center", padding:"10px 0", borderTop:"1px solid #f3f3f3" }}><span style={{fontSize:22}}>{iconFor(s.event_type)}</span><div><div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}><b style={{fontSize:13}}>{s.description}</b><code style={{fontSize:11,color:"#999",background:"#f7f7f7",padding:"2px 6px",borderRadius:6}}>{s.event_type}</code><NativeSelect value={s.template_id} templates={templates} onChange={id=>updateSetting(s,{template_id:id})}/></div><div style={{ display:"flex", gap:6, flexWrap:"wrap", marginTop:7 }}>{roles.map(r=><RoleChip key={r} role={r} on={s.notify_roles.includes(r)} onClick={()=>updateSetting(s,{notify_roles:s.notify_roles.includes(r)?s.notify_roles.filter(x=>x!==r):[...s.notify_roles,r]})}/>)}<RoleChip role="cliente" on={s.notify_roles.includes("cliente")} onClick={()=>updateSetting(s,{notify_roles:s.notify_roles.includes("cliente")?s.notify_roles.filter(x=>x!=="cliente"):[...s.notify_roles,"cliente"]})}/></div></div><div style={{display:"flex",gap:6,alignItems:"center"}}>
              <span style={{fontSize:12,color:"#888"}}>📧</span>
              <Toggle value={s.email_enabled} onChange={()=>updateSetting(s,{email_enabled:!s.email_enabled})}/>
              <span style={{fontSize:12,color:"#888"}}>💬</span>
              <Toggle value={s.whatsapp_enabled||false} onChange={()=>updateSetting(s,{whatsapp_enabled:!s.whatsapp_enabled})}/>
            </div></div>)}</Card>
      <Card><CardHeader title="🗓️ Planned" /><p style={{ margin:"-8px 0 14px", fontSize:13, color:"#777" }}>Se envían en días y horarios configurables.</p>{cronJobs.map(j=>{const parsed=parseCron(j.cron_expr); return <div key={j.id} style={{ display:"grid", gridTemplateColumns:"32px 1fr auto auto", gap:12, alignItems:"center", padding:"10px 0", borderTop:"1px solid #f3f3f3" }}><span style={{fontSize:22}}>{iconFor(j.event_type)}</span><div><div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}><b style={{fontSize:13}}>{j.description}</b><input type="time" value={parsed.time} onChange={e=>updateCron(j,{cron_expr:composeCron(e.target.value,parsed.days)})} style={{ padding:"6px 8px", border:"1px solid #ddd", borderRadius:8 }}/><NativeSelect value={j.template_id} templates={templates} onChange={id=>updateCron(j,{template_id:id})}/></div><div style={{ display:"flex", gap:6, flexWrap:"wrap", marginTop:7 }}>{dayOptions.map(d=><button key={d.v} onClick={()=>{const days=parsed.days.includes(d.v)?parsed.days.filter(x=>x!==d.v):[...parsed.days,d.v].sort(); updateCron(j,{cron_expr:composeCron(parsed.time,days.length?days:dayOptions.map(x=>x.v))});}} style={{ border:"1px solid "+(parsed.days.includes(d.v)?"#6c63ff55":"#e5e5e5"), background:parsed.days.includes(d.v)?"#f0efff":"#fafafa", color:parsed.days.includes(d.v)?"#6c63ff":"#666", borderRadius:999, padding:"4px 8px", fontSize:11, cursor:"pointer" }}>{d.l}</button>)}</div><div style={{ display:"flex", gap:6, flexWrap:"wrap", marginTop:7 }}>{roles.map(r=><RoleChip key={r} role={r} on={j.notify_roles.includes(r)} onClick={()=>updateCron(j,{notify_roles:j.notify_roles.includes(r)?j.notify_roles.filter(x=>x!==r):[...j.notify_roles,r]})}/>)}</div></div><Toggle value={j.enabled} onChange={()=>updateCron(j,{enabled:!j.enabled})}/></div>})}</Card>
    </>}

    {tab==="templates" && <Card><CardHeader title="🧩 Plantillas" action={<Button onClick={()=>{setActiveField("html_body");setEditor({name:"",subject:"",html_body:"<h2>Hola {{business_name}}</h2>\n<p>Escribí tu mensaje acá.</p>",text_body:"",whatsapp_body:"Hola {{business_name}}!"})}}>+ Nueva</Button>} />{templates.map(t=><div key={t.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 0", borderTop:"1px solid #f3f3f3" }}><span style={{fontSize:18}}>{t.is_system?"🔒":"📝"}</span><div style={{ flex:1 }}><b style={{fontSize:13}}>{t.name}</b><div style={{fontSize:12,color:"#888"}}>{t.subject||"Sin asunto"}</div><div style={{display:"flex",gap:6,marginTop:5,flexWrap:"wrap"}}><span style={{fontSize:11,padding:"2px 7px",borderRadius:999,background:t.html_body?"#eef7ff":"#f5f5f5",color:t.html_body?"#2472a4":"#999"}}>📧 Mail</span><span style={{fontSize:11,padding:"2px 7px",borderRadius:999,background:t.whatsapp_body?"#e8f8ef":"#f5f5f5",color:t.whatsapp_body?"#27ae60":"#999"}}>💬 WhatsApp</span></div></div><IconButton variant="ghost" title="Preview mail" onClick={()=>previewTemplate(t,"mail")}>👁️</IconButton><IconButton variant="ghost" title="Preview WhatsApp" onClick={()=>previewTemplate(t,"whatsapp")}>💬</IconButton><IconButton variant="secondary" title="Test mail" onClick={()=>sendTest(t)}>✉️</IconButton><IconButton variant="secondary" title="Test WhatsApp" onClick={()=>sendWhatsAppTest(t)}>📲</IconButton>{!t.is_system&&<IconButton variant="ghost" title="Editar" onClick={()=>{setActiveField("html_body");setEditor({...t})}}>✏️</IconButton>}{t.is_system&&<IconButton variant="ghost" title="Personalizar" onClick={()=>customizeTemplate(t)}>✏️</IconButton>}{!t.is_system&&<IconButton variant="danger" title="Desactivar" onClick={()=>removeTemplate(t)}>🗑️</IconButton>}</div>)}</Card>}

    {tab==="variables" && <Card><CardHeader title="📚 Variables" /><p style={{ margin:"-8px 0 14px", fontSize:13, color:"#777" }}>Variables guiadas para clientes. Aparecen como botones en el editor de plantillas.</p><div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:10, marginBottom:16 }}><Input value={varForm.label} onChange={v=>setVarForm({...varForm,label:v,code:varForm.code||v.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"_")})} placeholder="Nombre visible"/><Input value={varForm.code} onChange={v=>setVarForm({...varForm,code:v})} placeholder="codigo_variable"/><Select value={varForm.source_entity} onChange={v=>setVarForm({...varForm,source_entity:v,source_field:""})} options={[{value:"payload",label:"Dato del evento"},{value:"client",label:"Negocio"},{value:"order",label:"Pedido/NV"},{value:"contact",label:"Contacto"},{value:"product",label:"Producto"},{value:"static",label:"Texto fijo"}]}/>{varForm.source_entity!=="static"?<Select value={varForm.source_field} onChange={v=>setVarForm({...varForm,source_field:v})} options={[{value:"",label:"Campo..."},...(fields[varForm.source_entity]||[]).map(f=>({value:f,label:f}))]}/>:<Input value={varForm.default_value} onChange={v=>setVarForm({...varForm,default_value:v})} placeholder="Valor fijo"/>}<Button onClick={saveVariable} style={{ height:36 }}>Guardar</Button></div>{variables.map(v=><div key={v.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 0", borderTop:"1px solid #f3f3f3" }}><span>{v.is_system?"🔒":"🧩"}</span><div style={{flex:1}}><b style={{fontSize:13}}>{v.label}</b> <code style={{fontSize:11,color:"#777"}}>{`{{${v.code}}}`}</code><div style={{fontSize:12,color:"#999"}}>{v.source_entity}.{v.source_field||"value"}</div></div>{!v.is_system&&<IconButton variant="danger" onClick={()=>removeVariable(v)}>🗑️</IconButton>}</div>)}</Card>}

    {editor&&<Modal title={editor.id?"Editar plantilla":"Nueva plantilla"} onClose={()=>setEditor(null)} width="1060px"><div style={{ display:"grid", gridTemplateColumns:"1fr 320px", gap:18 }}><div><Input value={editor.name} onChange={v=>setEditor({...editor,name:v})} label="Nombre"/><Input value={editor.subject||""} onChange={v=>setEditor({...editor,subject:v})} label="Asunto"/><div style={{ display:"flex", gap:8, marginBottom:8 }}>
            <button onClick={()=>setActiveField("html_body")} style={{ padding:"6px 12px", borderRadius:8, border:"none", cursor:"pointer", fontSize:12, fontWeight:700, background:activeField==="html_body"?"#1a1a2e":"#f2f2f5", color:activeField==="html_body"?"#fff":"#555" }}>📧 Mail (HTML)</button>
            <button onClick={()=>setActiveField("whatsapp_body")} style={{ padding:"6px 12px", borderRadius:8, border:"none", cursor:"pointer", fontSize:12, fontWeight:700, background:activeField==="whatsapp_body"?"#1a1a2e":"#f2f2f5", color:activeField==="whatsapp_body"?"#fff":"#555" }}>💬 WhatsApp (texto)</button>
          </div>
          {activeField==="html_body" && <textarea onFocus={()=>setActiveField("html_body")} value={editor.html_body} onChange={e=>setEditor({...editor,html_body:e.target.value})} rows={16} style={{ width:"100%", padding:12, border:"1px solid #ddd", borderRadius:10, fontFamily:"monospace", fontSize:13, boxSizing:"border-box" }}/>}
          {activeField==="whatsapp_body" && <textarea onFocus={()=>setActiveField("whatsapp_body")} value={editor.whatsapp_body||""} onChange={e=>setEditor({...editor,whatsapp_body:e.target.value})} rows={10} style={{ width:"100%", padding:12, border:"1px solid #ddd", borderRadius:10, fontFamily:"sans-serif", fontSize:14, boxSizing:"border-box" }} placeholder="Ej: Hola {{business_name}}! {{event_type}} N°{{order_number}} por {{total}} fue emitida.&#10;&#10;Ante cualquier duda, respondé este mensaje."/>}<div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop:12 }}><Button variant="secondary" onClick={()=>previewTemplate(editor,activeField==="whatsapp_body"?"whatsapp":"mail")}>👁️ Preview</Button>{activeField==="html_body"&&<Button variant="secondary" onClick={()=>setEditor({...editor,html_body:wrapStyle(editor.html_body,style)})}>🎨 Aplicar estilo</Button>}<Button onClick={saveTemplate}>Guardar</Button></div></div><div><h4 style={{margin:"0 0 8px"}}>Variables</h4><div style={{ display:"flex", gap:6, flexWrap:"wrap", maxHeight:210, overflow:"auto" }}>{variableButtons.map(v=><button key={v.token} onClick={()=>insertVar(v.token)} style={{ border:"1px solid #e5e5e5", background:"#fafafa", borderRadius:999, padding:"5px 9px", fontSize:12, cursor:"pointer" }}>+ {v.label}</button>)}</div><h4 style={{margin:"18px 0 8px"}}>Estilo rápido</h4><div style={{ display:"grid", gap:8, fontSize:12 }}><label>Fondo <input type="color" value={style.bg} onChange={e=>setStyle({...style,bg:e.target.value})}/></label><label>Texto <input type="color" value={style.color} onChange={e=>setStyle({...style,color:e.target.value})}/></label><label>Tamaño <input type="number" value={style.fontSize} onChange={e=>setStyle({...style,fontSize:e.target.value})} style={{width:70}}/> px</label><label>Alineación <select value={style.align} onChange={e=>setStyle({...style,align:e.target.value})}><option value="left">Izquierda</option><option value="center">Centro</option><option value="right">Derecha</option></select></label><label>Padding <input type="number" value={style.padding} onChange={e=>setStyle({...style,padding:e.target.value})} style={{width:70}}/> px</label><label>Bordes <input type="number" value={style.radius} onChange={e=>setStyle({...style,radius:e.target.value})} style={{width:70}}/> px</label></div></div></div></Modal>}
    {preview&&<Modal title={preview.subject} onClose={()=>setPreview(null)}>{preview.whatsapp?<pre style={{whiteSpace:"pre-wrap",fontFamily:"system-ui",fontSize:14,lineHeight:1.5,background:"#f8f9fa",padding:14,borderRadius:10}}>{preview.whatsapp}</pre>:<div dangerouslySetInnerHTML={{__html:preview.html}} />}</Modal>}
  </div>;
}
