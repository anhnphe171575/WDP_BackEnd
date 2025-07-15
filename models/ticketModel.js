const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  category: { 
    type: String, 
    required: true, 
    enum: ['report', 'support'] 
  },
  type: { type: String, required: true }, 
  status: { 
    type: String, 
    default: 'new', 
    enum: ['new', 'processing', 'resolved', 'closed'] 
  },
  title: { type: String },  
  content: { type: String, required: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  priority: { type: String, enum: ['normal', 'high', 'urgent'], default: 'normal' },
  response: { type: String }, 
  internalNote: { type: String },
  handlerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('Ticket', ticketSchema);
