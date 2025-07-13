const Ticket = require('../models/ticketModel');
const mongoose = require('mongoose');
const User = require('../models/userModel');
const { ROLES } = require('../config/role');
const { sendNotification } = require('../services/sendNotification');

// ===== LẤY DANH SÁCH TICKET =====

// Lấy tất cả ticket của customer đang đăng nhập (có phân trang)
exports.getAllTicketsByCustomer = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const [tickets, total] = await Promise.all([
      Ticket.find({ userId: req.user.id })
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      Ticket.countDocuments({ userId: req.user.id })
    ]);
    res.status(200).json({
      tickets,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Lấy tất cả ticket mà handlerId là user đang đăng nhập (nhân viên marketing), status khác 'closed' (có phân trang)
exports.getAllTicketsByHandler = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const [tickets, total] = await Promise.all([
      Ticket.find({ handlerId: req.user.id, status: { $ne: 'closed' } })
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      Ticket.countDocuments({ handlerId: req.user.id, status: { $ne: 'closed' } })
    ]);
    res.status(200).json({
      tickets,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Lấy danh sách ticket của user đang đăng nhập, có phân trang
exports.getTicketsByUser = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1; // Trang hiện tại, mặc định 1
    const limit = parseInt(req.query.limit) || 10; // Số lượng mỗi trang, mặc định 10
    const skip = (page - 1) * limit;

    const [tickets, total] = await Promise.all([
      Ticket.find({ userId: req.user.id })
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      Ticket.countDocuments({ userId: req.user.id }),
    ]);

    res.status(200).json({
      tickets,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ===== LẤY CHI TIẾT TICKET =====

exports.getTicketById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'ID không hợp lệ' });
    }
    const ticket = await Ticket.findById(id)
      .populate('userId', 'name email')
      .populate('handlerId', 'name email')
      .populate('productId', 'name')
      .populate('orderId', 'total status');
    if (!ticket) {
      return res.status(404).json({ message: 'Không tìm thấy ticket' });
    }
    // Khách chỉ xem ticket của mình
    if (req.user.role === 1 && ticket.userId._id.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Bạn không có quyền xem ticket này' });
    }
    res.status(200).json(ticket);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ===== TẠO TICKET =====

exports.createTicket = async (req, res) => {
  try {
    const { category, type, title, content, productId, orderId, priority } = req.body;
    if (!category || !type || !content) {
      return res.status(400).json({ message: 'Thiếu thông tin bắt buộc' });
    }
    // Nếu là report thì cần title
    if (category === 'report' && !title) {
      return res.status(400).json({ message: 'Báo cáo cần tiêu đề' });
    }
    let handlerId = undefined;
    // Nếu là support thì tự động gán cho nhân viên marketing phù hợp
    if (category === 'support') {
      const marketing = await findBestMarketingStaffForTicket();
      if (marketing) handlerId = marketing._id;
    }
    // Xử lý productId, orderId nếu là chuỗi rỗng thì bỏ qua
    let _productId = productId === '' ? undefined : productId;
    let _orderId = orderId === '' ? undefined : orderId;
    const ticket = new Ticket({
      userId: req.user.id,
      category,
      type,
      title,
      content,
      productId: _productId,
      orderId: _orderId,
      priority,
      handlerId
    });
    await ticket.save();
    // Gửi notification cho handler nếu có
    if (handlerId) {
      await sendNotification({
        userId: handlerId,
        title: 'Yêu cầu hỗ trợ mới',
        description: `Bạn vừa được gán xử lý ticket: ${title || '[Không có tiêu đề]'}`,
        type: 'ticket'
      });
    }
    res.status(201).json(ticket);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ===== CẬP NHẬT TICKET =====

exports.updateTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, handlerId, response, internalNote, priority } = req.body;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'ID không hợp lệ' });
    }
    const ticket = await Ticket.findById(id);
    if (!ticket) {
      return res.status(404).json({ message: 'Không tìm thấy ticket' });
    }
    // Chỉ admin/nhân viên mới được update
    if (![0,4].includes(req.user.role)) {
      return res.status(403).json({ message: 'Bạn không có quyền cập nhật ticket này' });
    }
    if (status) ticket.status = status;
    if (handlerId) ticket.handlerId = handlerId;
    if (response) ticket.response = response;
    if (internalNote) ticket.internalNote = internalNote;
    if (priority) ticket.priority = priority;
    await ticket.save();
    // Gửi notification cho chủ ticket
    await sendNotification({
      userId: ticket.userId,
      title: 'Yêu cầu hỗ trợ được cập nhật',
      description: `Ticket của bạn đã được cập nhật trạng thái hoặc phản hồi.`,
      type: 'ticket'
    });
    // Nếu có handlerId thì gửi cho handler
    if (ticket.handlerId) {
      await sendNotification({
        userId: ticket.handlerId,
        title: 'Ticket bạn phụ trách vừa được cập nhật',
        description: `Ticket: ${ticket.title || '[Không có tiêu đề]'} vừa được cập nhật.`,
        type: 'ticket'
      });
    }
    res.status(200).json(ticket);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ===== XÓA TICKET =====

exports.deleteTicket = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'ID không hợp lệ' });
    }
    const ticket = await Ticket.findById(id);
    if (!ticket) {
      return res.status(404).json({ message: 'Không tìm thấy ticket' });
    }
    // Chỉ admin hoặc chủ sở hữu được xóa
    if (req.user.role !== 0 && ticket.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Bạn không có quyền xóa ticket này' });
    }
    await Ticket.findByIdAndDelete(id);
    res.status(200).json({ message: 'Đã xóa ticket thành công' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ===== HÀM PHỤ TRỢ =====

// Hàm tìm nhân viên marketing phù hợp nhất cho ticket
async function findBestMarketingStaffForTicket() {
  try {
    const MARKETING = ROLES.MARKETING_MANAGER;
    // Lấy tất cả nhân viên marketing
    const marketingUsers = await User.find({ role: MARKETING });
    if (marketingUsers.length === 0) return null;
    const marketingIds = marketingUsers.map(m => m._id);
    // Đếm số lượng ticket đang xử lý của từng marketing (status khác 'closed')
    const ticketStats = await Ticket.aggregate([
      { $match: { handlerId: { $in: marketingIds }, status: { $ne: 'closed' } } },
      { $group: { _id: "$handlerId", ticketCount: { $sum: 1 } } }
    ]);
    // Map handlerId -> số lượng ticket
    const statsMap = new Map();
    ticketStats.forEach(stat => {
      statsMap.set(String(stat._id), stat.ticketCount);
    });
    // Gắn số lượng ticket vào từng marketing
    const marketingWithStats = marketingUsers.map(m => {
      return {
        user: m,
        ticketCount: statsMap.get(String(m._id)) || 0
      };
    });
    // Tìm số lượng ticket ít nhất
    const minCount = Math.min(...marketingWithStats.map(m => m.ticketCount));
    // Lọc ra các marketing có số lượng ticket ít nhất
    const candidates = marketingWithStats.filter(m => m.ticketCount === minCount);
    // Random chọn 1 người trong số đó
    const selected = candidates[Math.floor(Math.random() * candidates.length)];
    return selected.user;
  } catch (error) {
    return null;
  }
}