import mongoose from 'mongoose';

// ── NODO ──────────────────────────────────────────────────────────────────────
export const Node = mongoose.model('Node', new mongoose.Schema({
  nodeId:      { type: String, required: true, unique: true },
  nombre:      { type: String, default: '' },
  ip:          { type: String, default: '' },
  status:      { type: String, enum: ['active', 'no_report'], default: 'active' },
  lastSeen:    { type: Date, default: Date.now },
  connectedAt: { type: Date, default: Date.now },
}, { timestamps: true }));

// ── MÉTRICA ───────────────────────────────────────────────────────────────────
const MetricSchema = new mongoose.Schema({
  nodeId:          { type: String, required: true },
  diskName:        { type: String, default: 'disk0' },
  diskType:        { type: String, default: 'HDD' },
  totalGB:         { type: Number, default: 0 },
  usedGB:          { type: Number, default: 0 },
  freeGB:          { type: Number, default: 0 },
  pctUse:          { type: Number, default: 0 },
  iops:            { type: Number, default: 0 },
  totalRAM:        { type: Number, default: 0 },
  usedRAM:         { type: Number, default: 0 },
  clientTimestamp: { type: Number, default: 0 },
  serverTimestamp: { type: Number, default: 0 },
  latencyMs:       { type: Number, default: 0 },
}, { timestamps: true });

MetricSchema.index({ nodeId: 1, createdAt: -1 });
MetricSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 }); // 30 días

export const Metric = mongoose.model('Metric', MetricSchema);

// ── EVENTO ────────────────────────────────────────────────────────────────────
export const Event = mongoose.model('Event', new mongoose.Schema({
  nodeId:   { type: String, required: true },
  type:     { type: String, enum: ['UP', 'DOWN'] },
  duration: { type: Number, default: 0 },
}, { timestamps: true }));
