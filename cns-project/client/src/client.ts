import net from 'net';
import os from 'os';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import dotenv from 'dotenv';
dotenv.config();

// ── CONFIG ────────────────────────────────────────────────────────────────────
const HOST     = process.env.SERVER_HOST     || 'localhost';
const PORT     = Number(process.env.SERVER_PORT) || 9000;
const NODE_ID  = process.env.NODE_ID         || `node-${os.hostname()}`;
const NOMBRE   = process.env.NODE_NOMBRE     || os.hostname();
let INTERVAL   = Number(process.env.REPORT_INTERVAL_MS) || 10000;

const LOG_DIR  = path.join(__dirname, '..', 'logs');
const LOG_FILE = path.join(LOG_DIR, 'server_messages.log');

// ── LOG ───────────────────────────────────────────────────────────────────────
const log = (type: string, msg: string) => {
  if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
  const line = `[${new Date().toISOString()}] [${type}] ${msg}\n`;
  fs.appendFileSync(LOG_FILE, line);
  console.log(line.trim());
};

// ── OBTENER INFO DISCO ────────────────────────────────────────────────────────
const getDiskInfo = () => {
  try {
    if (process.platform === 'win32') {
      const out = execSync('wmic logicaldisk get size,freespace,caption').toString();
      const lines = out.trim().split('\n').filter(l => l.trim() && !l.includes('Caption'));
      const parts = lines[0].trim().split(/\s+/);
      const free  = parseInt(parts[1]) / (1024 ** 3);
      const total = parseInt(parts[2]) / (1024 ** 3);
      return {
        diskName: parts[0],
        diskType: 'HDD',
        totalGB:  Math.round(total),
        freeGB:   Math.round(free),
        usedGB:   Math.round(total - free),
      };
    } else {
      const out = execSync("df -BG / | tail -1").toString().trim().split(/\s+/);
      const total = parseInt(out[1]);
      const used  = parseInt(out[2]);
      const free  = parseInt(out[3]);
      return {
        diskName: out[0],
        diskType: 'HDD',
        totalGB: total,
        usedGB:  used,
        freeGB:  free,
      };
    }
  } catch {
    // Datos simulados si falla
    return { diskName: 'disk0', diskType: 'HDD', totalGB: 500, usedGB: 120, freeGB: 380 };
  }
};

// ── OBTENER INFO RAM ──────────────────────────────────────────────────────────
const getRAMInfo = () => {
  const totalRAM = Math.round(os.totalmem() / (1024 ** 3));
  const freeRAM  = Math.round(os.freemem()  / (1024 ** 3));
  return { totalRAM, usedRAM: totalRAM - freeRAM };
};

// ── SIMULAR IOPS ──────────────────────────────────────────────────────────────
const getIOPS = () => Math.floor(Math.random() * 9000) + 1000;

// ── CLIENTE TCP ───────────────────────────────────────────────────────────────
let socket: net.Socket;
let timer: NodeJS.Timeout;
let buffer = '';

const connect = () => {
  socket = net.createConnection({ host: HOST, port: PORT }, () => {
    log('INFO', `Conectado al servidor ${HOST}:${PORT}`);
    startSending();
  });

  socket.on('data', (data) => {
    buffer += data.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const msg = JSON.parse(line);
        handleMessage(msg);
      } catch {
        log('WARN', `Mensaje inválido: ${line}`);
      }
    }
  });

  socket.on('close', () => {
    log('WARN', 'Conexión cerrada. Reintentando en 5s...');
    clearInterval(timer);
    setTimeout(connect, 5000);
  });

  socket.on('error', (err) => {
    log('ERROR', `Error de socket: ${err.message}`);
  });
};

// ── MANEJAR MENSAJES DEL SERVIDOR ─────────────────────────────────────────────
const handleMessage = (msg: any) => {
  if (msg.type === 'COMMAND') {
    log('COMMAND', `Servidor dice: ${msg.message}`);
    // Enviar ACK
    send({ type: 'ACK', msgId: msg.msgId, nodeId: NODE_ID, receivedAt: Date.now() });
  }

  if (msg.type === 'CONFIG_UPDATE' && msg.interval) {
    INTERVAL = msg.interval;
    log('CONFIG', `Intervalo actualizado a ${INTERVAL}ms`);
    clearInterval(timer);
    startSending();
  }

  if (msg.type === 'ACK') {
    log('ACK', `Métrica confirmada por servidor`);
  }

  if (msg.type === 'ERROR') {
    log('ERROR', msg.message);
  }
};

// ── ENVIAR MÉTRICA ────────────────────────────────────────────────────────────
const send = (data: any) => {
  if (socket && !socket.destroyed) {
    socket.write(JSON.stringify(data) + '\n');
  }
};

const sendMetric = () => {
  const disk = getDiskInfo();
  const ram  = getRAMInfo();

  const metric = {
    type:            'METRIC',
    nodeId:          NODE_ID,
    nombre:          NOMBRE,
    ...disk,
    ...ram,
    iops:            getIOPS(),
    clientTimestamp: Date.now(),
    timestamp:       Date.now(),
  };

  send(metric);
 log('METRIC', `Enviado: disco ${Math.round(disk.usedGB/disk.totalGB*100)}% | RAM ${ram.usedRAM}/${ram.totalRAM}GB`);
};

const startSending = () => {
  sendMetric();
  timer = setInterval(sendMetric, INTERVAL);
};

// ── INICIO ────────────────────────────────────────────────────────────────────
console.log(`\n🖥️  CNS Cliente TCP`);
console.log(`   Node ID : ${NODE_ID}`);
console.log(`   Nombre  : ${NOMBRE}`);
console.log(`   Servidor: ${HOST}:${PORT}`);
console.log(`   Intervalo: ${INTERVAL / 1000}s\n`);

connect();
