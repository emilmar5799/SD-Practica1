require('dotenv').config();
const net = require('net');
const connectDB = require('./config/db');
const socketService = require('./services/socketService');

connectDB();

const server = net.createServer(async (socket) => {
    socketService.handleConnection(socket);
});

server.listen(process.env.PORT, () => {
    console.log("Servidor TCP iniciado en puerto", process.env.PORT);
});