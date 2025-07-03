const express = require('express');
const router = express.Router();
const { chatWithBot } = require('../controllers/chatbotController');

/**
 * @swagger
 * /api/chatbot:
 *   post:
 *     summary: Gửi tin nhắn tới AI chatbot và nhận phản hồi
 */
router.post('/', chatWithBot);

module.exports = router; 