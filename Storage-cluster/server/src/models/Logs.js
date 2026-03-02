const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
    nodeId: String,
    message: String,
    timestamp: Date
});

module.exports = mongoose.model("Logs", logSchema);