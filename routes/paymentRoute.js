const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const verifyToken = require('../middleware/auth');

router.post('/create-payment', verifyToken,paymentController.createPayment);
module.exports = router;
