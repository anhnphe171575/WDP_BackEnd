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



// Create blog - POST /api/blogs
router.post('/', verifyToken, upload.array('images', 5),authorizeRoles(4), createBlog);

router.get('/marketing', verifyToken,authorizeRoles(ROLES.MARKETING_MANAGER, ROLES.ORDER_MANAGER), getAllBlogs);

router.get('/customer', verifyToken,authorizeRoles(1), getAllBlogs);

router.get('/:id', getBlog);


router.put('/:id', verifyToken, upload.array('images', 5),authorizeRoles(4), updateBlog);


router.delete('/:id', verifyToken,authorizeRoles(4), deleteBlog);

module.exports = router;

