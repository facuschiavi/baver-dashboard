'use client';

import { useState, useEffect, useCallback } from 'react';

interface InputItem {
  input_name: string;
  unit: string;
  needed: number;
  available: number | null;
  requires_stock: boolean;
  sufficient: boolean;
}

interface Product {
  id: number;
  name: string;
  stock_quantity: number;
  recipe_count: number;
}

interface Movement {
  id: number;
  product_name: string;
  quantity: number;
  notes: string;
  created_by_name: string;
  created_at: string;
}

import { fetchJson } from '../../app/lib';

const API = process.env.NEXT_PUBLIC_API_URL || '/api';

function authHeaders(): Record<string,string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  return { 
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': 'Bearer ' + token } : {})
  };
}

export default function FabricacionPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [inputsCheck, setInputsCheck] = useState<InputItem[]>([]);
  const [manufacturing, setManufacturing] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [showMovements, setShowMovements] = useState(false);

  useEffect(() => { loadProducts(); }, []);

  const loadProducts = async () => {
    try {
      const r = await fetch(API + '/products?limit=200', { headers: authHeaders() });
      const data = await r.json();
      const items = data.products || data || [];
      const withRecipe: Product[] = [];
      for (const p of items) {
        try {
          const r2 = await fetch(API + '/plugins/fabricacion/recipe/' + p.id, { headers: authHeaders() });
          const recipe = await r2.json();
          if (Array.isArray(recipe) && recipe.length > 0) {
            withRecipe.push({ id: p.id, name: p.name, stock_quantity: p.stock_quantity || 0, recipe_count: recipe.length });
          }
        } catch {}
      }
      setProducts(withRecipe);
    } catch (e: any) {
      setError('Error cargando productos: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const openManufacture = async (product: Product) => {
    setSelectedProduct(product);
    setQuantity(1);
    setNotes('');
    setResult(null);
    setShowModal(true);
    await checkInputs(product.id, 1);
  };

  const checkInputs = async (productId: number, qty: number) => {
    try {
      const r = await fetch(API + '/plugins/fabricacion/check-inputs/' + productId + '/' + qty, { headers: authHeaders() });
      const data = await r.json();
      setInputsCheck(data.inputs || []);
    } catch {}
  };

  const handleQuantityChange = (qty: number) => {
    setQuantity(qty);
    if (selectedProduct) checkInputs(selectedProduct.id, qty);
  };

  const handleManufacture = async () => {
    if (!selectedProduct) return;
    setManufacturing(true);
    try {
      const r = await fetch(API + '/plugins/fabricacion/manufacture', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ product_id: selectedProduct.id, quantity, notes: notes || null })
      });
      const data = await r.json();
      if (r.ok) {
        setResult({ success: true, message: data.message });
        loadProducts();
        loadMovements();
      } else {
        setResult({ success: false, message: data.error || 'Error al fabricar' });
      }
    } catch (e: any) {
      setResult({ success: false, message: e.message });
    } finally {
      setManufacturing(false);
    }
  };

  const loadMovements = useCallback(async () => {
    try {
      const r = await fetch(API + '/plugins/fabricacion/movements', { headers: authHeaders() });
      const data = await r.json();
      setMovements(Array.isArray(data) ? data : []);
    } catch {}
  }, []);

  const deleteMovement = async (id: number) => {
    if (!confirm('Anular este movimiento? Se restituiran los insumos y se descontara el producto fabricado.')) return;
    try {
      const r = await fetch(API + '/plugins/fabricacion/movements/' + id, {
        method: 'DELETE',
        headers: authHeaders()
      });
      const data = await r.json();
      if (r.ok) {
        alert(data.message);
        loadMovements();
        loadProducts();
      } else {
        alert('Error: ' + (data.error || 'No se pudo anular'));
      }
    } catch (e: any) {
      alert('Error: ' + e.message);
    }
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>Cargando...</div>;

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1000 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ margin: 0 }}>Fabricacion</h1>
        <button onClick={() => { setShowMovements(!showMovements); if (!showMovements) loadMovements(); }}
          style={{ background: 'none', border: '1px solid #ccc', borderRadius: 6, padding: '8px 16px', cursor: 'pointer' }}>
          {showMovements ? 'Volver' : 'Historial'}
        </button>
      </div>

      {error && <div style={{ color: '#e74c3c', marginBottom: 16 }}>{error}</div>}

      {showMovements ? (
        <div>
          <h2 style={{ fontSize: 18, marginBottom: 16 }}>Movimientos de fabricacion</h2>
          {movements.length === 0 ? (
            <p style={{ color: '#888' }}>No hay movimientos registrados</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f5f5f5', textAlign: 'left' }}>
                  <th style={{ padding: '10px 12px', fontWeight: 600, fontSize: 13 }}>Producto</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600, fontSize: 13 }}>Cantidad</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600, fontSize: 13 }}>Notas</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600, fontSize: 13 }}>Creado por</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600, fontSize: 13 }}>Fecha</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600, fontSize: 13, width: 60 }}></th>
                </tr>
              </thead>
              <tbody>
                {movements.map(m => (
                  <tr key={m.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '10px 12px', fontSize: 13 }}>{m.product_name}</td>
                    <td style={{ padding: '10px 12px', fontSize: 13 }}>{m.quantity}</td>
                    <td style={{ padding: '10px 12px', fontSize: 13 }}>{m.notes || '-'}</td>
                    <td style={{ padding: '10px 12px', fontSize: 13 }}>{m.created_by_name || '-'}</td>
                    <td style={{ padding: '10px 12px', fontSize: 13 }}>{new Date(m.created_at).toLocaleString('es-AR')}</td>
                    <td style={{ padding: '10px 12px', fontSize: 13 }}>
                      <button onClick={() => deleteMovement(m.id)}
                        title="Anular movimiento (restituye insumos)"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, padding: 4 }}>
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        <div>
          {products.length === 0 ? (
            <p style={{ color: '#888' }}>
              No hay productos con receta de fabricacion. Configura los insumos desde la ficha del producto.
            </p>
          ) : (
            <div style={{ display: 'grid', gap: 16 }}>
              {products.map(p => (
                <div key={p.id} style={{
                  border: '1px solid #e0e0e0', borderRadius: 10, padding: '16px 20px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>{p.name}</div>
                    <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>
                      Stock: {p.stock_quantity} &middot; {p.recipe_count} insumo{p.recipe_count !== 1 ? 's' : ''} en receta
                    </div>
                  </div>
                  <button onClick={() => openManufacture(p)}
                    style={{
                      background: '#3498db', color: '#fff', border: 'none', borderRadius: 6,
                      padding: '8px 20px', cursor: 'pointer', fontSize: 14, fontWeight: 500
                    }}>
                    Fabricar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showModal && selectedProduct && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 28, width: 480, maxWidth: '90vw' }}>
            <h2 style={{ margin: '0 0 16px', fontSize: 18 }}>Fabricar: {selectedProduct.name}</h2>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 14 }}>Cantidad a fabricar</label>
              <input type="number" min={1} value={quantity}
                onChange={e => handleQuantityChange(parseInt(e.target.value) || 1)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #ddd', fontSize: 16 }}
              />
            </div>

            {inputsCheck.length > 0 && (
              <div style={{ marginBottom: 16, background: '#f9f9f9', borderRadius: 8, padding: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Insumos requeridos:</div>
                {inputsCheck.map((item, i) => (
                  <div key={i} style={{
                    display: 'flex', justifyContent: 'space-between', fontSize: 13,
                    padding: '4px 0', color: item.requires_stock && !item.sufficient ? '#e74c3c' : '#333'
                  }}>
                    <span>{item.input_name}</span>
                    <span>
                      {item.needed} {item.unit}
                      {item.requires_stock && <span style={{ marginLeft: 8, opacity: 0.7 }}>(stock: {item.available})</span>}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 14 }}>Notas (opcional)</label>
              <input type="text" value={notes} placeholder="Ej: Lote #23"
                onChange={e => setNotes(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #ddd', fontSize: 14 }}
              />
            </div>

            {result && (
              <div style={{
                padding: '10px 14px', borderRadius: 8, marginBottom: 16,
                background: result.success ? '#d4edda' : '#f8d7da',
                color: result.success ? '#155724' : '#721c24', fontSize: 14
              }}>
                {result.message}
              </div>
            )}

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button onClick={() => { setShowModal(false); setResult(null); }}
                style={{ background: '#f5f5f5', border: '1px solid #ddd', borderRadius: 6, padding: '8px 20px', cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={handleManufacture} disabled={manufacturing}
                style={{
                  background: '#27ae60', color: '#fff', border: 'none', borderRadius: 6,
                  padding: '8px 20px', cursor: manufacturing ? 'not-allowed' : 'pointer',
                  opacity: manufacturing ? 0.7 : 1, fontWeight: 500
                }}>
                {manufacturing ? 'Fabricando...' : 'Fabricar ' + quantity + ' unidad(es)'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
