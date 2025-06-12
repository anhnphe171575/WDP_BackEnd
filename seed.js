const mongoose = require('mongoose');
const seedData = require('./seed/productData');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/your_database_name', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => {
    console.log('Connected to MongoDB');
    return seedData();
})
.then(() => {
    console.log('Seeding completed');
    process.exit(0);
})
.catch((error) => {
    console.error('Error:', error);
    process.exit(1);
}); 