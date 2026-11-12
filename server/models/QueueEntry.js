const mongoose = require('mongoose');
const queueSchema = new mongoose.Schema({
  shop: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true, index: true },
  customerName: { type: String, required: true, trim: true, maxlength: 80 },
  phone: { type: String, trim: true, default: '', select: false },
  tokenNumber: { type: Number, required: true },
  status: { type: String, enum: ['waiting', 'serving', 'done', 'skipped', 'cancelled'], default: 'waiting', index: true },
  joinedAt: { type: Date, default: Date.now },
  servedAt: Date,
  completedAt: Date
}, { timestamps: true });
queueSchema.index({ shop: 1, joinedAt: 1, status: 1 });
module.exports = mongoose.model('QueueEntry', queueSchema);
