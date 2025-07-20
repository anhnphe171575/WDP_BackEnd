# Cron Job - Tự động Unban Users

## Mô tả
Cron Job này sẽ tự động chuyển role của users từ -1 (banned) về 0 (active) sau khi hết thời gian ban (1 tháng).

## Cách hoạt động

### 1. Cron Job Schedule
- **Thời gian chạy**: Mỗi ngày lúc 00:00 (theo timezone Việt Nam)
- **Pattern**: `0 0 * * *`
- **Timezone**: Asia/Ho_Chi_Minh

### 2. Logic xử lý
1. Tìm tất cả users có `role = -1` và `bannedUntil <= currentDate`
2. Cập nhật `role = 0` và xóa field `bannedUntil`
3. Log chi tiết các users được unban

### 3. Files liên quan
- `services/cronService.js`: Chứa logic Cron Job
- `server.js`: Khởi tạo Cron Job khi server start
- `controllers/userController.js`: Thêm test functions
- `routes/userRoute.js`: Thêm test routes

## API Test

### 1. Xem danh sách users bị ban
```bash
GET /api/users/banned
```

Response:
```json
{
  "message": "Banned users retrieved successfully",
  "count": 2,
  "users": [
    {
      "_id": "user_id",
      "name": "User Name",
      "email": "user@example.com",
      "role": -1,
      "bannedUntil": "2024-01-15T00:00:00.000Z"
    }
  ]
}
```

### 2. Manually unban users (cho admin)
```bash
POST /api/users/unban
```

Response:
```json
{
  "message": "Users unbanned successfully",
  "unbannedCount": 1,
  "users": [
    {
      "id": "user_id",
      "name": "User Name",
      "email": "user@example.com",
      "bannedUntil": "2024-01-15T00:00:00.000Z"
    }
  ]
}
```

## Logs
Cron Job sẽ log các thông tin sau:
- `🕐 Running unban users cron job...`
- `✅ No users to unban` (nếu không có user nào cần unban)
- `✅ Successfully unbanned X users`
- `   - User ID: xxx, Email: xxx` (chi tiết từng user được unban)
- `❌ Error in unban users cron job: xxx` (nếu có lỗi)

## Cấu hình

### Thay đổi schedule
Để thay đổi thời gian chạy, edit trong `services/cronService.js`:

```javascript
// Chạy mỗi giờ
cron.schedule('0 * * * *', async () => {
  // logic here
});

// Chạy mỗi 30 phút
cron.schedule('*/30 * * * *', async () => {
  // logic here
});

// Chạy mỗi tuần vào Chủ nhật lúc 00:00
cron.schedule('0 0 * * 0', async () => {
  // logic here
});
```

### Thay đổi timezone
```javascript
cron.schedule('0 0 * * *', async () => {
  // logic here
}, {
  scheduled: true,
  timezone: "UTC" // hoặc timezone khác
});
```

## Cron Pattern Reference
- `* * * * *` = Mỗi phút
- `0 * * * *` = Mỗi giờ
- `0 0 * * *` = Mỗi ngày lúc 00:00
- `0 0 * * 0` = Mỗi Chủ nhật lúc 00:00
- `0 0 1 * *` = Mỗi tháng ngày 1 lúc 00:00

## Lưu ý
1. Cron Job chỉ chạy khi server đang hoạt động
2. Nếu server restart, Cron Job sẽ được khởi tạo lại
3. Để đảm bảo Cron Job chạy liên tục, nên deploy trên server có uptime cao
4. Có thể sử dụng PM2 hoặc Docker để đảm bảo server không bị crash 