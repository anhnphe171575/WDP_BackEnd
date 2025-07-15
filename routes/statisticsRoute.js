const express = require('express');
const router = express.Router();
const { getProductRevenueStatistics, getRevenueByTime, getLowRevenueProducts } = require('../controllers/statisticsController');
const  verifyToken  = require('../middleware/auth');
const authorizeRoles = require('../middleware/authorization');

// const { ROLES } = require('../config/role');
// const { checkRole } = require('../middleware/authorization');




router.get('/product-revenue', verifyToken , authorizeRoles(8), getProductRevenueStatistics);

// // Route lấy thống kê doanh thu theo thời gian
router.get('/revenue-by-time', verifyToken, authorizeRoles(8), getRevenueByTime);

// // Route lấy thống kê sản phẩm bán chậm
router.get('/low-revenue-products', verifyToken, authorizeRoles(8), getLowRevenueProducts);

module.exports = router; 