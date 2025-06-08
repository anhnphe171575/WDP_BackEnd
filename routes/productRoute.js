const express = require('express');
const router = express.Router();
const { getTopSellingProducts, getProductsByCategory, getProductDetailsByCategory } = require('../controllers/product');
/**
 * @swagger     
 * /products/top-selling:
 *   get:
 *     summary: Lấy danh sách sản phẩm bán chạy
 *     responses:
 *       200:
 *         description: Thành công
 */
router.get('/top-selling', getTopSellingProducts);
router.get('/productsByCategory/:categoryId', getProductsByCategory);
router.get('/productDetailsByCategory/:categoryId', getProductDetailsByCategory);
module.exports = router;
