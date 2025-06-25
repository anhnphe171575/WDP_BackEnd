const express = require('express');
const router = express.Router();
const wishlistController = require('../controllers/wishlistController');
const auth = require('../middleware/auth');

// Thêm sản phẩm vào wishlist
router.post('/add', auth, wishlistController.addToWishlist);

// Xóa sản phẩm khỏi wishlist
router.post('/remove', auth, wishlistController.removeFromWishlist);

// Lấy danh sách wishlist của user
router.get('/', auth, wishlistController.getWishlist);

module.exports = router; 