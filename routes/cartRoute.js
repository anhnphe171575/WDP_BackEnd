const express = require('express');
const router = express.Router();
const { addToCart,  getCart, updateCart, deleteCartItem } = require('../controllers/cartController');   
const verifyToken = require('../middleware/auth');

router.post('/add-to-cart', verifyToken, addToCart);
router.get('/get-cart', verifyToken, getCart);
router.put('/update-cart', verifyToken, updateCart);
router.delete('/delete-cart-item', verifyToken, deleteCartItem);

module.exports = router;