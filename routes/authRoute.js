const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Route gửi OTP qua email
router.post('/send-otp', authController.sendOTP);

// Route xác thực OTP
router.post('/verify-otp', authController.verifyOTP);

// Route đặt lại mật khẩu mới
router.post('/reset-password', authController.resetPassword);

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
router.post('/register', authController.register);
router.get('/verify-email', authController.VerifyEmail);

router.post('/google', authController.googleAuth);

module.exports = router;
  
