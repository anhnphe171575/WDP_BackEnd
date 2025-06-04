
const express = require('express');
const router = express.Router();
const { upload } = require('../config/cloudinary.js');
const verifyToken = require('../middleware/auth.js');
const { 
    createBlog, 
    getAllBlogs, 
    getBlog, 
    updateBlog, 
    deleteBlog 
} = require('../controller/blogController.js');

// Create blog - POST /api/blogs
router.post('/', verifyToken, upload.array('images', 5), createBlog);

// Get all blogs - GET /api/blogs
router.get('/', getAllBlogs);

// Get single blog - GET /api/blogs/:id
router.get('/:id', getBlog);

// Update blog - PUT /api/blogs/:id
router.put('/:id', verifyToken, upload.array('images', 5), updateBlog);

// Delete blog - DELETE /api/blogs/:id
router.delete('/:id', verifyToken, deleteBlog);

module.exports = router;

