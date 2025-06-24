const { Server } = require('socket.io');
const Message = require('../models/messageModel');
const Conversation = require('../models/conversationModel');

let io;
const userSockets = new Map(); 

function setupSocket(server) {
  io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Join room và cập nhật trạng thái online
    socket.on('join', async (userId) => {
      if (!userId) return;
      
      socket.userId = userId;
      userSockets.set(userId, socket.id);
      socket.join(userId);
      
      // Thông báo cho tất cả biết user này online
      io.emit('userOnline', userId);
      
      // Gửi danh sách user đang online cho client mới
      const onlineUsers = Array.from(userSockets.keys());
      socket.emit('onlineUsers', onlineUsers);
    });

    // Xử lý gửi tin nhắn
    socket.on('sendMessage', async (msg) => {
      try {
        const { conversationId, content } = msg;
        
        if (!conversationId || !content?.trim() || !socket.userId) {
          socket.emit('error', { message: 'Dữ liệu tin nhắn không hợp lệ' });
          return;
        }

        // Lưu tin nhắn vào DB
        const newMessage = new Message({
          conversationId,
          senderId: socket.userId,
          content: content.trim()
        });
        await newMessage.save();

        // Cập nhật lastMessageAt của conversation
        await Conversation.findByIdAndUpdate(conversationId, {
          lastMessageAt: new Date()
        });

        // Tìm và gửi tin nhắn cho các thành viên trong conversation
        const conversation = await Conversation.findById(conversationId);
        const recipients = [conversation.customerId, conversation.staffId];
        
        io.to(recipients).emit('newMessage', {
          message: newMessage,
          conversationId
        });

      } catch (error) {
        console.error('Lỗi khi xử lý tin nhắn:', error);
        socket.emit('error', { message: 'Có lỗi xảy ra khi gửi tin nhắn' });
      }
    });

    // Xử lý typing indicator
    socket.on('typing', ({ conversationId, isTyping }) => {
      if (!conversationId || !socket.userId) return;
      
      socket.to(conversationId).emit('userTyping', {
        userId: socket.userId,
        conversationId,
        isTyping
      });
    });

    // Xử lý read receipts
    socket.on('markRead', async ({ conversationId }) => {
      if (!conversationId || !socket.userId) return;
      
      try {
        await Message.updateMany(
          {
            conversationId,
            senderId: { $ne: socket.userId },
            read: false
          },
          { read: true }
        );

        io.to(conversationId).emit('messagesRead', {
          conversationId,
          userId: socket.userId
        });
      } catch (error) {
        console.error('Lỗi khi đánh dấu đã đọc:', error);
      }
    });

    socket.on('disconnect', () => {
      if (socket.userId) {
        userSockets.delete(socket.userId);
        io.emit('userOffline', socket.userId);
      }
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
 