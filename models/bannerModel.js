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
  startDate: Date,
  endDate: Date,
  link: String,
}, { timestamps: true });

module.exports = mongoose.model('Banner', bannerSchema);
