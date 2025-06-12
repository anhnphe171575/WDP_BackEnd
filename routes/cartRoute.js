const express = require('express');
const router = express.Router();
const { addToCart,  getCart, updateCart, deleteCartItem, getLatestCartItem } = require('../controllers/cartController');   
const verifyToken = require('../middleware/auth');
/**
 * @swagger
 * /api/cart/getcart:
 *   get:
 *     summary: Lấy giỏ hàng của người dùng hiện tại
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Thành công
 */
router.get('/getcart', verifyToken, getCart);

/**
 * @swagger
 * /api/cart/addtocart:
 *   post:
 *     summary: Thêm sản phẩm vào giỏ hàng
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Thành công
 *       400:
 *         description: Lỗi
 */
router.post('/addtocart',verifyToken, addToCart);

/**
 * @swagger
 * /api/cart/updatecart:
 *   put:
 *     summary: Cập nhật giỏ hàng
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Thành công
 *       400:
 *         description: Lỗi
 */
router.put('/updatecart', verifyToken, updateCart);

/**
 * @swagger
 * /api/cart/deletecartitem:
 *   delete:
 *     summary: Xóa sản phẩm khỏi giỏ hàng
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Thành công
 *       400:
 *         description: Lỗi
 */
router.delete('/deletecartitem/:cartItemId', verifyToken, deleteCartItem);

/**
 * @swagger 
 * /api/cart/getlatestcartitem:
 *   get:
 *     summary: Lấy sản phẩm mới nhất trong giỏ hàng
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     responses:
 */
router.get('/getlatestcartitem', verifyToken, getLatestCartItem);
module.exports = router;