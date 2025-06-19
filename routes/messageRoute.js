const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const auth = require('../middleware/auth.js');

// Gửi tin nhắn mới
router.post('/', auth, messageController.sendMessage);

// Lấy tin nhắn theo conversationId
router.get('/:conversationId', auth, messageController.getMessagesByConversation);

// Tạo mới hoặc lấy conversation 1-1 giữa 2 user
router.post('/conversation', auth, messageController.createOrGetConversation);

// Lấy danh sách conversation của 1 user
router.get('/conversation/:userId', auth, messageController.getConversationsByUser);

module.exports = router;
