const Message = require('../models/messageModel');
const Conversation = require('../models/conversationModel');
const User = require('../models/userModel');
const mongoose = require('mongoose');
const { getIO, isUserOnline } = require('../config/socket.io');

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

// Kết thúc trò chuyện (đổi trạng thái conversation sang 'closed')
exports.endConversation = async (req, res) => {
  try {
    const { conversationId } = req.body;
    if (!conversationId || !mongoose.Types.ObjectId.isValid(conversationId)) {
      return res.status(400).json({ error: 'conversationId không hợp lệ' });
    }
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ error: 'Không tìm thấy cuộc trò chuyện' });
    }
    if (conversation.status === 'closed') {
      return res.status(400).json({ error: 'Cuộc trò chuyện đã kết thúc trước đó' });
    }
    conversation.status = 'closed';
    await conversation.save();
    res.status(200).json({ success: true, message: 'Đã kết thúc trò chuyện', data: conversation });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Tạo mới cuộc trò chuyện giữa customer và nhân viên marketing ngẫu nhiên
exports.createConversation = async (req, res) => {
  try {
    const { customerId } = req.body;
    const CUSTOMER = 1;
    const MARKETING = 4;

    // Validate customerId
    if (!customerId) {
      return res.status(400).json({ 
        success: false,
        error: 'customerId là bắt buộc' 
      });
    }

    if (!mongoose.Types.ObjectId.isValid(customerId)) {
      return res.status(400).json({ 
        success: false,
        error: 'customerId không hợp lệ' 
      });
    }

    // Kiểm tra customer có tồn tại và có role CUSTOMER
    const customer = await User.findOne({ _id: customerId, role: CUSTOMER });
    if (!customer) {
      return res.status(400).json({ 
        success: false,
        error: 'Không tìm thấy user CUSTOMER hoặc user không có quyền CUSTOMER' 
      });
    }

    // Kiểm tra customer đã có conversation active chưa
    const existingConversation = await Conversation.findOne({
      customerId: customerId,
      status: 'active'
    }).populate('customerId', 'name email').populate('staffId', 'name email');

    if (existingConversation) {
      return res.status(200).json({
        success: true,
        data: existingConversation,
        message: 'Customer đã có cuộc trò chuyện đang hoạt động'
      });
    }

    // Tìm nhân viên marketing phù hợp nhất
    const bestMarketing = await findBestMarketingStaff();
    if (!bestMarketing) {
      return res.status(400).json({ 
        success: false,
        error: 'Hiện tại không có nhân viên marketing nào để hỗ trợ' 
      });
    }

    // Tạo conversation mới
    const conversation = new Conversation({
      customerId: customer._id,
      staffId: bestMarketing._id,
      status: 'active'
    });

    await conversation.save();
    
    // Populate thông tin user
    await conversation.populate('customerId', 'name email');
    await conversation.populate('staffId', 'name email');

    return res.status(201).json({
      success: true,
      data: conversation,
      message: 'Tạo cuộc trò chuyện mới thành công'
    });

  } catch (error) {
    console.error('Error creating conversation:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Lỗi server khi tạo cuộc trò chuyện' 
    });
  }
};

// Hàm tìm nhân viên marketing phù hợp nhất
async function findBestMarketingStaff() {
  try {
    const MARKETING = 4;
    
    // Lấy tất cả nhân viên marketing
    const marketingUsers = await User.find({ role: MARKETING });
    if (marketingUsers.length === 0) {
      return null;
    }

    const marketingIds = marketingUsers.map(m => m._id);

    // Lấy thống kê conversation của từng marketing
    const conversationStats = await Conversation.aggregate([
      { 
        $match: { 
          staffId: { $in: marketingIds },
          status: 'active'
        } 
      },
      {
        $group: {
          _id: "$staffId",
          conversationCount: { $sum: 1 },
          lastActivity: { $max: "$lastMessageAt" }
        }
      }
    ]);

    // Tạo map thống kê
    const statsMap = new Map();
    conversationStats.forEach(stat => {
      statsMap.set(String(stat._id), {
        conversationCount: stat.conversationCount,
        lastActivity: stat.lastActivity
      });
    });

    // Gắn thống kê và trạng thái online vào từng marketing
    const marketingWithStats = marketingUsers.map(marketing => {
      const stats = statsMap.get(String(marketing._id)) || {
        conversationCount: 0,
        lastActivity: new Date(0)
      };
      
      // Giả sử có field isOnline hoặc lastSeen để kiểm tra trạng thái online
      // Bạn có thể thay đổi logic này theo cách bạn lưu trữ trạng thái online
      const isOnline = checkUserOnlineStatus(marketing._id.toString());
      
      return {
        user: marketing,
        conversationCount: stats.conversationCount,
        lastActivity: stats.lastActivity,
        isOnline: isOnline
      };
    });

    // Bước 1: Ưu tiên người online
    const onlineUsers = marketingWithStats.filter(m => m.isOnline);
    let candidates = onlineUsers.length > 0 ? onlineUsers : marketingWithStats;

    // Bước 2: Trong số người online (hoặc tất cả nếu không ai online), chọn người có ít conversation nhất
    const minConversationCount = Math.min(...candidates.map(m => m.conversationCount));
    candidates = candidates.filter(m => m.conversationCount === minConversationCount);

    // Bước 3: Nếu nhiều người có cùng số conversation, chọn người có hoạt động lâu nhất
    if (candidates.length > 1) {
      const oldestActivity = Math.min(...candidates.map(m => new Date(m.lastActivity).getTime()));
      candidates = candidates.filter(m => new Date(m.lastActivity).getTime() === oldestActivity);
    }

    // Bước 4: Nếu vẫn nhiều người, chọn random
    const selectedMarketing = candidates[Math.floor(Math.random() * candidates.length)];

    return selectedMarketing.user;

  } catch (error) {
    console.error('Error in findBestMarketingStaff:', error);
    // Fallback: chọn random nếu có lỗi
    const marketingUsers = await User.find({ role: MARKETING });
    return marketingUsers.length > 0 ? marketingUsers[Math.floor(Math.random() * marketingUsers.length)] : null;
  }
}

// Hàm kiểm tra trạng thái online của user bằng Socket.IO
function checkUserOnlineStatus(userId) {
  try {
    return isUserOnline(userId);
  } catch (error) {
    console.error('Error checking user online status via Socket.IO:', error);
    return false; // Mặc định offline nếu có lỗi
  }
}

exports.countUnreadMessages = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: 'userId không hợp lệ' });
    }

    // Tìm tất cả conversation mà user là customer hoặc staff
    const conversations = await Conversation.find({
      $or: [
        { customerId: userId },
        { staffId: userId }
      ]
    }).select('_id');

    const conversationIds = conversations.map(c => c._id);

    // Đếm số message chưa đọc gửi tới user này
    const unreadCount = await Message.countDocuments({
      conversationId: { $in: conversationIds },
      isRead: false,
      senderId: { $ne: userId }
    });

    res.status(200).json({ unreadCount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};