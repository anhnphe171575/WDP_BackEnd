const mongoose = require('mongoose');

const importBatchSchema = new mongoose.Schema({
  variantId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Variant'
  },
  importDate: {
    type: Date,
    required: true
  },
  quantity: {
    type: Number,
    required: true
  },
  costPrice: {
    type: Number,
    required: true
  }
});

module.exports = mongoose.model('ImportBatch', importBatchSchema);
