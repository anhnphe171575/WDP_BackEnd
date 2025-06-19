const { Server } = require('socket.io');
const Message = require('../models/messageModel');

let io;

function setupSocket(server) {
  io = new Server(server, {
    cors: {
      origin: '*', // hoặc chỉ định domain frontend
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Khi client join vào phòng riêng của mình (theo userId)
    socket.on('join', (userId) => {
      socket.join(userId);
      console.log(`Socket ${socket.id} joined room ${userId}`);
    });

    // Nhận tin nhắn từ client và lưu vào DB, sau đó gửi cho đúng 2 user
    socket.on('sendMessage', async (msg) => {
      try {
        const { sender_id, receiver_id, content } = msg;
        const newMessage = new Message({ sender_id, receiver_id, content });
        await newMessage.save();
        // Gửi tin nhắn cho cả sender và receiver
        io.to(sender_id).to(receiver_id).emit('receiveMessage', newMessage);
      } catch (error) {
        console.error('Lỗi khi lưu/gửi tin nhắn:', error);
      }
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });
}

function getIO() {
  if (!io) {
    throw new Error('Socket.io chưa được khởi tạo. Gọi setupSocket(server) trước.');
  }
  return io;
}

module.exports = {
  setupSocket,
  getIO,
};
 