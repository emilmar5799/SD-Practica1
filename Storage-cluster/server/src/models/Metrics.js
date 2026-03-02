const mongoose = require('mongoose');

const metricsSchema = new mongoose.Schema({
    nodeId: String,
    totalMem: Number,
    usedMem: Number,
    freeMem: Number,
    timestamp: Date,
    timezone: String
});

module.exports = mongoose.model("Metrics", metricsSchema);