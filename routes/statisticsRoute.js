const express = require('express');
const router = express.Router();
const statisticsController = require('../controllers/statisticsController');
const  verifyToken  = require('../middleware/auth');
const authorizeRoles = require('../middleware/authorization');

// const { ROLES } = require('../config/role');
// const { checkRole } = require('../middleware/authorization');




router.get('/product-revenue', verifyToken , authorizeRoles(8), statisticsController.getProductRevenueStatistics);

// // Route lấy thống kê doanh thu theo thời gian
router.get('/revenue-by-time', verifyToken, authorizeRoles(8), statisticsController.getRevenueByTime);

// // Route lấy thống kê sản phẩm bán chậm
router.get('/low-revenue-products', verifyToken, authorizeRoles(8), statisticsController.getLowRevenueProducts);

router.get('/marketing-dashboard', statisticsController.getMarketingDashboard);

module.exports = router; 