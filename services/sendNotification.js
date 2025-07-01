const Notification = require('../models/notificationModel');
const { getIO } = require('../config/socket.io');

/**
 * Gửi notification cho user (lưu DB + gửi realtime qua socket.io)
 * @param {Object} param0
 * @param {String} param0.userId - ID người nhận
 * @param {String} param0.title - Tiêu đề thông báo
 * @param {String} param0.description - Nội dung thông báo
 * @param {String} param0.type - Loại thông báo (ví dụ: 'order', 'system', ...)
 * @param {String} [param0.orderId] - ID đơn hàng liên quan (nếu có)
 * @returns {Promise<Object>} notification đã lưu
 */
async function sendNotification({ userId, title, description, type, orderId }) {
  if (!userId || !title || !type) {
    throw new Error('Thiếu thông tin bắt buộc khi gửi notification');
  }
  // Lưu vào DB
  const notification = new Notification({
    userId,
    title,
    description,
    type,
    orderId
  });
  await notification.save();

  // Gửi realtime qua socket.io
  try {
    const io = getIO();
    io.to(userId.toString()).emit('notification', notification);
  } catch (e) {
    console.error('Lỗi khi gửi notification qua socket:', e);
  }
  return notification;
}

module.exports = { sendNotification };
