const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
// get orders dashboard
router.get('/dashboard', orderController.getOrdersDashboard);

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
router.post('/', orderController.createOrder);

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
router.get('/', orderController.getAllOrders);

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
router.get('/:id', orderController.getOrderById);

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
router.put('/:id', orderController.updateOrder);

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
router.delete('/:id', orderController.deleteOrder);

module.exports = router;
