const express = require('express');
const router = express.Router();
const User = require('../models/userModel');
const userController = require('../controllers/UserController')
/**
 * @swagger
 * /users:
 *   get:
 *     summary: Lấy danh sách người dùng
 *     responses:
 *       200:
 *         description: Thành công
 */
router.get('/alluser',userController.getAllUsers)


// router.get('/myProfile',)



module.exports = router;
  