const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const verifyToken = require('../middleware/auth');
const { ROLES } = require('../config/role.js');
const authorizeRoles = require('../middleware/authorization.js');

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
 * /api/auth/login:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Đăng nhập tài khoản
 *     description: Đăng nhập bằng email và mật khẩu để nhận JWT token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email đăng nhập
 *                 example: "user@example.com"
 *               password:
 *                 type: string
 *                 description: Mật khẩu tài khoản
 *                 example: "password123"
 *     responses:
 *       200:
 *         description: Đăng nhập thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Đăng nhập thành công"
 *                 token:
 *                   type: string
 *                   description: JWT token để xác thực
 *                   example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: ID của user
 *                       example: "507f1f77bcf86cd799439011"
 *                     email:
 *                       type: string
 *                       format: email
 *                       example: "user@example.com"
 *                     role:
 *                       type: number
 *                       description: Vai trò của user 
 *                       example: 1
 *       400:
 *         description: Lỗi validation hoặc thông tin đăng nhập không đúng
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Email hoặc mật khẩu không đúng"
 *       500:
 *         description: Lỗi server
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Lỗi server"
 *                 error:
 *                   type: string
 *                   description: Chi tiết lỗi
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
router.get('/myprofile',  verifyToken, authController.UserProfile);

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
  
