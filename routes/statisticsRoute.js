const express = require('express');
const router = express.Router();
const { getProductRevenueStatistics, getRevenueByTime, getLowRevenueProducts } = require('../controllers/statisticsController');
const  verifyToken  = require('../middleware/auth');


// Middleware kiểm tra quyền ADMIN_BUSINESS
// const requireAdminBusiness = checkRole(ROLES.ADMIN_BUSINESS);

// Route lấy thống kê doanh thu và lãi theo sản phẩm
router.get('/product-revenue', verifyToken , getProductRevenueStatistics);

// // Route lấy thống kê doanh thu theo thời gian
router.get('/revenue-by-time', verifyToken, getRevenueByTime);

// // Route lấy thống kê sản phẩm bán chậm
router.get('/low-revenue-products', verifyToken, getLowRevenueProducts);

module.exports = router; 