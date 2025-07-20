const express = require('express');
const router = express.Router();
const marketingController = require('../controllers/marketingController');

// Route lấy dữ liệu dashboard marketing
router.get('/dashboard', marketingController.getDashboardData);
// Route export Excel dashboard marketing
router.get('/dashboard/excel', marketingController.exportDashboardExcel);

module.exports = router; 