const Review = require('../models/reviewModel');

// Create a new review
exports.createReview = async (req, res) => {
    try {
        const { userId, productId, rating, comment, images } = req.body;
        
        const review = new Review({
            userId,
            productId,
            rating,
            comment,
            images: images || []
        });

        const savedReview = await review.save();
        res.status(201).json({
            success: true,
            data: savedReview
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
};

// Get all reviews
exports.getAllReviews = async (req, res) => {
    try {
        const reviews = await Review.find()
            .populate('userId', 'name email')
            .populate('productId', 'name price');
        
        res.status(200).json({
            success: true,
            count: reviews.length,
            data: reviews
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// Get reviews by product ID
exports.getReviewsByProduct = async (req, res) => {
    try {
        const { productId } = req.params;
        const reviews = await Review.find({ productId })
            .populate('userId', 'name email')
            .populate('productId', 'name price');
        
        res.status(200).json({
            success: true,
            count: reviews.length,
            data: reviews
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// Get reviews by user ID
exports.getReviewsByUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const reviews = await Review.find({ userId })
            .populate('userId', 'name email')
            .populate('productId', 'name price');
        
        res.status(200).json({
            success: true,
            count: reviews.length,
            data: reviews
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// Get single review by ID
exports.getReviewById = async (req, res) => {
    try {
        const review = await Review.findById(req.params.id)
            .populate('userId', 'name email')
            .populate('productId', 'name price');
        
        if (!review) {
            return res.status(404).json({
                success: false,
                error: 'Review not found'
            });
        }

        res.status(200).json({
            success: true,
            data: review
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// Update review
exports.updateReview = async (req, res) => {
    try {
        const { rating, comment, images } = req.body;
        const review = await Review.findById(req.params.id);

        if (!review) {
            return res.status(404).json({
                success: false,
                error: 'Review not found'
            });
        }

        // Update fields
        if (rating) review.rating = rating;
        if (comment) review.comment = comment;
        if (images) review.images = images;

        const updatedReview = await review.save();
        res.status(200).json({
            success: true,
            data: updatedReview
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
};

// Delete review
exports.deleteReview = async (req, res) => {
    try {
        const review = await Review.findById(req.params.id);

        if (!review) {
            return res.status(404).json({
                success: false,
                error: 'Review not found'
            });
        }

        await review.deleteOne();
        res.status(200).json({
            success: true,
            data: {}
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// Get average rating for a product
exports.getAverageRating = async (req, res) => {
    try {
        const { productId } = req.params;
        const result = await Review.aggregate([
            { $match: { productId: mongoose.Types.ObjectId(productId) } },
            {
                $group: {
                    _id: '$productId',
                    averageRating: { $avg: '$rating' },
                    totalReviews: { $sum: 1 }
                }
            }
        ]);

        if (result.length === 0) {
            return res.status(200).json({
                success: true,
                data: {
                    averageRating: 0,
                    totalReviews: 0
                }
            });
        }

        res.status(200).json({
            success: true,
            data: result[0]
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// Get total comments count for a product
exports.getTotalComments = async (req, res) => {
    try {
        const { productId } = req.params;
        const totalComments = await Review.countDocuments({ 
            productId,
            comment: { $exists: true, $ne: "" } // Only count reviews that have non-empty comments
        });

        res.status(200).json({
            success: true,
            data: {
                productId,
                totalComments
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};
