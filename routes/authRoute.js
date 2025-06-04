const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
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
  