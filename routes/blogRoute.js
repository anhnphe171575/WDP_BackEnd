const express = require('express');
const router = express.Router();
const { upload } = require('../config/cloudinary.js');
const verifyToken = require('../middleware/auth.js');
const authorizeRoles = require('../middleware/authorization.js');
const auth = require('../middleware/auth.js');
const { ROLES } = require('../config/role.js');
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
 *   get:
 *     summary: Lấy danh sách tất cả bài viết blog
 *     tags: [Blogs]
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
 *                 blogs:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       title:
 *                         type: string
 *                       description:
 *                         type: string
 *                       tag:
 *                         type: string
 *                       images:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             url:
 *                               type: string
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 */

/**
 * @swagger
 * /api/blogs/{id}:
 *   get:
 *     summary: Lấy thông tin bài viết blog theo ID
 *     tags: [Blogs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của bài viết blog
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
 *                 blog:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                     title:
 *                       type: string
 *                     description:
 *                       type: string
 *                     tag:
 *                       type: string
 *                     images:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           url:
 *                             type: string
 *                     createdAt:
 *                       type: string
 *                       format: date-time
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
 *                 required: true
 *               description:
 *                 type: string
 *                 required: true
 *               tag:
 *                 type: string
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       201:
 *         description: Tạo thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 blog:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                     title:
 *                       type: string
 *                     description:
 *                       type: string
 *                     tag:
 *                       type: string
 *                     images:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           url:
 *                             type: string
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 */

/**
 * @swagger
 * /api/blogs/{id}:
 *   put:
 *     summary: Cập nhật bài viết blog theo ID
 *     tags: [Blogs]
 *     consumes:
 *       - multipart/form-data
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của bài viết blog
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 required: true
 *               description:
 *                 type: string
 *                 required: true
 *               tag:
 *                 type: string
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
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
 *                 blog:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                     title:
 *                       type: string
 *                     description:
 *                       type: string
 *                     tag:
 *                       type: string
 *                     images:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           url:
 *                             type: string
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 */

/**
 * @swagger
 * /api/blogs/{id}:
 *   delete:
 *     summary: Xóa bài viết blog theo ID
 *     tags: [Blogs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của bài viết blog
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Xóa thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 */

// Create blog - POST /api/blogs
router.post('/', verifyToken, upload.array('images', 5), createBlog);

router.get('/marketing', verifyToken,authorizeRoles(ROLES.MARKETING_MANAGER, ROLES.ORDER_MANAGER), getAllBlogs);

router.get('/customer', verifyToken,authorizeRoles(1), getAllBlogs);

router.get('/:id', getBlog);


router.put('/:id', verifyToken, upload.array('images', 5), updateBlog);


router.delete('/:id', verifyToken, deleteBlog);

module.exports = router;

