const { MongoClient } = require('mongodb');

// URL kết nối (thường là mongodb://localhost:27017 hoặc URI Atlas)
const uri = 'mongodb+srv://phuanhpro11:123@wdp.5nczhuu.mongodb.net/?retryWrites=true&w=majority&appName=WDP';

// Tên database
const dbName = 'petnest';

async function main() {
  const client = new MongoClient(uri);

  try {
    // Kết nối tới MongoDB
    await client.connect();
    console.log('Connected successfully to MongoDB');

    const db = client.db(dbName);
    // Bạn có thể thao tác với db ở đây

  } catch (err) {
    console.error(err);
  } finally {
    await client.close();
  }
}

main();
