const express = require('express');
const router = express.Router();
<<<<<<< HEAD
const AuthController = require('../controllers/authController');

// Route gửi OTP qua email
router.post('/send-otp', AuthController.sendOTP);

// Route xác thực OTP
router.post('/verify-otp', AuthController.verifyOTP);

// Route đặt lại mật khẩu mới
router.post('/reset-password', AuthController.resetPassword);

=======
const authController = require('../controllers/authController');
>>>>>>> Long
/**
 * @swagger
 * api/auth:
 *   post:
 *     summary: Đăng nhập
 *     responses:
 *       200:
 *         description: Thành công
 */

<<<<<<< HEAD
router.post('/login', AuthController.login);
router.post('/register', AuthController.register);
router.get('/verify-email', AuthController.VerifyEmail);
=======
router.post('/login', authController.login);
router.post('/google', authController.googleAuth);
router.post('/register', authController.register);
router.get('/verify-email', authController.VerifyEmail);

>>>>>>> Long
module.exports = router;
  
