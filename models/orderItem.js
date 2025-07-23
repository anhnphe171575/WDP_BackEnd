const mongoose = require('mongoose');
const productVariant = require('./productVariant');

const orderItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  productVariant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProductVariant',
    required: true
  },
  quantity: {
    type: Number,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  reason: {
    type: String,
    default: ''
  },
  cancelRequestedQuantity: {
    type: Number,
    default: 0
  },
  cancelRequestedAt: { type: Date },
}, {
});

module.exports = mongoose.model('OrderItem', orderItemSchema);
