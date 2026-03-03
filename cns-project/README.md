# CNS · Storage Cluster Monitor

## Estructura
```
cns-project/
├── server/     → API REST + TCP Server + MongoDB
├── client/     → Nodo cliente TCP
└── frontend/   → Dashboard React
```

---

## 1. CONFIGURAR MONGODB ATLAS

1. Ir a https://mongodb.com/atlas y crear cuenta gratis
2. Crear cluster M0 (gratis)
3. Database Access → crear usuario con rol readWrite
4. Network Access → agregar IP `0.0.0.0/0`
5. Connect → Drivers → copiar la URI de conexión

---

## 2. INICIAR EL SERVIDOR

```bash
cd server
npm install
```

Editar `.env` con tu URI de MongoDB:
```
MONGO_URI=mongodb+srv://USUARIO:PASSWORD@cluster0.xxxxx.mongodb.net/cns_cluster
TCP_PORT=9000
API_PORT=3000
NODE_TIMEOUT_MS=60000
```

Iniciar:
```bash
npm run dev
```

Deberías ver:
```
✅ MongoDB Atlas conectado
🚀 API REST en http://localhost:3000
🔌 TCP Server escuchando en puerto 9000
🐕 Watchdog activo
```

---

## 3. INICIAR EL CLIENTE (cada nodo regional)

```bash
cd client
npm install
```

Editar `.env`:
```
SERVER_HOST=192.168.1.X   ← IP del servidor en tu red
SERVER_PORT=9000
NODE_ID=lpz-01            ← ID único por nodo
NODE_NOMBRE=La Paz        ← Nombre del departamento
REPORT_INTERVAL_MS=10000  ← Cada 10 segundos
```

> **Nota:** el cliente ahora detecta **todas** las unidades lógicas del equipo (C:, D:, etc.)
> y las envía por separado al servidor. Si la conexión TCP se interrumpe el cliente
> sigue generando métricas y las guarda en `client/logs/unsent_metrics.log`; en cuanto
> recupera la conexión se reenvía automáticamente todo lo acumulado.

Iniciar:
```bash
npm run start
```

Para simular los 9 nodos en una sola máquina,
abrir 9 terminales con distintos NODE_ID y NODE_NOMBRE.

---

## 4. INICIAR EL DASHBOARD

```bash
cd frontend
npm install
npm run dev
```

Abrir: http://localhost:5173

---

## IDs de nodos recomendados

| NODE_ID   | NODE_NOMBRE  |
|-----------|--------------|
| lpz-01    | La Paz       |
| cbba-01   | Cochabamba   |
| scz-01    | Santa Cruz   |
| oru-01    | Oruro        |
| pot-01    | Potosí       |
| suc-01    | Sucre        |
| tar-01    | Tarija       |
| ben-01    | Beni         |
| pan-01    | Pando        |

---

## API REST disponible

| Método | Ruta                        | Descripción              |
|--------|-----------------------------|--------------------------|
| GET    | /api/nodes                  | Lista todos los nodos    |
| GET    | /api/nodes/:id/history      | Historial de un nodo     |
| GET    | /api/cluster                | Métricas globales        |
| GET    | /api/events                 | Eventos UP/DOWN          |
| POST   | /api/command                | Enviar comando a un nodo |

---

## Troubleshooting

**No conecta a MongoDB:**
→ Verificar MONGO_URI en server/.env
→ Verificar que la IP está en Network Access de Atlas

**Cliente no conecta al servidor:**
→ Verificar SERVER_HOST en client/.env (usar IP LAN, no localhost)
→ Verificar que el puerto 9000 no esté bloqueado por firewall

**Dashboard no carga datos:**
→ Verificar que el servidor esté corriendo en puerto 3000
→ El proxy de Vite redirige /api → localhost:3000 automáticamente
