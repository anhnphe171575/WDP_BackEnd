const cron = require('node-cron');
const User = require('../models/userModel');

// Cron Job để tự động chuyển role từ -1 về active sau 1 tháng
const unbanUsersCronJob = () => {
    // Chạy mỗi ngày lúc 00:00
    cron.schedule('0 0 * * *', async () => {
        try {
            console.log('🕐 Running unban users cron job...');
            
            const currentDate = new Date();
            
            // Tìm tất cả user có role = -1 và bannedUntil đã hết hạn
            const usersToUnban = await User.find({
                role: -1,
                bannedUntil: { $lte: currentDate }
            });

            if (usersToUnban.length === 0) {
                console.log('✅ No users to unban');
                return;
            }

            // Cập nhật role về active (0) và xóa bannedUntil
            const result = await User.updateMany(
                {
                    role: -1,
                    bannedUntil: { $lte: currentDate }
                },
                {
                    $set: { role: 0 },
                    $unset: { bannedUntil: 1 }
                }
            );

            console.log(`✅ Successfully unbanned ${result.modifiedCount} users`);
            
            // Log chi tiết các user được unban
            for (const user of usersToUnban) {
                console.log(`   - User ID: ${user._id}, Email: ${user.email}`);
            }

        } catch (error) {
            console.error('❌ Error in unban users cron job:', error);
        }
    }, {
        scheduled: true,
        timezone: "Asia/Ho_Chi_Minh" // Timezone Việt Nam
    });
};

// Hàm để khởi tạo tất cả cron jobs
const initializeCronJobs = () => {
    console.log('🚀 Initializing cron jobs...');
    unbanUsersCronJob();
    console.log('✅ Cron jobs initialized successfully');
};

module.exports = {
    initializeCronJobs,
    unbanUsersCronJob
}; 