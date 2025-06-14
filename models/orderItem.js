const mongoose = require('mongoose');
const productVariant = require('./productVariant');

const orderItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  productVariant:{
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
  productVariant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProductVariant',
    required: true
  }
});

module.exports = mongoose.model('OrderItem', orderItemSchema);
