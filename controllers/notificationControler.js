const Notification = require('../models/notificationModel');

// Lấy tất cả notification của user
exports.getAllNotifications = async (req, res) => {
    try {
        // Ưu tiên lấy userId từ req.user (nếu có middleware auth), fallback sang query
        const userId = req.user.id;
        console.log('Fetching notifications for userId:', userId);
        if (!userId) {
            return res.status(400).json({ message: 'Missing userId' });
        }
        const notifications = await Notification.find({ userId })
            .sort({ createdAt: -1 });
        res.status(200).json(notifications);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
