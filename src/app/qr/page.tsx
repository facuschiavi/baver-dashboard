'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

export default function QrPage() {
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [connected, setConnected] = useState(false);
  const activeRef = useRef(false);

  const startLogin = useCallback(async (force = false) => {
    setLoading(true);
    setError('');
    setMessage('Generando QR...');
    setConnected(false);
    setQrUrl(null);
    activeRef.current = true;
    try {
      const res = await fetch('/api/whatsapp/qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force }),
      });
      const data = await res.json();
      if (data.connected) { setConnected(true); setMessage('WhatsApp vinculado'); }
      else if (data.qrDataUrl) { setQrUrl(data.qrDataUrl); setMessage(data.message || 'Escanea el QR'); }
      else if (data.error) { setError(data.error); }
      else { setMessage(data.message || 'QR generado'); }
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  }, []);

  const waitLogin = useCallback(async () => {
    if (!activeRef.current || !qrUrl) return;
    setLoading(true);
    setMessage('Esperando escaneo...');
    try {
      const res = await fetch('/api/whatsapp/wait', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentQrDataUrl: qrUrl }),
      });
      const data = await res.json();
      if (data.connected) { setConnected(true); setMessage('WhatsApp vinculado'); setQrUrl(null); }
      else if (data.qrDataUrl && data.qrDataUrl !== qrUrl) { setQrUrl(data.qrDataUrl); setMessage(data.message || 'QR actualizado'); }
      else { setMessage(data.message || 'Esperando...'); }
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  }, [qrUrl]);

  useEffect(() => {
    if (!qrUrl || connected || loading) return;
    const timer = setInterval(waitLogin, 5000);
    return () => clearInterval(timer);
  }, [qrUrl, connected, loading, waitLogin]);

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '24px' }}>
      <h1 style={{ fontSize: '24px', marginBottom: '20px' }}>📱 Conectar WhatsApp</h1>
      {!qrUrl && !connected && (
        <div>
          <p style={{ color: '#64748b', marginBottom: '16px', lineHeight: 1.5 }}>
            Hace clic en Generar QR y escanealo desde WhatsApp {'>'} Dispositivos vinculados {'>'} Vincular dispositivo
          </p>
          <button onClick={() => startLogin(false)} disabled={loading}
            style={{ padding: '12px 24px', fontSize: '16px', borderRadius: '8px', border: '1px solid rgba(34,197,94,0.4)', background: 'rgba(34,197,94,0.1)', color: '#4ade80', cursor: loading ? 'not-allowed' : 'pointer' }}>
            {loading ? 'Generando...' : 'Generar QR'}
          </button>
        </div>
      )}
      {loading && <p style={{ color: '#bbf7d0' }}>{message}</p>}
      {error && <div style={{ color: '#fca5a5', marginTop: '12px' }}>Error: {error}</div>}
      {qrUrl && !connected && (
        <div>
          <p style={{ color: '#cbd5e1', marginBottom: '12px' }}>{message}</p>
          <div style={{ display: 'flex', justifyContent: 'center', padding: '16px', background: '#fff', borderRadius: '12px', marginBottom: '16px' }}>
            <img src={qrUrl} alt="QR" style={{ width: '280px', height: '280px' }} />
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={waitLogin} disabled={loading} style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.05)', color: '#e2e8f0', cursor: 'pointer' }}>Actualizar</button>
            <button onClick={() => startLogin(true)} disabled={loading} style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.05)', color: '#e2e8f0', cursor: 'pointer' }}>Regenerar QR</button>
            <a href={qrUrl} download="whatsapp-qr.png" style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.05)', color: '#e2e8f0', textDecoration: 'none' }}>Descargar</a>
          </div>
        </div>
      )}
      {connected && (
        <div>
          <p style={{ color: '#bbf7d0', fontSize: '18px' }}>WhatsApp vinculado correctamente</p>
          <button onClick={() => { setConnected(false); setQrUrl(null); }} style={{ marginTop: '12px', padding: '10px 20px', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.1)', color: '#fca5a5', cursor: 'pointer' }}>Cerrar</button>
        </div>
      )}
    </div>
  );
}
