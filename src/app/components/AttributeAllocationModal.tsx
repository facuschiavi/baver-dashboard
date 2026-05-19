"use client";

import { useEffect, useMemo, useState } from "react";

type AttrOption = {
  attribute_value_id: number;
  value: string;
  stock_quantity?: number;
};

type Allocation = {
  attribute_value_id: number;
  quantity: number;
};

type AllocationItem = {
  key: string;
  title: string;
  totalQuantity: number;
  options: AttrOption[];
  allocations?: Allocation[];
  showStock?: boolean;
};

type Props = {
  title: string;
  items: AllocationItem[];
  onClose: () => void;
  onSave: (result: Record<string, Allocation[]>) => void;
};

export default function AttributeAllocationModal({ title, items, onClose, onSave }: Props) {
  const [draft, setDraft] = useState<Record<string, Record<number, number>>>({});

  useEffect(() => {
    const next: Record<string, Record<number, number>> = {};
    for (const item of items) {
      next[item.key] = {};
      for (const opt of item.options) next[item.key][opt.attribute_value_id] = 0;
      for (const alloc of item.allocations || []) next[item.key][alloc.attribute_value_id] = Number(alloc.quantity || 0);
    }
    setDraft(next);
  }, [items]);

  const totals = useMemo(() => {
    const out: Record<string, number> = {};
    for (const item of items) {
      const row = draft[item.key] || {};
      out[item.key] = Object.values(row).reduce((s, n) => s + Number(n || 0), 0);
    }
    return out;
  }, [draft, items]);

  function setQty(itemKey: string, attrId: number, value: string) {
    const qty = Math.max(0, Number(value || 0));
    setDraft(prev => ({
      ...prev,
      [itemKey]: {
        ...(prev[itemKey] || {}),
        [attrId]: qty,
      }
    }));
  }

  function handleSave() {
    const result: Record<string, Allocation[]> = {};
    for (const item of items) {
      const total = totals[item.key] || 0;
      if (total !== Number(item.totalQuantity || 0)) {
        alert(`La suma de atributos para \"${item.title}\" debe ser ${item.totalQuantity}. Ahora es ${total}.`);
        return;
      }
      result[item.key] = Object.entries(draft[item.key] || {})
        .map(([attribute_value_id, quantity]) => ({ attribute_value_id: Number(attribute_value_id), quantity: Number(quantity || 0) }))
        .filter(a => a.quantity > 0);
      if (result[item.key].length === 0) {
        alert(`Tenés que repartir la cantidad de \"${item.title}\" en al menos un atributo.`);
        return;
      }
    }
    onSave(result);
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ width: "100%", maxWidth: 760, maxHeight: "90vh", overflowY: "auto", background: "#fff", borderRadius: 16, padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>{title}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer" }}>✕</button>
        </div>

        {items.map(item => {
          const total = totals[item.key] || 0;
          const ok = total === Number(item.totalQuantity || 0);
          return (
            <div key={item.key} style={{ border: "1px solid #eee", borderRadius: 12, padding: 14, marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div>
                  <div style={{ fontWeight: 800 }}>{item.title}</div>
                  <div style={{ fontSize: 12, color: "#666" }}>Cantidad a repartir: {item.totalQuantity}</div>
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: ok ? "#27ae60" : "#e67e22" }}>Asignado: {total}/{item.totalQuantity}</div>
              </div>
              <div style={{ display: "grid", gap: 8 }}>
                {item.options.map(opt => (
                  <div key={opt.attribute_value_id} style={{ display: "grid", gridTemplateColumns: item.showStock ? "1fr auto 100px" : "1fr 100px", gap: 10, alignItems: "center" }}>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>
                      {opt.value}
                      {item.showStock ? <span style={{ marginLeft: 8, color: "#666", fontWeight: 500, fontSize: 12 }}>Stock actual: {Number(opt.stock_quantity || 0)}</span> : null}
                    </div>
                    <input
                      type="number"
                      min={0}
                      value={draft[item.key]?.[opt.attribute_value_id] ?? 0}
                      onChange={e => setQty(item.key, opt.attribute_value_id, e.target.value)}
                      style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #ddd" }}
                    />
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
          <button onClick={onClose} style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #ddd", background: "#fff", cursor: "pointer" }}>Cancelar</button>
          <button onClick={handleSave} style={{ padding: "10px 14px", borderRadius: 10, border: "none", background: "#1a1a2e", color: "#fff", cursor: "pointer", fontWeight: 700 }}>Guardar reparto</button>
        </div>
      </div>
    </div>
  );
}
