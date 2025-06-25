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

// Cập nhật trạng thái isRead của notification
exports.markAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        const { isRead } = req.body;
        if (typeof isRead !== 'boolean') {
            return res.status(400).json({ message: 'isRead must be boolean' });
        }
        const notification = await Notification.findByIdAndUpdate(
            id,
            { isRead },
            { new: true }
        );
        if (!notification) {
            return res.status(404).json({ message: 'Notification not found' });
        }
        res.status(200).json(notification);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
