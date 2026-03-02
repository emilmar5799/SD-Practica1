require('dotenv').config();
const net = require('net');
const connectDB = require('./config/db');
const socketService = require('./services/socketService');
const Node = require('./models/Node'); // <-- Importamos el modelo para poder actualizarlo

connectDB();

const server = net.createServer(async (socket) => {
    socketService.handleConnection(socket);
});

// --- TAREA TRELLO: Control por timeout y Cambio de estado ---
setInterval(async () => {
    try {
        // Configuramos el límite: Si hace más de 15 segundos no reporta...
        const timeoutThreshold = new Date(Date.now() - 15000); 

        // ...buscamos esos nodos y les cambiamos el estado
        const result = await Node.updateMany(
            { lastReport: { $lt: timeoutThreshold }, status: "UP" },
            { $set: { status: "No Reporta" } } // 
        );

        if (result.modifiedCount > 0) {
            console.log(`⚠️ Alerta: ${result.modifiedCount} nodo(s) inactivo(s). Estado cambiado a 'No Reporta'.`);
        }
    } catch (error) {
        console.error("Error al verificar inactividad:", error);
    }
}, 10000); // El servidor hace esta revisión cada 10 segundos
// ------------------------------------------------------------

server.listen(process.env.PORT, () => {
    console.log("Servidor TCP iniciado en puerto", process.env.PORT);
});