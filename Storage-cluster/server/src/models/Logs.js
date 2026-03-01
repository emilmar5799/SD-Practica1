const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
    nodeId: String,
    logMessage: String,
    timestamp: Date
});

module.exports = mongoose.model("Logs", logSchema);