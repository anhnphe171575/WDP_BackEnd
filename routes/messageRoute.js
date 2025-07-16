const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const auth = require('../middleware/auth.js');

// Gửi tin nhắn mới
router.post('/', auth, messageController.sendMessage);

// Lấy tin nhắn theo conversationId
router.get('/:conversationId', auth, messageController.getMessagesByConversation);

// Tạo mới conversation 1-1 giữa 2 user
router.post('/conversation', auth, messageController.createConversation);

// Lấy danh sách conversation của 1 user
router.get('/conversation/:userId', auth, messageController.getConversationsByUser);

// Kết thúc trò chuyện với khách hàng
router.post('/end-conversation', auth, messageController.endConversation);

// Đếm số tin nhắn chưa đọc của user
router.get('/unread-count/:userId', auth, messageController.countUnreadMessages);

module.exports = router;
