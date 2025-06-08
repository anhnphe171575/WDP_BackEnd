const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const verifyToken = require('../middleware/auth');


router.get('/orders', verifyToken, userController.getAllOrders);
router.get('/orders/:orderId', verifyToken, userController.getOrderDetails);

module.exports = router;