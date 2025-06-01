const mongoose = require('mongoose');
const { Schema } = mongoose;


const productVariantSchema = new Schema({
  product_id: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  images: [{
    url: { type: String, required: true }
  }],
  attribute: [{
    type: Schema.Types.ObjectId,
    ref: 'Attribute'
  }],
  sellPrice: { type: Number, required: true }
});

module.exports = mongoose.model('ProductVariant', productVariantSchema);
