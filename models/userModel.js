const mongoose = require('mongoose');
 
const addressSchema = new mongoose.Schema({
  street: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String },
  postalCode: { type: String, required: true },
  country: { type: String, required: true, default: 'Vietnam' }
}, { _id: true });

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  address: [addressSchema],
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String },
  dob: { type: Date }, 
  role: { type: Number, default: 1 }, 
  verified: { type: Boolean, default: false },
  verificationToken: {
    type: String,
    trim: true,
  },
  verificationTokenExpires: { type: Date },
  googleId: { type: String, unique: true, sparse: true },
  avatar: { type: String }
}, { timestamps: true }, { collection: 'users' });
const ROLES = {
  ADMIN_DEVELOPER: 0,
  CUSTOMER: 1 << 0,
  ORDER_MANAGER: 1 << 1,
  MARKETING_MANAGER: 1 << 2,
  WAREHOUSE_STAFF: 1 << 3,
  CUSTOMER_SERVICE: 1 << 4,
  ADMIN_BUSINESS: 1 << 5,
};

const parseRoles = (bitmask) => {
  const activeRoles = [];

  for (const [roleName, roleValue] of Object.entries(ROLES)) {
    if (roleValue !== 0 && (bitmask & roleValue) === roleValue) {
      activeRoles.push(roleName);
    }
  }

  // Riêng ADMIN_DEVELOPER là 0, nên ta xét đặc biệt:
  if (bitmask === 0) {
    activeRoles.push('ADMIN_DEVELOPER');
  }

  return activeRoles;
};

 
module.exports = mongoose.model('User', userSchema);