const mongoose = require('mongoose');
 
const addressSchema = new mongoose.Schema({
  street: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String },
  postalCode: { type: String, required: true },
  country: { type: String, required: true }
}, { _id: true });

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  address: [addressSchema],
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String },
  dob: { type: Date }, 
  role: { type: Number, default: 0 }, 
 
}, { timestamps: true });
 
module.exports = mongoose.model('User', userSchema);