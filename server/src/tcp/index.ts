import net from 'net';
import { saveNode, saveMetric } from '../services';

const MAX_CLIENTS = 9;
const clients = new Map<string, net.Socket>(); // nodeId → socket

export const startTCPServer = (port: number) => {
  const server = net.createServer((socket) => {
    const ip = socket.remoteAddress || 'unknown';
    let nodeId = '';
    let buffer = '';

    console.log(`🔌 Nueva conexión desde ${ip}`);

    // Rechazar si ya hay 9 clientes
    if (clients.size >= MAX_CLIENTS) {
      socket.write(JSON.stringify({ type: 'ERROR', message: 'Servidor lleno (máx 9 nodos)' }) + '\n');
      socket.destroy();
      console.log(`❌ Conexión rechazada - servidor lleno`);
      return;
    }

    // Recibir datos
    socket.on('data', async (data) => {
      buffer += data.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const msg = JSON.parse(line);

          // Registro de nodo
          if (msg.type === 'METRIC') {
            nodeId = msg.nodeId;
            clients.set(nodeId, socket);

            await saveNode(nodeId, ip, msg.nombre);
            await saveMetric({ ...msg, clientTimestamp: msg.timestamp });

            // ACK al cliente
            socket.write(JSON.stringify({ type: 'ACK', nodeId }) + '\n');
          }

          // ACK de comando recibido
          if (msg.type === 'ACK') {
            console.log(`✅ ACK recibido de ${msg.nodeId}: ${msg.msgId}`);
          }

        } catch {
          console.log(`⚠️  Mensaje inválido de ${ip}`);
        }
      }
    });

    // Desconexión
    socket.on('close', () => {
      if (nodeId) {
        clients.delete(nodeId);
        console.log(`🔴 Nodo desconectado: ${nodeId}`);
      }
    });

    socket.on('error', () => {
      if (nodeId) clients.delete(nodeId);
    });
  });

  // Escuchar comandos desde la API REST
  process.on('send-command' as any, ({ nodeId, message }: { nodeId: string, message: string }) => {
    const socket = clients.get(nodeId);
    if (socket && !socket.destroyed) {
      const msgId = Date.now().toString();
      socket.write(JSON.stringify({ type: 'COMMAND', msgId, message }) + '\n');
      console.log(`📤 Comando enviado a ${nodeId}: ${message}`);
    } else {
      console.log(`⚠️  No se pudo enviar comando a ${nodeId} - no conectado`);
    }
  });

  server.listen(port, () => {
    console.log(`🔌 TCP Server escuchando en puerto ${port}`);
  });

  return server;
};
