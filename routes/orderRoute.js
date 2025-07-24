const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const verifyToken = require('../middleware/auth');
const { ROLES } = require('../config/role');
const authorizeRoles = require('../middleware/authorization');
/**
 * @swagger
 * /api/orders/order-manager:
 *   get:
 *     summary: Lấy danh sách đơn hàng do order manager đang đăng nhập phụ trách
 *     description: |
 *       Yêu cầu phải đăng nhập với vai trò order manager. 
 *       <br/>
 *       **Hướng dẫn test trên Swagger UI:**
 *       <br/>
 *       1. Nhấn nút "Authorize" ở góc phải trên của Swagger UI.
 *       2. Nhập token theo định dạng: `Bearer <token>`
 *       3. Nhấn Authorize và đóng popup.
 *       4. Thực hiện thử nghiệm API này.
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Danh sách đơn hàng do order manager này phụ trách
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Order'
 *       401:
 *         description: Không có quyền truy cập hoặc chưa đăng nhập
 *       500:
 *         description: Lỗi server
 */
router.get('/order-manager', verifyToken, authorizeRoles(ROLES.ORDER_MANAGER), orderController.getOrdersByOrderManagerId);
// get orders dashboard
router.get('/dashboard', verifyToken, authorizeRoles(ROLES.ORDER_MANAGER, ROLES.ADMIN_BUSINESS), orderController.getOrdersDashboard);

/**
 * @swagger
 * /api/orders/revenue:
 *   get:
 *     summary: Lấy thông tin tổng doanh thu và thống kê doanh thu
 *     tags: [Orders]
 *     responses:
 *       200:
 *         description: Thông tin doanh thu
 *         content:
 * 
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalRevenue:
 *                   type: number
 *                   description: Tổng doanh thu từ tất cả đơn hàng đã hoàn thành
 *                 totalOrderCount:
 *                   type: number
 *                   description: Tổng số đơn hàng đã hoàn thành
 *                 currentMonthRevenue:
 *                   type: number
 *                   description: Doanh thu tháng hiện tại
 *                 currentMonthOrderCount:
 *                   type: number
 *                   description: Số đơn hàng tháng hiện tại
 *                 previousMonthRevenue:
 *                   type: number
 *                   description: Doanh thu tháng trước
 *                 previousMonthOrderCount:
 *                   type: number
 *                   description: Số đơn hàng tháng trước
 *                 monthlyGrowthPercentage:
 *                   type: string
 *                   description: Phần trăm tăng trưởng so với tháng trước
 *                 revenueByMonth:
 *                   type: array
 *                   description: Doanh thu theo từng tháng trong năm hiện tại
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: number
 *                         description: Tháng (1-12)
 *                       monthlyRevenue:
 *                         type: number
 *                         description: Doanh thu tháng
 *                       orderCount:
 *                         type: number
 *                         description: Số đơn hàng tháng
 *                 revenueByYear:
 *                   type: array
 *                   description: Doanh thu theo từng năm
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: number
 *                         description: Năm
 *                       yearlyRevenue:
 *                         type: number
 *                         description: Doanh thu năm
 *                       orderCount:
 *                         type: number
 *                         description: Số đơn hàng năm
 *                 revenueByStatus:
 *                   type: array
 *                   description: Doanh thu theo trạng thái đơn hàng
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                         description: Trạng thái đơn hàng
 *                       revenue:
 *                         type: number
 *                         description: Doanh thu theo trạng thái
 *                       orderCount:
 *                         type: number
 *                         description: Số đơn hàng theo trạng thái
 *       500:
 *         description: Lỗi server
 */
router.get('/revenue',verifyToken, authorizeRoles(ROLES.ORDER_MANAGER, ROLES.ADMIN_BUSINESS), orderController.getTotalRevenue);

/**
 * @swagger
 * components:
 *   schemas:
 *     Order:
 *       type: object
 *       required:
 *         - userId
 *         - total
 *         - status
 *         - paymentMethod
 *       properties:
 *         userId:
 *           type: string
 *           description: ID của người dùng
 *         OrderItems:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               orderItem_id:
 *                 type: string
 *                 description: ID của order item
 *         total:
 *           type: number
 *           description: Tổng giá trị đơn hàng
 *         status:
 *           type: string
 *           description: Trạng thái đơn hàng
 *         paymentMethod:
 *           type: string
 *           description: Phương thức thanh toán
 *         voucher:
 *           type: array
 *           items:
 *             type: string
 *           description: Danh sách voucher được áp dụng
 *         createAt:
 *           type: string
 *           format: date-time
 *           description: Thời gian tạo đơn hàng
 *         updateAt:
 *           type: string
 *           format: date-time
 *           description: Thời gian cập nhật đơn hàng
 */

/**
 * @swagger
 * /api/orders:
 *   post:
 *     summary: Tạo đơn hàng mới
 *     tags: [Orders]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Order'
 *     responses:
 *       201:
 *         description: Tạo đơn hàng thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 */
router.post('/',verifyToken, orderController.createOrder);

/**
 * @swagger
 * /api/orders:
 *   get:
 *     summary: Lấy danh sách tất cả đơn hàng
 *     tags: [Orders]
 *     responses:
 *       200:
 *         description: Danh sách đơn hàng
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Order'
 *       500:
 *         description: Lỗi server
 */
router.get('/', verifyToken, authorizeRoles(ROLES.ORDER_MANAGER), orderController.getAllOrders);

/**
 * @swagger
 * /api/orders/bulk-update-status:
 *   put:
 *     summary: Cập nhật trạng thái hàng loạt cho đơn hàng
 *     tags: [Orders]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               orderIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Danh sách ID của các đơn hàng cần cập nhật
 *               status:
 *                 type: string
 *                 description: Trạng thái mới cần cập nhật cho các đơn hàng
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       500:
 *         description: Lỗi server
 */
router.put('/bulk-update-status', verifyToken, authorizeRoles(ROLES.ORDER_MANAGER), orderController.updateBulkStatus);

/**
 * @swagger
 * /api/orders/recommend-imports:
 *   get:
 *     summary: Lấy danh sách đề xuất nhập hàng dựa trên tồn kho và doanh số
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Danh sách đề xuất nhập hàng
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 summary:
 *                   type: object
 *                   properties:
 *                     totalProducts:
 *                       type: number
 *                       description: Tổng số sản phẩm
 *                     productsNeedImport:
 *                       type: number
 *                       description: Số sản phẩm cần nhập
 *                     totalSuggestedQuantity:
 *                       type: number
 *                       description: Tổng số lượng đề xuất nhập
 *                 recommendations:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       productId:
 *                         type: string
 *                         description: ID sản phẩm
 *                       variantId:
 *                         type: string
 *                         description: ID variant sản phẩm
 *                       img:
 *                         type: string
 *                         description: URL hình ảnh đầu tiên của variant
 *                         example: "https://example.com/image1.jpg"
 *                       productName:
 *                         type: string
 *                         description: Tên sản phẩm (bao gồm thông tin variant)
 *                       currentStock:
 *                         type: number
 *                         description: Tồn kho hiện tại
 *                       averageMonthlySales:
 *                         type: number
 *                         description: Doanh số trung bình/tháng
 *                       shouldImport:
 *                         type: boolean
 *                         description: Có nên nhập hay không
 *                       attributeNames:
 *                         type: string
 *                         description: Tên các thuộc tính của variant 
 *                       suggestedQuantity:
 *                         type: number
 *                         description: Số lượng đề xuất nhập
 *                       category:
 *                         type: string
 *                         description: Danh mục sản phẩm
 *                       brand:
 *                         type: string
 *                         description: Thương hiệu
 *       401:
 *         description: Không có token hoặc token không hợp lệ
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Token không tồn tại"
 *       403:
 *         description: Không có quyền truy cập
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Không có quyền truy cập"
 *       500:
 *         description: Lỗi server
 */
router.get('/recommend-imports', verifyToken, authorizeRoles(ROLES.ORDER_MANAGER, ROLES.ADMIN_BUSINESS), orderController.getRecommendImports);

/**
 * @swagger
 * /api/orders/{id}:
 *   get:
 *     summary: Lấy thông tin đơn hàng theo ID
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của đơn hàng
 *     responses:
 *       200:
 *         description: Thông tin đơn hàng
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Order'
 *       404:
 *         description: Không tìm thấy đơn hàng
 *       500:
 *         description: Lỗi server
 */
router.get('/:id', verifyToken, authorizeRoles(ROLES.ORDER_MANAGER), orderController.getOrderById);

/**
 * @swagger
 * /api/orders/{id}:
 *   put:
 *     summary: Cập nhật đơn hàng
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của đơn hàng
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *               paymentMethod:
 *                 type: string
 *               voucher:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       404:
 *         description: Không tìm thấy đơn hàng
 *       400:
 *         description: Dữ liệu không hợp lệ
 */
router.put('/:id',  orderController.updateOrder);

/**
 * @swagger
 * /api/orders/{id}:
 *   delete:
 *     summary: Xóa đơn hàng
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của đơn hàng
 *     responses:
 *       200:
 *         description: Xóa thành công
 *       404:
 *         description: Không tìm thấy đơn hàng
 *       500:
 *         description: Lỗi server
 */
router.delete('/:id',  orderController.deleteOrder);

// edit orderItem status
// request return order item
/**
 * @swagger
 * /api/orders/{id}/orderItem/request-return:
 *   put:
 *     summary: Gửi yêu cầu trả hàng cho một hoặc nhiều sản phẩm trong đơn hàng
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của đơn hàng chứa các sản phẩm cần trả
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *                - reason
 *                - items
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Lý do chung cho việc trả hàng.
 *                 example: "Sản phẩm không đúng mô tả"
 *               items:
 *                 type: array
 *                 description: Một mảng các sản phẩm cần yêu cầu trả hàng.
 *                 items:
 *                   type: object
 *                   required:
 *                     - orderItemId
 *                     - returnQuantity
 *                   properties:
 *                     orderItemId:
 *                       type: string
 *                       description: ID của một mục trong đơn hàng (order item).
 *                       example: "60c72b2f9b1d8c001f8e4c9a"
 *                     returnQuantity:
 *                       type: number
 *                       description: Số lượng sản phẩm muốn trả cho mục này.
 *                       example: 1
 *     responses:
 *       '200':
 *         description: Yêu cầu trả hàng đã được gửi thành công. Phản hồi có thể chứa một mảng lỗi nếu một số mặt hàng không hợp lệ.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 updatedOrderItems:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/OrderItem' 
 *                 errors:
 *                   type: array
 *                   items:
 *                      type: string
 *       '400':
 *         description: Dữ liệu yêu cầu không hợp lệ (thiếu lý do, danh sách sản phẩm, hoặc tất cả sản phẩm đều không hợp lệ).
 *       '404':
 *         description: Không tìm thấy đơn hàng với ID đã cung cấp.
 *       '500':
 *         description: Lỗi máy chủ nội bộ.
 */
router.put('/:id/orderItem/request-return',  orderController.requestReturnOrderItem);

/**
 * @swagger
 * /api/orders/{id}/orderItem/cancelled:
 *   put:
 *     summary: Gửi yêu cầu hủy một hoặc nhiều sản phẩm trong đơn hàng
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của đơn hàng chứa các sản phẩm cần hủy
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *                - reason
 *                - items
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Lý do chung cho việc hủy sản phẩm.
 *                 example: "Khách đổi ý"
 *               items:
 *                 type: array
 *                 description: Một mảng các sản phẩm cần yêu cầu hủy.
 *                 items:
 *                   type: object
 *                   required:
 *                     - orderItemId
 *                     - cancelQuantity
 *                   properties:
 *                     orderItemId:
 *                       type: string
 *                       description: ID của một mục trong đơn hàng (order item).
 *                       example: "60c72b2f9b1d8c001f8e4c9a"
 *                     cancelQuantity:
 *                       type: number
 *                       description: Số lượng sản phẩm muốn hủy cho mục này.
 *                       example: 1
 *     responses:
 *       '200':
 *         description: Yêu cầu hủy sản phẩm đã được gửi thành công. Phản hồi có thể chứa một mảng lỗi nếu một số mặt hàng không hợp lệ.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 updatedOrderItems:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/OrderItem'
 *                 errors:
 *                   type: array
 *                   items:
 *                      type: string
 *       '400':
 *         description: Dữ liệu yêu cầu không hợp lệ (thiếu lý do, danh sách sản phẩm, hoặc tất cả sản phẩm đều không hợp lệ).
 *       '404':
 *         description: Không tìm thấy đơn hàng với ID đã cung cấp.
 *       '500':
 *         description: Lỗi máy chủ nội bộ.
 */
router.put('/:id/orderItem/cancelled', orderController.requestCancelledOrderItem);

/**
 * @swagger
 * /api/orders/{id}/orderItem/{orderItemId}:
 *   put:
 *     summary: Cập nhật trạng thái của một order item trong đơn hàng
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của đơn hàng
 *       - in: path
 *         name: orderItemId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của order item
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 description: Trạng thái mới của order item
 *     responses:
 *       200:
 *         description: Cập nhật trạng thái order item thành công
 *       404:
 *         description: Không tìm thấy đơn hàng hoặc order item
 *       400:
 *         description: Dữ liệu không hợp lệ
 */
router.put('/:id/orderItem/:orderItemId', verifyToken, authorizeRoles(ROLES.ORDER_MANAGER), orderController.editOrderItemStatus);

/**
 * @swagger
 * /api/orders/{id}/reject-return:
 *   put:
 *     summary: Từ chối yêu cầu trả hàng cho một đơn hàng
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của đơn hàng.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Lý do từ chối yêu cầu trả hàng.
 *     responses:
 *       200:
 *         description: Yêu cầu trả hàng đã bị từ chối thành công.
 *       400:
 *         description: Dữ liệu đầu vào không hợp lệ hoặc không có yêu cầu trả hàng.
 *       404:
 *         description: Không tìm thấy đơn hàng.
 *       500:
 *         description: Lỗi máy chủ.
 */
router.put('/:id/reject-return', verifyToken, authorizeRoles(ROLES.ORDER_MANAGER), orderController.rejectReturnRequest);

// top 3 products in order with status completed

module.exports = router;
