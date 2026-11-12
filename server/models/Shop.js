const mongoose = require('mongoose');
const shopSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 100 },
  category: { type: String, required: true, trim: true },
  address: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  avgServiceMins: { type: Number, default: 15, min: 1, max: 240 },
  isOpen: { type: Boolean, default: true },
  slug: { type: String, required: true, unique: true, lowercase: true },
  tokenDate: { type: String, default: '' },
  lastToken: { type: Number, default: 0 }
}, { timestamps: true });
module.exports = mongoose.model('Shop', shopSchema);
