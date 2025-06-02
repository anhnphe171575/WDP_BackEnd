const express = require('express');
const router = express.Router();
const authController = require('../controller/authController');
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
module.exports = router;
  