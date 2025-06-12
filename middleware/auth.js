const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
dotenv.config();
// Middleware kiểm tra token JWT
function verifyToken(req, res, next) {
  // Lấy token từ header Authorization: Bearer <token>
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ message: 'Token không tồn tại' });
  }

  // Tách token khỏi "Bearer "
  const token = authHeader.split(' ')[1];
  console.log(token);
  if (!token) {
    return res.status(401).json({ message: 'Token không hợp lệ' });
  }

  // Kiểm tra và giải mã token
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: 'Token không hợp lệ hoặc hết hạn' });
    }
    // Lưu thông tin user decoded vào req để route tiếp theo dùng
    req.user = decoded;
    next();
  });
}

module.exports = verifyToken;
