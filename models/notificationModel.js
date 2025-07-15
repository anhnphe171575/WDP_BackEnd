const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', 
    required: true
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order', // Tham chiếu đến đơn hàng liên quan (nếu có)
    required: false
  }
  ,
  title: {
    type: String,
    required: true
  },
  description: String,
  type: {
    type: String,
    required: true
  },
  isRead: {
    type: Boolean,
    default: false
  },
  ticketId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ticket' },
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);
