const Node = require('../models/Node');
const Metrics = require('../models/Metrics');

const clientsMap = new Map();

exports.registerClient = async (data, socket) => {

    const { nodeId, mac, timezone } = data;

    await Node.findOneAndUpdate(
        { nodeId },
        {
            nodeId,
            mac,
            ip: socket.remoteAddress,
            timezone,
            status: "UP",
            lastReport: new Date()
        },
        { upsert: true }
    );

    clientsMap.set(nodeId, {
        socket,
        lastReport: Date.now()
    });

    console.log(`Nodo registrado: ${nodeId}`);
};

exports.saveMetrics = async (data) => {

    await Metrics.create(data);

    const client = clientsMap.get(data.nodeId);
    if (client) {
        client.lastReport = Date.now();
    }
};

exports.checkInactiveNodes = async (timeout) => {

    const now = Date.now();

    for (const [nodeId, client] of clientsMap.entries()) {
        if (now - client.lastReport > timeout) {
            await Node.updateOne(
                { nodeId },
                { status: "NO REPORTA" }
            );
            console.log(`Nodo ${nodeId} NO REPORTA`);
        }
    }
};

exports.calculateClusterStats = async () => {

    const metrics = await Metrics.find().sort({ timestamp: -1 });

    let total = 0;
    let used = 0;

    metrics.forEach(m => {
        total += m.totalMem;
        used += m.usedMem;
    });

    const percent = total ? (used / total) * 100 : 0;

    console.log("Total Cluster:", total);
    console.log("Uso Global:", percent.toFixed(2) + "%");
};