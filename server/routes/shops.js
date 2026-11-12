const router = require('express').Router();
const Shop = require('../models/Shop');
const QueueEntry = require('../models/QueueEntry');
const auth = require('../middleware/auth');
const { snapshot } = require('../utils/queue');
const slugify = value => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
router.get('/', async (req, res, next) => {
  try {
    const shops = await Shop.find({ isOpen: true }).select('name category address description slug avgServiceMins');
    res.json(shops);
  } catch (e) { next(e); }
});
router.get('/mine', auth, async (req, res, next) => {
  try { res.json(await Shop.find({ owner: req.user._id })); } catch (e) { next(e); }
});
router.post('/', auth, async (req, res, next) => {
  try {
    const { name, category, address, description, avgServiceMins } = req.body;
    if (!name || !category || !address) return res.status(400).json({ message: 'Shop name, category and address are required.' });
    let slug = slugify(name), suffix = 1;
    while (await Shop.exists({ slug })) slug = `${slugify(name)}-${suffix++}`;
    const shop = await Shop.create({ owner: req.user._id, name, category, address, description, avgServiceMins: Number(avgServiceMins) || 15, slug });
    res.status(201).json(shop);
  } catch (e) { next(e); }
});
router.get('/:slug', async (req, res, next) => {
  try {
    const shop = await Shop.findOne({ slug: req.params.slug }).select('name category address description avgServiceMins isOpen slug');
    if (!shop) return res.status(404).json({ message: 'Shop not found.' });
    const queue = await snapshot(shop._id, shop.avgServiceMins);
    res.json({ shop, queue, waitingCount: queue.filter(x => x.status === 'waiting').length });
  } catch (e) { next(e); }
});
router.patch('/:id', auth, async (req, res, next) => {
  try {
    const shop = await Shop.findOne({ _id: req.params.id, owner: req.user._id });
    if (!shop) return res.status(404).json({ message: 'Shop not found.' });
    for (const key of ['name','category','address','description','isOpen']) if (req.body[key] !== undefined) shop[key] = req.body[key];
    if (req.body.avgServiceMins !== undefined) shop.avgServiceMins = Math.max(1, Math.min(240, Number(req.body.avgServiceMins)));
    await shop.save(); res.json(shop);
  } catch (e) { next(e); }
});
module.exports = router;
