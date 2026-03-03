import { Node, Metric, Event } from '../models';

// ── NODOS ─────────────────────────────────────────────────────────────────────

export const saveNode = async (nodeId: string, ip: string, nombre?: string) => {
  const existe = await Node.findOne({ nodeId });

  if (!existe) {
    console.log(`🆕 Nuevo nodo registrado: ${nodeId} (${ip})`);
    await Event.create({ nodeId, type: 'UP' });
  } else if (existe.status === 'no_report') {
    const duration = Date.now() - new Date(existe.lastSeen).getTime();
    await Event.create({ nodeId, type: 'UP', duration });
    console.log(`✅ Nodo recuperado: ${nodeId}`);
  }

  return Node.findOneAndUpdate(
    { nodeId },
    { ip, status: 'active', lastSeen: new Date(), ...(nombre && { nombre }) },
    { upsert: true, new: true }
  );
};

export const markDown = async (nodeId: string) => {
  const node = await Node.findOne({ nodeId });
  if (node && node.status === 'active') {
    await Node.findOneAndUpdate({ nodeId }, { status: 'no_report' });
    await Event.create({ nodeId, type: 'DOWN' });
    console.log(`⚠️  Nodo sin reporte: ${nodeId}`);
  }
};

export const getNodes = () => Node.find().sort({ nodeId: 1 });

// ── MÉTRICAS ──────────────────────────────────────────────────────────────────

export const saveMetric = async (data: any) => {
  const serverTimestamp = Date.now();
  const latencyMs = serverTimestamp - (data.clientTimestamp || serverTimestamp);
  const pctUse = data.totalGB > 0 ? Math.round((data.usedGB / data.totalGB) * 100) : 0;

  return Metric.create({ ...data, serverTimestamp, latencyMs, pctUse });
};

export const getHistory = (nodeId: string, limit = 100) =>
  Metric.find({ nodeId }).sort({ createdAt: -1 }).limit(limit);

// ── CLUSTER ───────────────────────────────────────────────────────────────────

export const getCluster = async () => {
  // primero obtener la métrica más reciente por cada par nodoId+diskName,
  // luego agrupar por nodoId para sumar discos, y finalmente sumar todo para
  // el cluster.
  const [result] = await Metric.aggregate([
    { $sort: { createdAt: -1 } },
    { $group: { _id: { nodeId: '$nodeId', disk: '$diskName' }, m: { $first: '$$ROOT' } } },
    { $group: {
        _id: '$_id.nodeId',
        totalDisk: { $sum: '$m.totalGB' },
        usedDisk:  { $sum: '$m.usedGB'  },
        freeDisk:  { $sum: '$m.freeGB'  },
        // asumimos que la RAM se repite igual para todas las métricas por nodo
        totalRAM:  { $first: '$m.totalRAM' },
        usedRAM:   { $first: '$m.usedRAM'  },
      }
    },
    { $group: {
        _id: null,
        totalDisk: { $sum: '$totalDisk' },
        usedDisk:  { $sum: '$usedDisk'  },
        freeDisk:  { $sum: '$freeDisk'  },
        totalRAM:  { $sum: '$totalRAM' },
        usedRAM:   { $sum: '$usedRAM'  },
        nodos:     { $sum: 1 },
      }
    }
  ]);

  if (!result) return { totalDisk: 0, usedDisk: 0, freeDisk: 0, pctUse: 0, nodos: 0 };

  return {
    totalDisk: result.totalDisk,
    usedDisk:  result.usedDisk,
    freeDisk:  result.freeDisk,
    pctUse:    result.totalDisk > 0 ? Math.round((result.usedDisk / result.totalDisk) * 100) : 0,
    totalRAM:  result.totalRAM,
    usedRAM:   result.usedRAM,
    nodos:     result.nodos,
  };
};

// ── EVENTOS ───────────────────────────────────────────────────────────────────

export const getEvents = (limit = 50) =>
  Event.find().sort({ createdAt: -1 }).limit(limit);
