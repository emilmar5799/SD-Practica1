import { Node } from '../models';
import { markDown } from '../services';

export const startWatchdog = () => {
  const timeout = Number(process.env.NODE_TIMEOUT_MS) || 60000;

  setInterval(async () => {
    const limite = new Date(Date.now() - timeout);
    const caidos = await Node.find({ status: 'active', lastSeen: { $lt: limite } });
    for (const node of caidos) {
      await markDown(node.nodeId);
    }
  }, 15000);

  console.log(`🐕 Watchdog activo (timeout: ${timeout / 1000}s)`);
};
