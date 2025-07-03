const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const  verifyToken  = require('../middleware/auth');
const { ROLES } = require('../config/role');
const  authorizeRoles  = require('../middleware/authorization');

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: Quản lý người dùng
 */

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Lấy danh sách tất cả người dùng
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: Thành công
 */
router.get('/', userController.getAllUsers);

/**
 * @swagger
 * /api/users/dashboard:
 *   get:
 *     summary: Lấy thống kê dashboard quản lý người dùng
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: Thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalUsers:
 *                       type: number
 *                       description: Tổng số người dùng
 *                     totalVerifiedUsers:
 *                       type: number
 *                       description: Số người dùng đã xác thực
 *                     totalUnverifiedUsers:
 *                       type: number
 *                       description: Số người dùng chưa xác thực
 *                     currentMonthUsers:
 *                       type: number
 *                       description: Số người dùng đăng ký tháng hiện tại
 *                     previousMonthUsers:
 *                       type: number
 *                       description: Số người dùng đăng ký tháng trước
 *                     userGrowthPercentage:
 *                       type: string
 *                       description: Phần trăm tăng trưởng so với tháng trước
 *                     userRegistrationByMonth:
 *                       type: array
 *                       description: Thống kê đăng ký theo tháng trong năm hiện tại
 *                       items:
 *                         type: object
 *                         properties:
 *                           month:
 *                             type: number
 *                           count:
 *                             type: number
 *                     userRegistrationByMonthLastYear:
 *                       type: array
 *                       description: Thống kê đăng ký theo tháng trong năm trước
 *                       items:
 *                         type: object
 *                         properties:
 *                           month:
 *                             type: number
 *                           count:
 *                             type: number
 *                     userRegistrationByMonthTwoYearsAgo:
 *                       type: array
 *                       description: Thống kê đăng ký theo tháng trong 2 năm trước
 *                       items:
 *                         type: object
 *                         properties:
 *                           month:
 *                             type: number
 *                           count:
 *                             type: number
 *                     userRegistrationByYear:
 *                       type: array
 *                       description: Thống kê đăng ký theo năm
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: number
 *                           count:
 *                             type: number
 *                     usersByRole:
 *                       type: array
 *                       description: Thống kê người dùng theo role
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: number
 *                           count:
 *                             type: number
 *                     topCustomersByRevenue:
 *                       type: array
 *                       description: Top 10 khách hàng mua hàng nhiều nhất theo doanh thu
 *                       items:
 *                         type: object
 *                         properties:
 *                           userId:
 *                             type: string
 *                           userName:
 *                             type: string
 *                           userEmail:
 *                             type: string
 *                           totalRevenue:
 *                             type: number
 *                           orderCount:
 *                             type: number
 *                           averageOrderValue:
 *                             type: number
 *                     topCustomersByOrderCount:
 *                       type: array
 *                       description: Top 10 khách hàng mua hàng nhiều nhất theo số lượng đơn hàng
 *                       items:
 *                         type: object
 *                         properties:
 *                           userId:
 *                             type: string
 *                           userName:
 *                             type: string
 *                           userEmail:
 *                             type: string
 *                           totalRevenue:
 *                             type: number
 *                           orderCount:
 *                             type: number
 *                           averageOrderValue:
 *                             type: number
 *                     topUsersByCancellations:
 *                       type: array
 *                       description: Top 10 người dùng hủy hàng nhiều nhất
 *                       items:
 *                         type: object
 *                         properties:
 *                           userId:
 *                             type: string
 *                           userName:
 *                             type: string
 *                           userEmail:
 *                             type: string
 *                           cancelledOrderCount:
 *                             type: number
 *                           totalCancelledValue:
 *                             type: number
 *                     totalPotentialCustomers:
 *                       type: number
 *                       description: Tổng số khách hàng tiềm năng (chưa có đơn hàng)
 *                     potentialCustomers:
 *                       type: array
 *                       description: Danh sách 10 khách hàng tiềm năng mới nhất
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           email:
 *                             type: string
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                           verified:
 *                             type: boolean
 *       500:
 *         description: Lỗi server
 */
router.get('/dashboard', verifyToken, authorizeRoles(ROLES.ORDER_MANAGER), userController.getUserDashboard);

/**
 * @swagger
 * /api/users/orders:
 *   get:
 *     summary: Lấy tất cả đơn hàng của người dùng hiện tại
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Thành công
 */
router.get('/orders', verifyToken, userController.getAllOrders);

/**
 * @swagger
 * /api/users/orders/{orderId}:
 *   get:
 *     summary: Lấy chi tiết đơn hàng của người dùng
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID đơn hàng
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Thành công
 */
router.get('/orders/:orderId', verifyToken, userController.getOrderDetails);
/**
 * @swagger
 * /api/users/addresses:
 *   get:
 *     summary: Lấy tất cả địa chỉ của người dùng hiện tại
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Thành công
 */
router.get('/addresses', verifyToken, userController.getUserAddresses)
/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Lấy thông tin người dùng theo ID
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của người dùng
 *     responses:
 *       200:
 *         description: Thành công
 */
router.post('/addresses', verifyToken, userController.addAddress);

router.delete('/addresses/:addressId', verifyToken, userController.deleteAddress);

router.put('/edit-profile', verifyToken, userController.updateProfile);

router.put('/:id', userController.updateUser);
router.get('/:id', verifyToken, userController.getUserById);
router.delete('/:id', userController.deleteUser);

/**
 * @swagger
 * /api/users:
 *   post:
 *     summary: Tạo người dùng mới
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: Tạo thành công
 */
router.post('/', userController.createUser);

/**
 * @swagger
 * /api/users/profile:
 *   put:
 *     summary: Cập nhật thông tin cá nhân
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Họ và tên mới
 *               phone:
 *                 type: string
 *                 description: Số điện thoại mới
 *               dob:
 *                 type: string
 *                 format: date
 *                 description: Ngày sinh mới (YYYY-MM-DD)
 *               address:
 *                 type: array
 *                 description: Danh sách địa chỉ mới (ghi đè toàn bộ)
 *                 items:
 *                   type: object
 *                   properties:
 *                     street:
 *                       type: string
 *                     city:
 *                       type: string
 *                     state:
 *                       type: string
 *                     postalCode:
 *                       type: string
 *                     country:
 *                       type: string
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: Lỗi dữ liệu đầu vào hoặc không có trường nào để cập nhật
 *       401:
 *         description: Không có hoặc thiếu token xác thực
 *       404:
 *         description: Không tìm thấy người dùng
 */

module.exports = router;
