const express = require('express');
const router = express.Router();
const { upload } = require('../config/cloudinary.js');
const { 
    createBlog, 
    getAllBlogs, 
    getBlog, 
    updateBlog, 
    deleteBlog 
} = require('../controllers/blogController.js');

/**
 * @swagger
 * tags:
 *   name: Blogs
 *   description: Quản lý bài viết blog
 */

/**
 * @swagger
 * /api/blogs:
 *   post:
 *     summary: Tạo bài viết blog mới
 *     tags: [Blogs]
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
 *               content:
 *                 type: string
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       201:
 *         description: Tạo bài viết thành công
 */

/**
 * @swagger
 * /api/blogs:
 *   get:
 *     summary: Lấy danh sách tất cả bài viết
 *     tags: [Blogs]
 *     responses:
 *       200:
 *         description: Thành công
 */

/**
 * @swagger
 * /api/blogs/{id}:
 *   get:
 *     summary: Lấy thông tin bài viết theo ID
 *     tags: [Blogs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của bài viết
 *     responses:
 *       200:
 *         description: Thành công
 *       404:
 *         description: Không tìm thấy bài viết
 */

/**
 * @swagger
 * /api/blogs/{id}:
 *   put:
 *     summary: Cập nhật bài viết theo ID
 *     tags: [Blogs]
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
 *               content:
 *                 type: string
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       404:
 *         description: Không tìm thấy bài viết
 */

/**
 * @swagger
 * /api/blogs/{id}:
 *   delete:
 *     summary: Xóa bài viết theo ID
 *     tags: [Blogs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của bài viết
 *     responses:
 *       200:
 *         description: Xóa thành công
 *       404:
 *         description: Không tìm thấy bài viết
 */

// Create blog - POST /api/blogs
router.post('/', upload.array('images', 5), createBlog);

// Get all blogs - GET /api/blogs
router.get('/', getAllBlogs);

// Get single blog - GET /api/blogs/:id
router.get('/:id', getBlog);

// Update blog - PUT /api/blogs/:id
router.put('/:id', upload.array('images', 5), updateBlog);

// Delete blog - DELETE /api/blogs/:id
router.delete('/:id', deleteBlog);

module.exports = router;

