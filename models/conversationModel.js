const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // hoặc 'Customer' nếu bạn có schema riêng cho Customer
    required: true
  },
  staffId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // hoặc 'Staff' nếu bạn có schema riêng cho Staff
    required: true
  },
  lastMessageAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['active', 'closed', 'pending'], 
    default: 'active'
  }
}, { timestamps: true });

module.exports = mongoose.model('Conversation', conversationSchema);
