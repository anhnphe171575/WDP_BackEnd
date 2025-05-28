const mongoose = require('mongoose');
const { Schema } = mongoose;

const imageSchema = new Schema({
  url: { type: String, required: true }
}, { _id: false });

const attributeSchema = new Schema({
  Attribute_id: { type: Schema.Types.ObjectId, ref: 'Attribute', required: true }
}, { _id: false });

const productVariantSchema = new Schema({
  product_id: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  images: [imageSchema],
  attribute: [attributeSchema],
  sellPrice: { type: Number, required: true }
});

module.exports = mongoose.model('ProductVariant', productVariantSchema);
