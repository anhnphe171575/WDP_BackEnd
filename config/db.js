const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const uri = process.env.MONGODB_URI;
const dbName = 'petnest';

const connectDB = async () => {
  try {
    await mongoose.connect(uri, {
      dbName: dbName,
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected successfully to MongoDB');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  }
};

module.exports = connectDB;