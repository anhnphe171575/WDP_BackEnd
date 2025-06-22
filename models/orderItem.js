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
  status: {
    type: String,
    enum: ['completed', 'returned-requested', 'returned'],
    default: 'completed'
  },
  reason: {
    type: String,
    default: ''
  },
  returnQuantity: {
    type: Number,
    default: 0
  },
  
  returnRequestedAt: {type: Date, default: Date.now()},
  returnedAt: { type: Date, default: Date.now() },
}, {
});

module.exports = mongoose.model('OrderItem', orderItemSchema);
