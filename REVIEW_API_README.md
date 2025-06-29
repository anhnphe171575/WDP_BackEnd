# Review API Documentation

## Tổng quan
API Review cho phép người dùng tạo, đọc, cập nhật và xóa đánh giá sản phẩm. Chỉ những người dùng đã mua sản phẩm mới có thể đánh giá.

## Base URL
```
http://localhost:3000/api/reviews
```

## Authentication
Hầu hết các endpoint yêu cầu JWT token trong header:
```
Authorization: Bearer <your_jwt_token>
```

## Endpoints

### 1. Tạo Review Mới
**POST** `/api/reviews`

Tạo một đánh giá mới cho sản phẩm.

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Body:**
```json
{
    "productId": "64f8b8b8b8b8b8b8b8b8b8b8",
    "rating": 5,
    "comment": "Sản phẩm rất tốt, giao hàng nhanh!",
    "images": [
        {
            "url": "https://example.com/image1.jpg"
        },
        {
            "url": "https://example.com/image2.jpg"
        }
    ]
}
```

**Validation:**
- `productId` và `rating` là bắt buộc
- `rating` phải từ 1-5
- Người dùng phải đã mua sản phẩm
- Chỉ được review mỗi sản phẩm một lần

**Response Success (201):**
```json
{
    "success": true,
    "message": "Review created successfully",
    "data": {
        "_id": "64f8b8b8b8b8b8b8b8b8b8b8",
        "userId": {
            "_id": "64f8b8b8b8b8b8b8b8b8b8b8",
            "name": "John Doe",
            "email": "john@example.com"
        },
        "productId": {
            "_id": "64f8b8b8b8b8b8b8b8b8b8b8",
            "name": "Product Name",
            "price": 100000
        },
        "rating": 5,
        "comment": "Sản phẩm rất tốt, giao hàng nhanh!",
        "images": [
            {
                "url": "https://example.com/image1.jpg"
            }
        ],
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:00:00.000Z"
    }
}
```

**Response Error (400/403):**
```json
{
    "success": false,
    "error": "You can only review products you have purchased"
}
```

### 2. Lấy Tất Cả Reviews
**GET** `/api/reviews`

Lấy danh sách tất cả reviews.

**Response Success (200):**
```json
{
    "success": true,
    "count": 10,
    "data": [
        {
            "_id": "64f8b8b8b8b8b8b8b8b8b8b8",
            "userId": {
                "_id": "64f8b8b8b8b8b8b8b8b8b8b8",
                "name": "John Doe",
                "email": "john@example.com"
            },
            "productId": {
                "_id": "64f8b8b8b8b8b8b8b8b8b8b8",
                "name": "Product Name",
                "price": 100000
            },
            "rating": 5,
            "comment": "Great product!",
            "images": [],
            "createdAt": "2024-01-01T00:00:00.000Z",
            "updatedAt": "2024-01-01T00:00:00.000Z"
        }
    ]
}
```

### 3. Lấy Reviews Theo Sản Phẩm
**GET** `/api/reviews/product/:productId`

Lấy tất cả reviews của một sản phẩm cụ thể.

**Response Success (200):**
```json
{
    "success": true,
    "count": 5,
    "data": [...]
}
```

### 4. Lấy Reviews Theo Người Dùng
**GET** `/api/reviews/user/:userId`

Lấy tất cả reviews của một người dùng cụ thể.

### 5. Lấy Review Theo ID
**GET** `/api/reviews/:id`

Lấy thông tin chi tiết của một review.

### 6. Cập Nhật Review
**PUT** `/api/reviews/:id`

Cập nhật thông tin review.

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Body:**
```json
{
    "rating": 4,
    "comment": "Updated comment",
    "images": [...]
}
```

### 7. Xóa Review
**DELETE** `/api/reviews/:id`

Xóa một review.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

### 8. Lấy Điểm Trung Bình Sản Phẩm
**GET** `/api/reviews/rating/:productId`

Lấy điểm đánh giá trung bình và tổng số reviews của sản phẩm.

**Response Success (200):**
```json
{
    "success": true,
    "data": {
        "_id": "64f8b8b8b8b8b8b8b8b8b8b8",
        "averageRating": 4.5,
        "totalReviews": 10
    }
}
```

### 9. Lấy Số Lượng Comments
**GET** `/api/reviews/comments/:productId`

Lấy tổng số comments (reviews có comment) của sản phẩm.

**Response Success (200):**
```json
{
    "success": true,
    "data": {
        "productId": "64f8b8b8b8b8b8b8b8b8b8b8",
        "totalComments": 8
    }
}
```

### 10. Lấy Sản Phẩm Chưa Review
**GET** `/api/reviews/unreviewed/:productId?`

Lấy danh sách sản phẩm đã mua nhưng chưa review.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Query Parameters:**
- `productId` (optional): Lọc theo sản phẩm cụ thể

**Response Success (200):**
```json
{
    "success": true,
    "data": {
        "totalPurchasedProducts": 15,
        "totalReviewedProducts": 10,
        "unreviewedProducts": [
            {
                "_id": "64f8b8b8b8b8b8b8b8b8b8b8",
                "productName": "Product Name",
                "productDescription": "Product description",
                "productBrand": "Brand Name",
                "totalQuantity": 2,
                "lastPurchaseDate": "2024-01-01T00:00:00.000Z"
            }
        ],
        "unreviewedCount": 5
    }
}
```

## Error Codes

| Status Code | Description |
|-------------|-------------|
| 400 | Bad Request - Dữ liệu không hợp lệ |
| 401 | Unauthorized - Token không hợp lệ |
| 403 | Forbidden - Không có quyền thực hiện |
| 404 | Not Found - Không tìm thấy resource |
| 500 | Internal Server Error - Lỗi server |

## Ví Dụ Sử Dụng

### Tạo Review
```javascript
const axios = require('axios');

const createReview = async () => {
    try {
        const response = await axios.post('http://localhost:3000/api/reviews', {
            productId: '64f8b8b8b8b8b8b8b8b8b8b8',
            rating: 5,
            comment: 'Sản phẩm rất tốt!',
            images: [
                { url: 'https://example.com/image.jpg' }
            ]
        }, {
            headers: {
                'Authorization': 'Bearer your_jwt_token_here',
                'Content-Type': 'application/json'
            }
        });
        
        console.log('Review created:', response.data);
    } catch (error) {
        console.error('Error:', error.response.data);
    }
};
```

### Lấy Reviews Của Sản Phẩm
```javascript
const getProductReviews = async (productId) => {
    try {
        const response = await axios.get(`http://localhost:3000/api/reviews/product/${productId}`);
        console.log('Product reviews:', response.data);
    } catch (error) {
        console.error('Error:', error.response.data);
    }
};
```

## Lưu Ý

1. **Authentication**: Hầu hết các endpoint yêu cầu JWT token hợp lệ
2. **Purchase Verification**: Chỉ người dùng đã mua sản phẩm mới có thể review
3. **One Review Per Product**: Mỗi người dùng chỉ được review mỗi sản phẩm một lần
4. **Rating Validation**: Rating phải từ 1-5
5. **Image URLs**: Images phải là URLs hợp lệ 