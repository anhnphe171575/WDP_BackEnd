const Message = require('../models/messageModel');
const Conversation = require('../models/conversationModel');
const User = require('../models/userModel');

// Gửi tin nhắn mới
exports.sendMessage = async (req, res) => {
  try {
    const { conversationId, senderId, content } = req.body;
    const message = new Message({ conversationId, senderId, content });
    await message.save();
    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Lấy tất cả tin nhắn theo conversationId
exports.getMessagesByConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const messages = await Message.find({ conversationId }).sort({ createdAt: 1 });
    res.status(200).json(messages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
exports.createOrGetConversation = async (req, res) => {
  try {
    const { customerId, userA, userB } = req.body;
    if (userA && userB) {
      const users = await User.find({ _id: { $in: [userA, userB] } });
      if (users.length !== 2) {
        return res.status(400).json({ error: 'Không tìm thấy đủ 2 user' });
      }
      const roleA = users[0].role;
      const roleB = users[1].role;
      const CUSTOMER = 1; 
      const MARKETING = 4; 
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
    if (!customerId) {
      return res.status(400).json({ error: 'customerId là bắt buộc' });
    }
    // Lấy tất cả marketing
    const marketingUsers = await User.find({ role: 4 }); // 1 << 2
    if (marketingUsers.length === 0) {
      return res.status(400).json({ error: 'Không có nhân viên marketing nào' });
    }
    // Đếm số conversation của từng marketing
    const stats = await Promise.all(marketingUsers.map(async (m) => {
      const count = await Conversation.countDocuments({ staffId: m._id });
      const lastConv = await Conversation.findOne({ staffId: m._id }).sort({ lastMessageAt: -1 });
      return {
        user: m,
        count,
        lastMessageAt: lastConv ? lastConv.lastMessageAt : new Date(0)
      };
    }));
    // Tìm min count
    const minCount = Math.min(...stats.map(s => s.count));
    let candidates = stats.filter(s => s.count === minCount);
    // Nếu nhiều người cùng count, chọn người có lastMessageAt xa nhất
    if (candidates.length > 1) {
      const minLast = Math.min(...candidates.map(s => new Date(s.lastMessageAt).getTime()));
      candidates = candidates.filter(s => new Date(s.lastMessageAt).getTime() === minLast);
    }
    // Nếu vẫn nhiều người, random
    const chosen = candidates[Math.floor(Math.random() * candidates.length)].user;
    // Tìm hoặc tạo conversation
    let conversation = await Conversation.findOne({ customerId, staffId: chosen._id });
    if (!conversation) {
      conversation = new Conversation({ customerId, staffId: chosen._id });
      await conversation.save();
    }
    res.status(200).json(conversation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Lấy danh sách conversation của 1 user
exports.getConversationsByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const conversations = await Conversation.find({
      $or: [
        { customerId: userId },
        { staffId: userId }
      ]
    }).sort({ updatedAt: -1 });
    res.status(200).json(conversations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
