const mongoose = require('mongoose');

const nodeSchema = new mongoose.Schema({
    nodeId: String,
    mac: String,
    ip: String,
    status: { type: String, default: "UP" },
    lastReport: Date
}, { timestamps: true });

module.exports = mongoose.model("Node", nodeSchema);