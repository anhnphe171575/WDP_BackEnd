const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationControler');
const verifyToken = require('../middleware/auth');

// Lấy tất cả notification của user
router.get('/', verifyToken, notificationController.getAllNotifications);

// Cập nhật trạng thái isRead của notification
router.patch('/:id', verifyToken, notificationController.markAsRead);

module.exports = router;
