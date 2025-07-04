const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const verifyToken = require('../middleware/auth');

/**
 * @swagger
 * /auth/send-otp:
 *   post:
 *     summary: Gửi OTP qua email
 */
router.post('/send-otp', authController.sendOTP);

/**
 * @swagger
 * /auth/verify-otp:
 *   post:
 *     summary: Xác thực OTP
 */
router.post('/verify-otp', authController.verifyOTP);

/**
 * @swagger
 * /auth/reset-password:
 *   post:
 *     summary: Đặt lại mật khẩu mới
 */
router.post('/reset-password', authController.resetPassword);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Đăng nhập
 */
router.post('/login', authController.login);

router.post("/resend-verification", authController.resendVerificationEmail);


/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Đăng ký tài khoản
 */
router.post('/register', authController.register);

/**
 * @swagger
 * /auth/verify-email:
 *   get:
 *     summary: Xác thực email
 */
router.get('/verify-email', authController.VerifyEmail);

/**
 * @swagger
 * /auth/myprofile:
 *   get:
 *     summary: Lấy thông tin cá nhân (yêu cầu đăng nhập)
 */
router.get('/myprofile', verifyToken, authController.UserProfile);

/**
 * @swagger
 * /auth/google:
 *   post:
 *     summary: Đăng nhập bằng Google
 */
router.post('/google', authController.googleAuth);

/**
 * @swagger
 * /auth/changepassword:
 *   post:
 *     summary: Đổi mật khẩu (yêu cầu đăng nhập)
 */
router.post('/changepassword', verifyToken, authController.changePassword);

module.exports = router;
  
