const express = require('express');
const router = express.Router();
const voucherController = require('../controllers/voucherController');
const verifyToken = require('../middleware/auth');

/**
 * @swagger
 * components:
 *   schemas:
 *     Voucher:
 *       type: object
 *       required:
 *         - code
 *         - validFrom
 *         - validTo
 *       properties:
 *         code:
 *           type: string
 *           description: Mã voucher
 *         discountAmount:
 *           type: number
 *           description: Số tiền giảm giá
 *         discountPercent:
 *           type: number
 *           description: Phần trăm giảm giá
 *         validFrom:
 *           type: string
 *           format: date-time
 *           description: Thời gian bắt đầu hiệu lực
 *         validTo:
 *           type: string
 *           format: date-time
 *           description: Thời gian kết thúc hiệu lực
 *         usageLimit:
 *           type: number
 *           description: Số lần sử dụng tối đa
 *         usedCount:
 *           type: number
 *           description: Số lần đã sử dụng
 */

/**
 * @swagger
 * /api/vouchers:
 *   get:
 *     summary: Lấy danh sách tất cả voucher
 *     tags: [Vouchers]
 *     responses:
 *       200:
 *         description: Danh sách voucher
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Voucher'
 *       500:
 *         description: Lỗi server
 */
router.get('/', voucherController.getAllVouchers);

/**
 * @swagger
 * /api/vouchers/{id}:
 *   get:
 *     summary: Lấy thông tin một voucher theo ID
 *     tags: [Vouchers]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: ID của voucher
 *     responses:
 *       200:
 *         description: Thông tin voucher
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Voucher'
 *       404:
 *         description: Không tìm thấy voucher
 *       500:
 *         description: Lỗi server
 */
router.get('/:id', voucherController.getVoucherById);

/**
 * @swagger
 * /api/vouchers:
 *   post:
 *     summary: Tạo voucher mới
 *     tags: [Vouchers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *               - validFrom
 *               - validTo
 *             properties:
 *               code:
 *                 type: string
 *               discountAmount:
 *                 type: number
 *               discountPercent:
 *                 type: number
 *               validFrom:
 *                 type: string
 *                 format: date-time
 *               validTo:
 *                 type: string
 *                 format: date-time
 *               usageLimit:
 *                 type: number
 *     responses:
 *       201:
 *         description: Voucher đã được tạo thành công
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Voucher'
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       401:
 *         description: Không có quyền truy cập
 *       500:
 *         description: Lỗi server
 */
router.post('/', voucherController.createVoucher);

/**
 * @swagger
 * /api/vouchers/{id}:
 *   put:
 *     summary: Cập nhật thông tin voucher
 *     tags: [Vouchers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: ID của voucher
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               code:
 *                 type: string
 *               discountAmount:
 *                 type: number
 *               discountPercent:
 *                 type: number
 *               validFrom:
 *                 type: string
 *                 format: date-time
 *               validTo:
 *                 type: string
 *                 format: date-time
 *               usageLimit:
 *                 type: number
 *     responses:
 *       200:
 *         description: Voucher đã được cập nhật thành công
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Voucher'
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       401:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy voucher
 *       500:
 *         description: Lỗi server
 */
router.put('/:id', voucherController.updateVoucher);

/**
 * @swagger
 * /api/vouchers/{id}:
 *   delete:
 *     summary: Xóa voucher
 *     tags: [Vouchers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: ID của voucher
 *     responses:
 *       200:
 *         description: Voucher đã được xóa thành công
 *       401:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy voucher
 *       500:
 *         description: Lỗi server
 */
router.delete('/:id', voucherController.deleteVoucher);

/**
 * @swagger
 * /api/vouchers/validate:
 *   post:
 *     summary: Kiểm tra và áp dụng voucher
 *     tags: [Vouchers]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *             properties:
 *               code:
 *                 type: string
 *                 description: Mã voucher cần kiểm tra
 *     responses:
 *       200:
 *         description: Voucher hợp lệ
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 voucher:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     discountAmount:
 *                       type: number
 *                     discountPercent:
 *                       type: number
 *       400:
 *         description: Voucher không hợp lệ hoặc đã hết hạn
 *       404:
 *         description: Không tìm thấy voucher
 *       500:
 *         description: Lỗi server
 */
router.post('/validate', voucherController.validateVoucher);

module.exports = router;
  
