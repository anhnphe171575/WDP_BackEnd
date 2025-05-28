const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    rating: {
      type: Number,
      required: true
    },
    comment: String,
    images: [
      {
        url: String
      }
    ]
  }, { timestamps: true });
  
  module.exports = mongoose.model('Review', reviewSchema);
  