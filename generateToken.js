const jwt = require('jsonwebtoken');
require('dotenv').config();

const payload = {
  id: "6836d927d6b8bb6da4e00229", // ID giả lập user, ông thay bằng ID thật nếu cần
  name: "Tran Thi B",
  email: "anhnphe171575@fpt.edu.vn"
};

const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

console.log("Generated JWT token:");
console.log(token);
