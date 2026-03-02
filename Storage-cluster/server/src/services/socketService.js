const Metrics = require('../models/Metrics');
const Node = require('../models/Node');

const activeConnections = new Map();

const handleConnection = (socket) => {

    let currentNodeId = null; // Guardará el ID de este cliente
    console.log('Nueva conexión de un nodo regional detectada.');

    socket.on('data', async (data) => {
        try {
            const payload = JSON.parse(data.toString());

            // Verificamos que el JSON tenga los campos mínimos obligatorios
            if (!payload.nodeId || !payload.totalCapacity || !payload.usedCapacity) {
                console.warn(`⚠️ Estructura de datos inválida recibida. Ignorando paquete.`);
                return; // Cortamos la ejecución aquí para no guardar basura en la base de datos
            }
            // ----------------------------------------------

            console.log(`Métricas recibidas de: ${payload.nodeId}`);
            // Si es la primera vez que este cliente habla, lo guardamos en el directorio
            if (!currentNodeId) {
                currentNodeId = payload.nodeId;
                activeConnections.set(currentNodeId, socket);
            }

            // 1. Guardar o actualizar el estado del Nodo (Auto-registro)
            await Node.findOneAndUpdate(
                { nodeId: payload.nodeId },
                {
                    lastReport: new Date(),
                    status: "UP"
                },
                { upsert: true }
            );

            // 2. Persistir métricas en la base de datos
            const newMetric = new Metrics({
                nodeId: payload.nodeId,
                totalMem: parseFloat(payload.totalCapacity), // Usamos los campos que envía tu cliente
                usedMem: parseFloat(payload.usedCapacity),
                freeMem: parseFloat(payload.freeCapacity),
                timestamp: payload.timestamp || new Date()
            });
            await newMetric.save();

            // 3. Ejemplo de comunicación bidireccional (Servidor -> Cliente)
            // Si el disco está muy lleno, enviamos un comando
            if (parseFloat(payload.usedCapacity) > 350) {
                socket.write("ALERTA: Verifique espacio en disco");
            }

        } catch (error) {
            if (data.toString() === "ACK") {
                console.log("Confirmación (ACK) recibida del cliente.");
            } else {
                console.error("Error procesando datos:", error.message);
            }
        }
    });

    socket.on('end', () => {
        // TAREA: Liberación de recursos
        if (currentNodeId) {
            activeConnections.delete(currentNodeId); 
            console.log(`Cliente desconectado y liberado de memoria: ${currentNodeId}`);
        } else {
            console.log('Cliente desconectado.');
        }
    });

    socket.on('error', (err) => {
        // TAREA: Liberación de recursos
        if (currentNodeId) {
            activeConnections.delete(currentNodeId); 
        }
        
        // Ignoramos el error si fue solo una desconexión abrupta
        if (err.code === 'ECONNRESET') {
            console.log(`El cliente ${currentNodeId || 'desconocido'} se desconectó abruptamente y fue liberado.`);
        } else {
            console.error('Error en el socket:', err.message);
        }
    });
};

module.exports = { handleConnection };