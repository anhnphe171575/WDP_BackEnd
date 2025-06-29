# Hướng dẫn sử dụng chức năng Thống kê Doanh thu & Lãi

## Tổng quan
Chức năng thống kê doanh thu và lãi cho phép admin business phân tích hiệu suất sản phẩm, xác định sản phẩm bán chạy và bán chậm, cũng như theo dõi doanh thu theo thời gian.

## Cài đặt và thiết lập

### 1. Cập nhật Database Schema
Đã thêm trường `costPrice` vào model `ProductVariant` để tính toán lãi.

### 2. Chạy script cập nhật dữ liệu
```bash
cd WDP_BackEnd
node updateCostPrice.js
```

Script này sẽ tự động cập nhật `costPrice` cho các sản phẩm hiện có (mặc định 70% của `sellPrice`).

### 3. Khởi động server
```bash
cd WDP_BackEnd
npm start
```

## API Endpoints

### 1. Thống kê doanh thu theo sản phẩm
```
GET /api/statistics/product-revenue
```

**Query Parameters:**
- `startDate` (optional): Ngày bắt đầu (YYYY-MM-DD)
- `endDate` (optional): Ngày kết thúc (YYYY-MM-DD)
- `sortBy` (optional): Sắp xếp theo ('revenue', 'profit', 'quantity', 'profitMargin')
- `limit` (optional): Số lượng kết quả (default: 10)

**Response:**
```json
{
  "success": true,
  "data": {
    "products": [
      {
        "productId": "string",
        "productName": "string",
        "totalQuantity": number,
        "totalRevenue": number,
        "totalCost": number,
        "totalProfit": number,
        "orderCount": number,
        "profitMargin": number
      }
    ],
    "summary": {
      "totalRevenue": number,
      "totalProfit": number,
      "totalQuantity": number,
      "averageProfitMargin": number
    }
  }
}
```

### 2. Thống kê doanh thu theo thời gian
```
GET /api/statistics/revenue-by-time
```

**Query Parameters:**
- `period` (optional): Chu kỳ thời gian ('day', 'week', 'month')
- `startDate` (optional): Ngày bắt đầu
- `endDate` (optional): Ngày kết thúc

### 3. Thống kê sản phẩm bán chậm
```
GET /api/statistics/low-revenue-products
```

**Query Parameters:**
- `limit` (optional): Số lượng kết quả (default: 10)

### 4. Cập nhật costPrice cho sản phẩm
```
PUT /api/products/variant/:variantId/cost-price
```

**Body:**
```json
{
  "costPrice": number
}
```

## Sử dụng Frontend

### Truy cập trang thống kê
1. Đăng nhập với tài khoản có role `ADMIN_BUSINESS`
2. Truy cập: `http://localhost:3000/adminbusiness/statistics`

### Tính năng chính

#### 1. Bộ lọc dữ liệu
- **Khoảng thời gian**: Chọn từ ngày đến ngày
- **Sắp xếp**: Theo doanh thu, lãi, số lượng, hoặc tỷ lệ lãi
- **Số lượng hiển thị**: Top 5, 10, 20, hoặc 50 sản phẩm

#### 2. Thống kê tổng quan
- **Tổng doanh thu**: Tổng doanh thu trong khoảng thời gian
- **Tổng lãi**: Tổng lãi thu được
- **Tổng số lượng**: Tổng số sản phẩm đã bán
- **Tỷ lệ lãi trung bình**: Tỷ lệ lãi trung bình của các sản phẩm

#### 3. Tab phân tích
- **Sản phẩm bán chạy**: Danh sách sản phẩm có doanh thu cao nhất
- **Sản phẩm bán chậm**: Danh sách sản phẩm có doanh thu thấp nhất
- **Doanh thu theo thời gian**: Biểu đồ doanh thu theo ngày/tuần/tháng

## Cách tính toán

### Doanh thu (Revenue)
```
Doanh thu = Giá bán × Số lượng bán
```

### Chi phí (Cost)
```
Chi phí = Giá gốc (costPrice) × Số lượng bán
```

### Lãi (Profit)
```
Lãi = Doanh thu - Chi phí
```

### Tỷ lệ lãi (Profit Margin)
```
Tỷ lệ lãi = (Lãi / Doanh thu) × 100%
```

## Lưu ý quan trọng

1. **CostPrice**: Cần cập nhật `costPrice` cho tất cả sản phẩm để tính toán lãi chính xác
2. **Quyền truy cập**: Chỉ user có role `ADMIN_BUSINESS` mới có thể truy cập
3. **Dữ liệu**: Chỉ tính các đơn hàng có status = 'completed'
4. **Hiệu suất**: Với dữ liệu lớn, có thể cần tối ưu hóa query

## Troubleshooting

### Lỗi thường gặp

1. **"Không có dữ liệu"**
   - Kiểm tra có đơn hàng completed không
   - Kiểm tra costPrice đã được set chưa

2. **"Lỗi permission"**
   - Đảm bảo user có role ADMIN_BUSINESS
   - Kiểm tra token authentication

3. **"Dữ liệu không chính xác"**
   - Chạy lại script updateCostPrice.js
   - Kiểm tra costPrice của từng sản phẩm

## Phát triển thêm

### Có thể mở rộng thêm:
1. **Export dữ liệu**: Xuất báo cáo PDF/Excel
2. **Biểu đồ**: Thêm biểu đồ trực quan
3. **So sánh**: So sánh doanh thu giữa các thời kỳ
4. **Dự báo**: Dự báo doanh thu tương lai
5. **Alert**: Cảnh báo khi doanh thu thấp 