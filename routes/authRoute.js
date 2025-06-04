const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');

// Route gửi OTP qua email
router.post('/send-otp', AuthController.sendOTP);

// Route xác thực OTP
router.post('/verify-otp', AuthController.verifyOTP);

// Route đặt lại mật khẩu mới
router.post('/reset-password', AuthController.resetPassword);

/**
 * @swagger
 * api/auth:
 *   post:
 *     summary: Đăng nhập
 *     responses:
 *       200:
 *         description: Thành công
 */

router.post('/login', AuthController.login);
router.post('/register', AuthController.register);
router.get('/verify-email', AuthController.VerifyEmail);
module.exports = router;
  
