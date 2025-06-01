const mongoose = require('mongoose');

const uri = 'mongodb+srv://phuanhpro11:123@wdp.5nczhuu.mongodb.net/petnest?retryWrites=true&w=majority&appName=WDP';

const connectDB = async () => {
  try {
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected successfully to MongoDB with Mongoose');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1); // Dừng server nếu lỗi kết nối
  }
};

module.exports = connectDB;
