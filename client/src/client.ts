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

// ── OBTENER INFO DISCO (multi-disco) ──────────────────────────────────────────
interface DiskInfo { diskName: string; diskType: string; totalGB: number; usedGB: number; freeGB: number; }

const getDiskInfo = (): DiskInfo[] => {
  try {
    if (process.platform === 'win32') {
      const out = execSync('wmic logicaldisk get size,freespace,caption').toString();
      const lines = out.trim().split('\n').filter(l => l.trim() && !l.includes('Caption'));
      const disks = lines.map(l => {
        const parts = l.trim().split(/\s+/);
        const free  = parseInt(parts[1]) / (1024 ** 3);
        const total = parseInt(parts[2]) / (1024 ** 3);
        return { diskName: parts[0], diskType: 'HDD', totalGB: Math.round(total), freeGB: Math.round(free), usedGB: Math.round(total - free) };
      }).filter(d => d.totalGB > 0);
      return disks.length > 0 ? disks : [{ diskName: 'disk0', diskType: 'HDD', totalGB: 500, usedGB: 120, freeGB: 380 }];
    } else {
      const out = execSync("df -BG | awk 'NR>1 && !/tmpfs|devtmpfs|udev|overlay|squashfs/{print}'").toString();
      const lines = out.trim().split('\n').filter(Boolean);
      const disks = lines.map(l => {
        const p = l.trim().split(/\s+/);
        return { diskName: p[0], diskType: 'HDD', totalGB: parseInt(p[1]) || 0, usedGB: parseInt(p[2]) || 0, freeGB: parseInt(p[3]) || 0 };
      }).filter(d => d.totalGB > 0);
      return disks.length > 0 ? disks : [{ diskName: 'disk0', diskType: 'HDD', totalGB: 500, usedGB: 120, freeGB: 380 }];
    }
  } catch {
    return [{ diskName: 'disk0', diskType: 'HDD', totalGB: 500, usedGB: 120, freeGB: 380 }];
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
  const disks = getDiskInfo();
  const ram   = getRAMInfo();

  const metric = {
    type:            'METRIC',
    nodeId:          NODE_ID,
    nombre:          NOMBRE,
    disks,
    ...ram,
    iops:            getIOPS(),
    clientTimestamp: Date.now(),
    timestamp:       Date.now(),
  };

  send(metric);
  const totalDisk = disks.reduce((s, d) => s + d.totalGB, 0);
  const usedDisk  = disks.reduce((s, d) => s + d.usedGB,  0);
  log('METRIC', `Enviado: ${disks.length} disco(s) ${totalDisk > 0 ? Math.round(usedDisk/totalDisk*100) : 0}% | RAM ${ram.usedRAM}/${ram.totalRAM}GB`);
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
