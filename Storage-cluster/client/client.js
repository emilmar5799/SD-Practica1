require('dotenv').config();
const net = require('net');
const si = require('systeminformation');
const fs = require('fs');
const path = require('path');

// 1. Definir la ruta de las carpetas (dentro de client)
const logDir = path.join(__dirname, 'logs');
const pendingDir = path.join(__dirname, 'pending');

// 2. Crear las carpetas automáticamente si no existen
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir);
if (!fs.existsSync(pendingDir)) fs.mkdirSync(pendingDir);

// 3. Definir la ruta exacta de los archivos
const logPath = path.join(logDir, 'logs.txt');
const pendingPath = path.join(pendingDir, 'metrics.json');

// Función para registrar logs en archivo [cite: 65, 177]
const writeLog = (msg) => {
    const entry = `${new Date().toISOString()} - ${msg}\n`;
    fs.appendFileSync(logPath, entry);
    console.log(msg);
};

// Obtener datos del primer disco [cite: 52, 66]
async function getMetrics() {
    const disks = await si.blockDevices();
    const firstDisk = disks[0]; // Solo el primero [cite: 66]
    const fsSize = await si.fsSize();
    const diskUsage = fsSize.find(f => f.mount === '/' || f.mount === 'C:') || fsSize[0];

    return {
        nodeId: process.env.NODE_ID,
        diskName: firstDisk.name,
        type: firstDisk.type, // Reporta si es SSD/HDD [cite: 55]
        totalCapacity: (diskUsage.size / (1024 ** 3)).toFixed(2) + " GB", // [cite: 56, 95]
        usedCapacity: (diskUsage.used / (1024 ** 3)).toFixed(2) + " GB", // [cite: 57, 96]
        freeCapacity: (diskUsage.available / (1024 ** 3)).toFixed(2) + " GB", // [cite: 58, 97]
        iops: Math.floor(Math.random() * 500) + 100, // Simulado según [cite: 59]
        timestamp: new Date() // [cite: 60, 140]
    };
}

const client = new net.Socket();
let isConnected = false;
let metricsInterval;

function connect() {
    // Si ya estamos conectados, no hacemos nada
    if (isConnected) return;

    writeLog("Intentando conectar al servidor central...");

    // TAREA: Timeout (Node maneja un timeout por defecto, pero nosotros añadimos reintentos lógicos)
    client.connect(process.env.SERVER_PORT, process.env.SERVER_HOST, () => {
        isConnected = true;
        writeLog("✅ Conectado al servidor central.");

        // Empezar a enviar métricas solo si conectó
        if (metricsInterval) clearInterval(metricsInterval);
        metricsInterval = setInterval(async () => {
            if (isConnected) {
                try {
                    const data = await getMetrics();

                    if (!data || !data.nodeId || !data.totalCapacity) {
                        writeLog("⚠️ Advertencia: Datos de disco incompletos. No se enviará el paquete.");
                        return; // Evita enviar basura al servidor
                    }
                    // ------------------------------------------------

                    client.write(JSON.stringify(data));
                } catch (error) {
                    writeLog(`❌ Error al capturar métricas: ${error.message}`);
                }
            }
        }, process.env.REPORT_INTERVAL || 5000);
    });

    // Escuchar mensajes del servidor
    client.on('data', (data) => {
        const message = data.toString();
        writeLog(`Comando recibido: ${message}`);
        client.write("ACK");
    });
}

// --- TAREAS TRELLO: MANEJO DE FALLOS ---

// TAREA: Conexión rechazada y Timeout
client.on('error', (err) => {
    isConnected = false;
    if (err.code === 'ECONNREFUSED') {
        writeLog("❌ Conexión rechazada: El servidor central está apagado o no responde.");
    } else if (err.code === 'ETIMEDOUT') {
        writeLog("⏱️ Timeout: El servidor tardó demasiado en responder.");
    } else {
        writeLog(`⚠️ Error de socket: ${err.message}`);
    }
});

// TAREA: Desconexión inesperada
client.on('close', () => {
    if (isConnected) {
        writeLog("🔌 Desconexión inesperada del servidor.");
    }
    isConnected = false;
    if (metricsInterval) clearInterval(metricsInterval);

    // Ciclo de reintento: vuelve a intentar conectar cada 5 segundos
    writeLog("Reintentando reconexión en 5 segundos...");
    setTimeout(connect, 5000);
});

// Arrancar la primera vez
connect();