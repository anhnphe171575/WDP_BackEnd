const mongoose = require('mongoose');

const bannerSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: String,
  imageUrl: {
    type: String,
    required: true
  },
  status: {
    type: String,
    required: true,
    enum: ['active', 'inactive']
  },
  startDate: Date,
  endDate: Date,
  link: String,
}, {
  timestamps: true,
  collection: 'banners'
});

module.exports = mongoose.model('Banner', bannerSchema);
