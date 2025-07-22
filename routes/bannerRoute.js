const express = require('express');
const router = express.Router();
const bannerController = require('../controllers/bannerController');
const { upload } = require('../config/cloudinary');
const authorizeRoles = require('../middleware/authorization');
const verifyToken = require('../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: Banners
 *   description: Quản lý banners
 */

/**
 * @swagger
 * /api/banners:
 *   get:
 *     summary: Lấy danh sách tất cả banner
 *     tags: [Banners]
 *     responses:
 *       200:
 *         description: Thành công
 */

/**
 * @swagger
 * /api/banners/{id}:
 *   get:
 *     summary: Lấy thông tin banner theo ID
 *     tags: [Banners]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của banner
 *     responses:
 *       200:
 *         description: Thành công
 */

/**
 * @swagger
 * /api/banners:
 *   post:
 *     summary: Tạo banner mới
 *     tags: [Banners]
 *     consumes:
 *       - multipart/form-data
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Tạo thành công
 */

/**
 * @swagger
 * /api/banners/{id}:
 *   put:
 *     summary: Cập nhật banner theo ID
 *     tags: [Banners]
 *     consumes:
 *       - multipart/form-data
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 */

/**
 * @swagger
 * /api/banners/{id}:
 *   delete:
 *     summary: Xóa banner theo ID
 *     tags: [Banners]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của banner
 *     responses:
 *       200:
 *         description: Xóa thành công
 */


// Create a new banner
router.post('/', upload.single('image'),authorizeRoles(4), bannerController.createBanner);

// Get all banners
router.get('/', bannerController.getAllBanners);

// Get a single banner by ID
router.get('/:id', verifyToken, authorizeRoles(4), bannerController.getBannerById);

// Update a banner
router.put('/:id', verifyToken, authorizeRoles(4), upload.single('image'), bannerController.updateBanner);

// Delete a banner
router.delete('/:id', verifyToken, authorizeRoles(4), bannerController.deleteBanner);

module.exports = router;