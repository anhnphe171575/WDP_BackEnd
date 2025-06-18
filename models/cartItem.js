const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const cartItemSchema = new Schema({
  productId: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  productVariantId: {
    type: Schema.Types.ObjectId,
    ref: 'ProductVariant'
  },  
  quantity: {
    type: Number,
    required: true,
    min: 1
  }
}, { timestamps: true });

module.exports = mongoose.model('CartItem', cartItemSchema);
