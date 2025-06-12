const mongoose = require('mongoose');
const Category = require('./category');

const attributeSchema = new mongoose.Schema({
  value: {
    type: String,
    required: true
  },
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Attribute'
  },
  categories:[{
    type: mongoose.Schema.Types.ObjectId,
    ref: Category
  }],
  description: {
    type: String
  }
});

module.exports = mongoose.model('Attribute', attributeSchema);
