import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import routes from './routes';
import { startTCPServer } from './tcp';
import { startWatchdog } from './watchdog';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api', routes);

// Health check
app.get('/', (_req, res) => res.json({ status: 'CNS Server corriendo ✅' }));

const start = async () => {
  try {
    // Conectar MongoDB
    await mongoose.connect(process.env.MONGO_URI!);
    console.log('✅ MongoDB Atlas conectado');

    // API REST
    const apiPort = Number(process.env.API_PORT) || 3000;
    app.listen(apiPort, () => {
      console.log(`🚀 API REST en http://localhost:${apiPort}`);
    });

    // TCP Server
    const tcpPort = Number(process.env.TCP_PORT) || 9000;
    startTCPServer(tcpPort);

    // Watchdog
    startWatchdog();

  } catch (err) {
    console.error('❌ Error iniciando servidor:', err);
    process.exit(1);
  }
};

start();
