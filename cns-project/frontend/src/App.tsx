import { useState } from 'react';
import { useNodes, useCluster, useHistory } from './hooks';
import { sendCommand } from './api';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';

// ── HELPERS ───────────────────────────────────────────────────────────────────
const pctColor = (pct: number) =>
  pct > 85 ? '#ef4444' : pct > 60 ? '#f59e0b' : '#22c55e';

const fmt = (n: number) => n?.toFixed ? n.toFixed(1) : '0';

// ── GAUGE BAR ─────────────────────────────────────────────────────────────────
const GaugeBar = ({ value = 0, color = '#38bdf8' }: { value: number; color?: string }) => {
  const col = pctColor(value);
  return (
    <div style={{ background: '#0d1829', borderRadius: 4, height: 8, overflow: 'hidden' }}>
      <div style={{
        width: `${Math.min(value, 100)}%`, height: '100%',
        background: col, borderRadius: 4, transition: 'width 0.5s ease',
      }} />
    </div>
  );
};

// ── NODE CARD ─────────────────────────────────────────────────────────────────
const NodeCard = ({ node, selected, onClick }: any) => {
  const activo = node.status === 'active';
  const pctDisk = node.pctUse || 0;
  const pctRAM  = node.totalRAM > 0 ? Math.round((node.usedRAM / node.totalRAM) * 100) : 0;

  return (
    <div onClick={() => onClick(node.nodeId)} style={{
      background: selected ? '#0f2040' : '#0d1829',
      border: `1px solid ${selected ? '#38bdf8' : activo ? '#22c55e33' : '#ef444433'}`,
      borderRadius: 12, padding: '14px 16px', cursor: 'pointer',
      transition: 'all 0.2s',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>
            {node.nombre || node.nodeId}
          </div>
          <div style={{ fontSize: 10, color: activo ? '#22c55e' : '#ef4444', marginTop: 2 }}>
            {activo ? '● ACTIVO' : '● NO REPORTA'}
          </div>
        </div>
        <div style={{ fontSize: 10, color: '#64748b', textAlign: 'right' }}>
          <div>{node.nodeId}</div>
          <div>{node.ip}</div>
        </div>
      </div>

      <div style={{ marginBottom: 6 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#94a3b8', marginBottom: 3 }}>
          <span>DISCO</span>
          <span style={{ color: pctColor(pctDisk) }}>{node.usedGB}GB / {node.totalGB}GB · {pctDisk}%</span>
        </div>
        <GaugeBar value={pctDisk} color="#38bdf8" />
      </div>

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#94a3b8', marginBottom: 3 }}>
          <span>RAM</span>
          <span style={{ color: pctColor(pctRAM) }}>{fmt(node.usedRAM)}GB / {node.totalRAM}GB · {pctRAM}%</span>
        </div>
        <GaugeBar value={pctRAM} color="#a78bfa" />
      </div>

      <div style={{ marginTop: 8, fontSize: 10, color: '#64748b' }}>
        IOPS: <span style={{ color: '#f59e0b' }}>{node.iops?.toLocaleString() || '–'}</span>
        &nbsp;·&nbsp;Latencia: <span style={{ color: '#38bdf8' }}>{node.latencyMs || 0}ms</span>
      </div>
    </div>
  );
};

// ── DETAIL PANEL ──────────────────────────────────────────────────────────────
const DetailPanel = ({ node, history, onCommand }: any) => {
  const [cmd, setCmd] = useState('');
  const pctDisk = node.pctUse || 0;
  const pctRAM  = node.totalRAM > 0 ? Math.round((node.usedRAM / node.totalRAM) * 100) : 0;

  const chartData = history.slice(0, 20).reverse().map((m: any) => ({
    hora: new Date(m.createdAt).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }),
    disco: m.pctUse || 0,
    ram:   m.totalRAM > 0 ? Math.round((m.usedRAM / m.totalRAM) * 100) : 0,
    iops:  m.iops || 0,
  }));

  const pieColors = ['#38bdf8', '#1e3a5f'];
  const pieRAM    = ['#a78bfa', '#2d1a4a'];

  return (
    <div style={{
      background: '#0a1628', border: '1px solid #1e3a5f',
      borderRadius: 16, padding: 20, display: 'flex',
      flexDirection: 'column', gap: 16, overflowY: 'auto',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#e2e8f0' }}>
            {node.nombre || node.nodeId}
          </div>
          <div style={{ fontSize: 11, color: '#64748b' }}>{node.nodeId} · {node.ip}</div>
        </div>
        <div style={{
          background: node.status === 'active' ? '#14532d' : '#7f1d1d',
          border: `1px solid ${node.status === 'active' ? '#22c55e' : '#ef4444'}`,
          borderRadius: 8, padding: '4px 12px', fontSize: 11, fontWeight: 700,
          color: node.status === 'active' ? '#22c55e' : '#ef4444',
        }}>
          {node.status === 'active' ? '● ACTIVO' : '● NO REPORTA'}
        </div>
      </div>

      {/* Pie charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {[
          { title: 'DISCO', pct: pctDisk, data: [{ value: pctDisk }, { value: 100 - pctDisk }], colors: pieColors },
          { title: 'RAM',   pct: pctRAM,  data: [{ value: pctRAM  }, { value: 100 - pctRAM  }], colors: pieRAM   },
        ].map(c => (
          <div key={c.title} style={{
            background: '#0d1829', borderRadius: 12, padding: 12,
            border: '1px solid #1e293b', textAlign: 'center',
          }}>
            <div style={{ fontSize: 10, color: '#64748b', marginBottom: 6 }}>{c.title}</div>
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <PieChart width={90} height={90}>
                <Pie data={c.data} cx={40} cy={40} innerRadius={28} outerRadius={42}
                  dataKey="value" startAngle={90} endAngle={-270} strokeWidth={0}>
                  {c.data.map((_: any, i: number) => <Cell key={i} fill={c.colors[i]} />)}
                </Pie>
              </PieChart>
              <div style={{
                position: 'absolute', top: '50%', left: '50%',
                transform: 'translate(-50%,-50%)',
                fontSize: 14, fontWeight: 800, color: '#e2e8f0',
              }}>{c.pct}%</div>
            </div>
          </div>
        ))}
      </div>

      {/* Historial */}
      {chartData.length > 0 && (
        <div style={{ background: '#0d1829', borderRadius: 12, padding: 12, border: '1px solid #1e293b' }}>
          <div style={{ fontSize: 10, color: '#64748b', marginBottom: 8 }}>HISTORIAL — DISCO & RAM (%)</div>
          <ResponsiveContainer width="100%" height={100}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="gD" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gR" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#a78bfa" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="hora" tick={{ fill: '#475569', fontSize: 8 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#475569', fontSize: 8 }} axisLine={false} tickLine={false} domain={[0, 100]} />
              <Tooltip contentStyle={{ background: '#0f2040', border: '1px solid #1e3a5f', fontSize: 10, color: '#e2e8f0' }} />
              <Area type="monotone" dataKey="disco" stroke="#38bdf8" fill="url(#gD)" strokeWidth={2} name="Disco %" />
              <Area type="monotone" dataKey="ram"   stroke="#a78bfa" fill="url(#gR)" strokeWidth={2} name="RAM %" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* IOPS */}
      {chartData.length > 0 && (
        <div style={{ background: '#0d1829', borderRadius: 12, padding: 12, border: '1px solid #1e293b' }}>
          <div style={{ fontSize: 10, color: '#64748b', marginBottom: 8 }}>IOPS</div>
          <ResponsiveContainer width="100%" height={70}>
            <BarChart data={chartData}>
              <XAxis dataKey="hora" tick={{ fill: '#475569', fontSize: 8 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#0f2040', border: '1px solid #1e3a5f', fontSize: 10, color: '#e2e8f0' }} />
              <Bar dataKey="iops" fill="#f59e0b" radius={[3, 3, 0, 0]} name="IOPS" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Comando */}
      <div style={{ background: '#0d1829', borderRadius: 12, padding: 12, border: '1px solid #1e293b' }}>
        <div style={{ fontSize: 10, color: '#64748b', marginBottom: 8 }}>ENVIAR COMANDO</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
          {['Reinicie servicio', 'Verifique espacio', 'Actualice configuración'].map(m => (
            <button key={m} onClick={() => setCmd(m)} style={{
              background: '#1e293b', border: '1px solid #334155', borderRadius: 6,
              padding: '4px 8px', fontSize: 10, color: '#94a3b8', cursor: 'pointer',
            }}>{m}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input value={cmd} onChange={e => setCmd(e.target.value)}
            placeholder="Mensaje personalizado..."
            style={{
              flex: 1, background: '#1e293b', border: '1px solid #334155',
              borderRadius: 6, padding: '6px 10px', fontSize: 11,
              color: '#e2e8f0', outline: 'none',
            }}
          />
          <button onClick={() => { onCommand(node.nodeId, cmd); setCmd(''); }} style={{
            background: '#1e40af', border: 'none', borderRadius: 6,
            padding: '6px 14px', fontSize: 11, color: '#fff', cursor: 'pointer',
          }}>Enviar</button>
        </div>
      </div>
    </div>
  );
};

// ── APP ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [interval, setRefreshInterval] = useState(10000);
  const [selected, setSelected]        = useState('');
  const [toast, setToast]              = useState('');

  const { nodes, loading } = useNodes(interval);
  const cluster            = useCluster(interval);
  const history            = useHistory(selected);

  const selectedNode = nodes.find((n: any) => n.nodeId === selected);

  const handleCommand = async (nodeId: string, message: string) => {
    if (!message.trim()) return;
    await sendCommand(nodeId, message);
    setToast(`Comando enviado a ${nodeId}`);
    setTimeout(() => setToast(''), 3000);
  };

  return (
    <div style={{
      minHeight: '100vh', background: '#060d1a',
      color: '#e2e8f0', fontFamily: 'system-ui, sans-serif',
      display: 'flex', flexDirection: 'column',
    }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 6px; background: #0d1829; }
        ::-webkit-scrollbar-thumb { background: #1e3a5f; border-radius: 3px; }
      `}</style>

      {/* HEADER */}
      <div style={{
        background: '#080f1e', borderBottom: '1px solid #1e293b',
        padding: '12px 20px', display: 'flex', alignItems: 'center',
        gap: 24, flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: 'linear-gradient(135deg,#1e40af,#0369a1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 900, color: '#fff',
          }}>CNS</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>MONITOR NACIONAL DE ALMACENAMIENTO</div>
            <div style={{ fontSize: 10, color: '#64748b' }}>Storage Cluster · Sistemas Distribuidos</div>
          </div>
        </div>

        {cluster && [
          { label: 'DISCO TOTAL',   val: `${((cluster.totalDisk || 0) / 1024).toFixed(1)} TB`, color: '#38bdf8' },
          { label: 'USO DISCO',     val: `${cluster.pctUse || 0}%`,  color: pctColor(cluster.pctUse || 0) },
          { label: 'NODOS ACTIVOS', val: `${cluster.nodos || 0} / 9`, color: '#22c55e' },
          { label: 'RAM TOTAL',     val: `${cluster.totalRAM || 0} GB`, color: '#a78bfa' },
        ].map(k => (
          <div key={k.label} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: k.color }}>{k.val}</div>
            <div style={{ fontSize: 9, color: '#64748b' }}>{k.label}</div>
          </div>
        ))}

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ fontSize: 10, color: '#64748b' }}>REFRESH:</span>
          {[5000, 10000, 30000, 60000].map(ms => (
            <button key={ms} onClick={() => setRefreshInterval(ms)} style={{
              background: interval === ms ? '#1e40af' : '#0d1829',
              border: `1px solid ${interval === ms ? '#3b82f6' : '#1e293b'}`,
              borderRadius: 6, padding: '3px 8px', fontSize: 10,
              color: interval === ms ? '#fff' : '#64748b', cursor: 'pointer',
            }}>{ms / 1000}s</button>
          ))}
        </div>
      </div>

      {/* TOAST */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 20, right: 20, zIndex: 999,
          background: '#14532d', border: '1px solid #22c55e',
          borderRadius: 10, padding: '10px 20px', fontSize: 13, color: '#22c55e',
        }}>{toast}</div>
      )}

      {/* CONTENIDO */}
      <div style={{
        flex: 1, display: 'grid',
        gridTemplateColumns: selectedNode ? '1fr 360px' : '1fr',
        overflow: 'hidden', height: 'calc(100vh - 73px)',
      }}>
        {/* GRID NODOS */}
        <div style={{ overflowY: 'auto', padding: 16 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 60, color: '#475569' }}>
              Conectando al servidor...
            </div>
          ) : nodes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, color: '#475569' }}>
              Sin nodos conectados. Iniciá el cliente TCP.
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: 12,
            }}>
              {nodes.map((node: any) => (
                <NodeCard key={node.nodeId} node={node}
                  selected={selected === node.nodeId}
                  onClick={setSelected} />
              ))}
            </div>
          )}
        </div>

        {/* PANEL DETALLE */}
        {selectedNode && (
          <div style={{ borderLeft: '1px solid #1e293b', overflowY: 'auto', padding: 16 }}>
            <DetailPanel node={selectedNode} history={history} onCommand={handleCommand} />
          </div>
        )}
      </div>
    </div>
  );
}
