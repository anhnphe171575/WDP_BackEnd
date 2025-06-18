const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
  },
  brand: {
    type: String,
  },
  category: [
   {
        type: mongoose.Schema.Types.ObjectId,  
        ref: 'Category',
      },
  ],
  variants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProductVariant'
  }],
  createAt: {
    type: Date,
    default: Date.now,
  },
  updateAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Product', productSchema);
