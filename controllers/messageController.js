const Message = require('../models/messageModel');
const Conversation = require('../models/conversationModel');
const User = require('../models/userModel');
const mongoose = require('mongoose');

exports.sendMessage = async (req, res) => {
  try {
    const { conversationId, senderId, content } = req.body;

    // Kiểm tra dữ liệu đầu vào
    if (!conversationId || !senderId || !content?.trim()) {
      return res.status(400).json({ error: 'Thiếu thông tin gửi tin nhắn' });
    }

    // Kiểm tra ObjectId hợp lệ
    if (!mongoose.Types.ObjectId.isValid(conversationId) || !mongoose.Types.ObjectId.isValid(senderId)) {
      return res.status(400).json({ error: 'ID không hợp lệ' });
    }

    // Kiểm tra xem cuộc trò chuyện có tồn tại không
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ error: 'Không tìm thấy cuộc trò chuyện' });
    }

    // Tạo và lưu tin nhắn
    const message = new Message({
      conversationId,
      senderId,
      content: content.trim()
    });
    await message.save();

    // Cập nhật thời gian gửi tin nhắn cuối cùng
    conversation.lastMessageAt = new Date();
    await conversation.save();

    // Trả về kết quả
    res.status(201).json({
      success: true,
      data: message
    });
  } catch (error) {
    console.error('Lỗi khi gửi tin nhắn:', error);
    res.status(500).json({ error: error.message });
  }
};

// Lấy tất cả tin nhắn theo conversationId
exports.getMessagesByConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    if (!conversationId) {
      return res.status(400).json({ error: 'Thiếu conversationId' });
    }
    const messages = await Message.find({ conversationId }).sort({ createdAt: 1 });
    res.status(200).json(messages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Tạo mới hoặc lấy conversation 1-1 giữa customer và marketing
exports.createOrGetConversation = async (req, res) => {
  try {
    let { customerId, userA, userB } = req.body;
    const CUSTOMER = 1;
    const MARKETING = 4;

    // Trường hợp chỉ định 2 user cụ thể
    if (userA && userB) {
      userA = mongoose.Types.ObjectId.isValid(userA) ? userA : null;
      userB = mongoose.Types.ObjectId.isValid(userB) ? userB : null;
      if (!userA || !userB) {
        return res.status(400).json({ error: 'userA hoặc userB không hợp lệ' });
      }

      const users = await User.find({ _id: { $in: [userA, userB] } });
      if (users.length !== 2) {
        return res.status(400).json({ error: 'Không tìm thấy đủ 2 user' });
      }

      const roleA = users[0].role;
      const roleB = users[1].role;
      const roles = [roleA, roleB];

      if (!(roles.includes(CUSTOMER) && roles.includes(MARKETING))) {
        return res.status(400).json({ error: 'Chỉ cho phép tạo cuộc trò chuyện giữa CUSTOMER và MARKETING' });
      }

      let conversation = await Conversation.findOne({
        $or: [
          { customerId: userA, staffId: userB },
          { customerId: userB, staffId: userA }
        ]
      });

      if (!conversation) {
        const customerId = users.find(u => u.role === CUSTOMER)._id;
        const staffId = users.find(u => u.role === MARKETING)._id;
        conversation = new Conversation({ customerId, staffId });
        await conversation.save();
      }

      return res.status(200).json(conversation);
    }

    // Trường hợp random ghép cho customer
    if (!customerId) {
      return res.status(400).json({ error: 'customerId là bắt buộc' });
    }

    customerId = mongoose.Types.ObjectId.isValid(customerId) ? customerId : null;
    if (!customerId) {
      return res.status(400).json({ error: 'customerId không hợp lệ' });
    }

    const customer = await User.findOne({ _id: customerId, role: CUSTOMER });
    if (!customer) {
      return res.status(400).json({ error: 'Không tìm thấy user CUSTOMER' });
    }

    const marketingUsers = await User.find({ role: MARKETING });
    if (marketingUsers.length === 0) {
      return res.status(400).json({ error: 'Không có nhân viên marketing nào' });
    }

    // Aggregate conversation statistics
    const marketingIds = marketingUsers.map(m => m._id);
    const aggregation = await Conversation.aggregate([
      { $match: { staffId: { $in: marketingIds } } },
      {
        $group: {
          _id: "$staffId",
          count: { $sum: 1 },
          lastMessageAt: { $max: "$lastMessageAt" }
        }
      }
    ]);

    // Gắn thống kê vào từng marketing
    const stats = marketingUsers.map(m => {
      const match = aggregation.find(a => String(a._id) === String(m._id));
      return {
        user: m,
        count: match ? match.count : 0,
        lastMessageAt: match ? match.lastMessageAt : new Date(0)
      };
    });

    // Chọn người có số lượng ít nhất
    const minCount = Math.min(...stats.map(s => s.count));
    let candidates = stats.filter(s => s.count === minCount);

    // Ưu tiên người có thời gian tương tác xa nhất
    if (candidates.length > 1) {
      const minLast = Math.min(...candidates.map(s => new Date(s.lastMessageAt).getTime()));
      candidates = candidates.filter(s => new Date(s.lastMessageAt).getTime() === minLast);
    }

    // Nếu vẫn nhiều, chọn random
    const chosen = candidates[Math.floor(Math.random() * candidates.length)].user;

    // Tạo hoặc tìm lại conversation
    let conversation = await Conversation.findOne({ customerId, staffId: chosen._id });
    if (!conversation) {
      conversation = new Conversation({ customerId, staffId: chosen._id });
      await conversation.save();
    }

    res.status(200).json(conversation);

  } catch (error) {
    console.error('Error creating/getting conversation:', error);
    res.status(500).json({ error: error.message });
  }
};

// Lấy danh sách conversation của 1 user
exports.getConversationsByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({ error: 'userId là bắt buộc' });
    }
    // Đảm bảo là ObjectId
    const id = mongoose.Types.ObjectId.isValid(userId) ? userId : null;
    if (!id) {
      return res.status(400).json({ error: 'userId không hợp lệ' });
    }
    const conversations = await Conversation.find({
      $or: [
        { customerId: id },
        { staffId: id }
      ]
    }).sort({ updatedAt: -1 });
    res.status(200).json(conversations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};