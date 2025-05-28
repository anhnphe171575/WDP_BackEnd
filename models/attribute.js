const mongoose = require('mongoose');

const attributeSchema = new mongoose.Schema({
  value: {
    type: String,
    required: true
  },
  description: {
    type: String
  }
});

module.exports = mongoose.model('Attribute', attributeSchema);
