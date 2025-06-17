const mongoose = require('mongoose');
const Schema = mongoose.Schema;


const OrderSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  },
  OrderItems: [{
      type: Schema.Types.ObjectId,
      ref: 'OrderItem'
    
  }],
  total: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    required: true,
    emum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    required: true
  },
  voucher: [{
    type: Schema.Types.ObjectId,
    ref: 'Voucher'
  }],
  createAt: {
    type: Date,
    default: Date.now
  },
  updateAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Order', OrderSchema);
