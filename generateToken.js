const jwt = require('jsonwebtoken');
require('dotenv').config();

const payload = {
  id: "6836d927d6b8bb6da4e00228", // ID giả lập user, ông thay bằng ID thật nếu cần
  name: "Nguyen Van A",
  email: "nguyenvana@example.com"
};

const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

console.log("Generated JWT token:");
console.log(token);
