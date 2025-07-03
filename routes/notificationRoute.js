const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationControler');
const verifyToken = require('../middleware/auth');

// Lấy tất cả notification của user
router.get('/', verifyToken, notificationController.getAllNotifications);

// Tạo notification mới (dùng cho test hoặc admin)
router.post('/', verifyToken, notificationController.createNotification);

// Xóa tất cả notification của user
router.delete('/', verifyToken, notificationController.deleteAllNotifications);

// Xóa notification theo id
router.delete('/:id', verifyToken, notificationController.deleteNotification);

// Cập nhật trạng thái isRead của notification
router.patch('/:id', verifyToken, notificationController.markAsRead);

// Lấy chi tiết notification
router.get('/:id', verifyToken, notificationController.getNotificationById);



module.exports = router;
