const QueueEntry = require('../models/QueueEntry');
const active = ['waiting', 'serving'];
async function snapshot(shopId, avgServiceMins) {
  const entries = await QueueEntry.find({ shop: shopId, status: { $in: active } }).sort({ joinedAt: 1 }).select('customerName tokenNumber status joinedAt');
  return entries.map((entry, index) => ({
    id: entry._id, customerName: entry.customerName, tokenNumber: entry.tokenNumber,
    status: entry.status, position: entry.status === 'serving' ? 0 : index + 1,
    estimatedWaitMins: entry.status === 'serving' ? 0 : Math.max(0, index * avgServiceMins)
  }));
}
function emitQueue(io, shopId, rows) { io.to(`shop:${shopId}`).emit('queue:updated', rows); }
module.exports = { snapshot, emitQueue };
