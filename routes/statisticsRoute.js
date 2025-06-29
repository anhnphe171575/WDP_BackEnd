// const express = require('express');
// const router = express.Router();
// const { getProductRevenueStatistics, getRevenueByTime, getLowRevenueProducts } = require('../controllers/statisticsController');
// const { verifyToken } = require('../middleware/auth');
// const { ROLES } = require('../config/role');
// // const { checkRole } = require('../middleware/authorization');

// // Middleware kiểm tra quyền ADMIN_BUSINESS
// // const requireAdminBusiness = checkRole(ROLES.ADMIN_BUSINESS);

// // Route lấy thống kê doanh thu và lãi theo sản phẩm
// router.get('/product-revenue', verifyToken, requireAdminBusiness, getProductRevenueStatistics);

// // Route lấy thống kê doanh thu theo thời gian
// router.get('/revenue-by-time', verifyToken, requireAdminBusiness, getRevenueByTime);

// // Route lấy thống kê sản phẩm bán chậm
// router.get('/low-revenue-products', verifyToken, requireAdminBusiness, getLowRevenueProducts);

// module.exports = router; 