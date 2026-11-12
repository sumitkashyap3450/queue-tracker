const router = require('express').Router();
const Shop = require('../models/Shop');
const QueueEntry = require('../models/QueueEntry');
const auth = require('../middleware/auth');
const { snapshot, emitQueue } = require('../utils/queue');
const dayKey = () => new Date().toLocaleDateString('en-CA');
router.post('/:shopId/join', async (req, res, next) => {
  try {
    const { customerName, phone } = req.body;
    if (!customerName || customerName.trim().length < 2) return res.status(400).json({ message: 'Please enter your name.' });
    const shop = await Shop.findById(req.params.shopId);
    if (!shop || !shop.isOpen) return res.status(404).json({ message: 'This business is currently unavailable.' });
    const today = dayKey();
    // Atomic increment keeps token allocation safe for concurrent requests.
    const updated = await Shop.findOneAndUpdate({ _id: shop._id }, [
      { $set: { tokenDate: { $ifNull: ['$tokenDate', ''] }, lastToken: { $ifNull: ['$lastToken', 0] } } },
      { $set: { lastToken: { $cond: [{ $eq: ['$tokenDate', today] }, { $add: ['$lastToken', 1] }, 1] }, tokenDate: today } }
    ], { new: true });
    const entry = await QueueEntry.create({ shop: shop._id, customerName: customerName.trim(), phone: phone || '', tokenNumber: updated.lastToken });
    const rows = await snapshot(shop._id, shop.avgServiceMins);
    const mine = rows.find(x => String(x.id) === String(entry._id));
    const io = req.app.get('io'); emitQueue(io, shop._id, rows);
    res.status(201).json({ entry: { id: entry._id, tokenNumber: entry.tokenNumber, status: entry.status }, position: mine.position, estimatedWaitMins: mine.estimatedWaitMins });
  } catch (e) { next(e); }
});
router.get('/:shopId', auth, async (req, res, next) => {
  try {
    const shop = await Shop.findOne({ _id: req.params.shopId, owner: req.user._id });
    if (!shop) return res.status(404).json({ message: 'Shop not found.' });
    const queue = await QueueEntry.find({ shop: shop._id, status: { $in: ['waiting','serving'] } }).sort({ joinedAt: 1 }).select('customerName tokenNumber status joinedAt');
    res.json(queue.map((x, i) => ({ id: x._id, customerName: x.customerName, tokenNumber: x.tokenNumber, status: x.status, joinedAt: x.joinedAt, position: x.status === 'serving' ? 0 : i + 1 })));
  } catch (e) { next(e); }
});
router.post('/:shopId/walk-in', auth, async (req, res, next) => {
  try {
    const shop = await Shop.findOne({ _id: req.params.shopId, owner: req.user._id });
    if (!shop) return res.status(404).json({ message: 'Shop not found.' });
    if (!req.body.customerName) return res.status(400).json({ message: 'Customer name is required.' });
    const today = dayKey();
    const updated = await Shop.findOneAndUpdate({ _id: shop._id }, [
      { $set: { tokenDate: { $ifNull: ['$tokenDate', ''] }, lastToken: { $ifNull: ['$lastToken', 0] } } },
      { $set: { lastToken: { $cond: [{ $eq: ['$tokenDate', today] }, { $add: ['$lastToken', 1] }, 1] }, tokenDate: today } }
    ], { new: true });
    const entry = await QueueEntry.create({ shop: shop._id, customerName: req.body.customerName.trim(), tokenNumber: updated.lastToken });
    const rows = await snapshot(shop._id, shop.avgServiceMins); emitQueue(req.app.get('io'), shop._id, rows);
    res.status(201).json({ id: entry._id, tokenNumber: entry.tokenNumber });
  } catch (e) { next(e); }
});
router.patch('/entry/:entryId/status', auth, async (req, res, next) => {
  try {
    const allowed = ['serving','done','skipped','cancelled','waiting'];
    if (!allowed.includes(req.body.status)) return res.status(400).json({ message: 'Invalid queue status.' });
    const entry = await QueueEntry.findById(req.params.entryId);
    if (!entry) return res.status(404).json({ message: 'Queue entry not found.' });
    const shop = await Shop.findOne({ _id: entry.shop, owner: req.user._id });
    if (!shop) return res.status(403).json({ message: 'You cannot manage this queue.' });
    entry.status = req.body.status;
    if (entry.status === 'serving') entry.servedAt = new Date();
    if (['done','skipped','cancelled'].includes(entry.status)) entry.completedAt = new Date();
    await entry.save();
    const rows = await snapshot(shop._id, shop.avgServiceMins); emitQueue(req.app.get('io'), shop._id, rows);
    res.json({ message: 'Queue updated.', queue: rows });
  } catch (e) { next(e); }
});
router.get('/:shopId/analytics', auth, async (req, res, next) => {
  try {
    const shop = await Shop.findOne({ _id: req.params.shopId, owner: req.user._id });
    if (!shop) return res.status(404).json({ message: 'Shop not found.' });
    const start = new Date(); start.setHours(0,0,0,0);
    const [total, completed, waiting, serving] = await Promise.all([
      QueueEntry.countDocuments({ shop: shop._id, joinedAt: { $gte: start } }),
      QueueEntry.countDocuments({ shop: shop._id, status: 'done', joinedAt: { $gte: start } }),
      QueueEntry.countDocuments({ shop: shop._id, status: 'waiting' }),
      QueueEntry.countDocuments({ shop: shop._id, status: 'serving' })
    ]);
    res.json({ total, completed, waiting, serving });
  } catch (e) { next(e); }
});
module.exports = router;
