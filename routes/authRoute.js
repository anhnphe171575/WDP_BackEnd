const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/AuthController');

// Route gửi OTP qua email
router.post('/send-otp', AuthController.sendOTP);

// Route xác thực OTP
router.post('/verify-otp', AuthController.verifyOTP);

// Route đặt lại mật khẩu mới
router.post('/reset-password', AuthController.resetPassword);

module.exports = router;

