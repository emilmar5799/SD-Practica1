import { Router, Request, Response } from 'express';
import { getNodes, getHistory, getCluster, getEvents } from '../services';

const router = Router();

// Todos los nodos
router.get('/nodes', async (_req: Request, res: Response) => {
  try {
    const nodes = await getNodes();
    res.json(nodes);
  } catch (e) {
    res.status(500).json({ error: 'Error obteniendo nodos' });
  }
});

// Historial de un nodo
router.get('/nodes/:id/history', async (req: Request, res: Response) => {
  try {
    const data = await getHistory(req.params.id);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: 'Error obteniendo historial' });
  }
});

// Métricas globales del cluster
router.get('/cluster', async (_req: Request, res: Response) => {
  try {
    const data = await getCluster();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: 'Error obteniendo cluster' });
  }
});

// Eventos UP/DOWN
router.get('/events', async (_req: Request, res: Response) => {
  try {
    const data = await getEvents();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: 'Error obteniendo eventos' });
  }
});

// Enviar comando a un nodo (el TCP server lo despacha)
router.post('/command', (req: Request, res: Response) => {
  const { nodeId, message } = req.body;
  if (!nodeId || !message) {
    res.status(400).json({ error: 'Faltan nodeId o message' });
    return;
  }
  // Emitir al TCP server via evento global
 (process as any).emit('send-command', { nodeId, message });
  res.json({ ok: true, nodeId, message });
});

export default router;
