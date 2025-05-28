const { Server } = require('socket.io');

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

    socket.on('message', (msg) => {
      console.log('Received message:', msg);
      io.emit('message', msg); // broadcast to all clients
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
 