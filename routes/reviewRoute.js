const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const verifyToken = require('../middleware/auth');

// Create a new review
router.post('/', verifyToken, reviewController.createReview);

// Get all reviews
router.get('/', reviewController.getAllReviews);

// Get reviews by product ID
router.get('/product/:productId', reviewController.getReviewsByProduct);

// Get reviews by user ID
router.get('/user/:userId', reviewController.getReviewsByUser);

// Get single review by ID
router.get('/:id', reviewController.getReviewById);

// Update review
router.put('/:id', verifyToken, reviewController.updateReview);

// Delete review
router.delete('/:id', verifyToken, reviewController.deleteReview);

// Get average rating for a product
router.get('/rating/:productId', reviewController.getAverageRating);

// Get total comments count for a product
router.get('/comments/:productId', reviewController.getTotalComments);

module.exports = router;
