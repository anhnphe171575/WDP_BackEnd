const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const verifyToken = require('../middleware/auth');
const { upload } = require('../config/cloudinary');
const authorizeRoles = require('../middleware/authorization');
// Create a new review
router.post('/', verifyToken, upload.array('images', 5), reviewController.createReview);

// Get all reviews
router.get('/', reviewController.getAllReviews);

// Get reviews by product ID
router.get('/product/:productId',verifyToken,authorizeRoles(4), reviewController.getReviewsByProduct);

// Get reviews by user ID
router.get('/user/:userId', reviewController.getReviewsByUser);

// Get single review by ID
router.get('/:id', reviewController.getReviewById);

// Update review
router.put('/:id', verifyToken, upload.array('images', 5),authorizeRoles(4), reviewController.updateReview);

// Delete review
router.delete('/:id', verifyToken,authorizeRoles(4), reviewController.deleteReview);

// Get average rating for a product
router.get('/rating/:productId', reviewController.getAverageRating);

// Get total comments count for a product
router.get('/comments/:productId', reviewController.getTotalComments);

// Get unreviewed products for a user
router.get('/unreviewed/:productId', verifyToken, reviewController.getUnreviewedProducts);

module.exports = router;
