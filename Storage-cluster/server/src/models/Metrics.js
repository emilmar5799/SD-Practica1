const mongoose = require('mongoose');

const metricsSchema = new mongoose.Schema({
    nodeId: String,
    totalMem: Number,
    usedMem: Number,
    freeMem: Number,
    timezone: String,
    timestamp: Date
});

module.exports = mongoose.model("Metrics", metricsSchema);