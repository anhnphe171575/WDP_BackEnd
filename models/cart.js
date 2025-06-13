const mongoose = require('mongoose');
const Schema = mongoose.Schema;


const CartSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  },
  cartItems: [{
      type: Schema.Types.ObjectId,
      ref: 'CartItem'
    }
],
}, {
  timestamps: { createdAt: 'createAt', updatedAt: 'updateAt' }
});

module.exports = mongoose.model('Cart', CartSchema);
