const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const AuthController = require('../controllers/AuthController');

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

router.post('/login', authController.login);
router.post('/google', authController.googleAuth);
router.post('/register', authController.register);
router.get('/verify-email', authController.VerifyEmail);

module.exports = router;
  
