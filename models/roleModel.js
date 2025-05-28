const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model('Role', roleSchema);
