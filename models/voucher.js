const mongoose = require('mongoose');

const voucherSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
  },
  discountAmount: {
    type: Number,
    default: 0,
  },
  discountPercent: {
    type: Number,
    default: 0,
  },
  validFrom: {
    type: Date,
    required: true,
  },
  validTo: {
    type: Date,
    required: true,
  },
  usageLimit: {
    type: Number,
    default: 0,
  },
  usedCount: {
    type: Number,
    default: 0,
  },
  applicableProducts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
  }],
}, {
  timestamps: true,
});

const Voucher = mongoose.model('Voucher', voucherSchema);

module.exports = Voucher;
