const mongoose = require('mongoose');
const Review = require('../models/reviewModel');
const Order = require('../models/order');
const OrderItem = require('../models/orderItem');

// Create a new review
exports.createReview = async (req, res) => {
    try {
        console.log(req.body);
        const { productId, rating, comment } = req.body;
        const images = req.files ? req.files.map(file => ({ url: file.path })) : [];
        const userId = req.user.id; // Lấy userId từ middleware auth

        // Validation
        if (!productId || !rating) {
            return res.status(400).json({
                success: false,
                error: 'Product ID and rating are required'
            });
        }

        if (rating < 1 || rating > 5) {
            return res.status(400).json({
                success: false,
                error: 'Rating must be between 1 and 5'
            });
        }

        // Kiểm tra xem người dùng đã mua sản phẩm này chưa
        const hasPurchased = await Order.aggregate([
            { $match: { userId: new mongoose.Types.ObjectId(userId) } },
            { $unwind: '$OrderItems' },
            {
                $lookup: {
                    from: 'orderitems',
                    localField: 'OrderItems',
                    foreignField: '_id',
                    as: 'orderItemDetails'
                }
            },
            { $unwind: '$orderItemDetails' },
            { $match: { 'orderItemDetails.productId': new mongoose.Types.ObjectId(productId) } }
        ]);

        if (hasPurchased.length === 0) {
            return res.status(403).json({
                success: false,
                error: 'You can only review products you have purchased'
            });
        }

        // Kiểm tra xem người dùng đã review sản phẩm này chưa
        const existingReview = await Review.findOne({ userId, productId });
        if (existingReview) {
            return res.status(400).json({
                success: false,
                error: 'You have already reviewed this product'
            });
        }

        // Tạo review mới
        const review = new Review({
            userId,
            productId,
            rating,
            comment: comment || '',
            images: images
        });

        const savedReview = await review.save();

        // Populate thông tin user và product để trả về
        const populatedReview = await Review.findById(savedReview._id)
            .populate('userId', 'name email')
            .populate('productId', 'name price');

        res.status(201).json({
            success: true,
            message: 'Review created successfully',
            data: populatedReview
        });
    } catch (error) {
        console.error('Create review error:', error);
        res.status(500).json({
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
        const { rating, comment } = req.body;
        const images = req.files ? req.files.map(file => ({ url: file.path })) : undefined;
        const review = await Review.findById(req.params.id);

        if (!review) {
            return res.status(404).json({
                success: false,
                error: 'Review not found'
            });
        }

        // Kiểm tra quyền sở hữu review
        if (review.userId.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                error: 'You can only update your own reviews'
            });
        }

        // Update fields
        if (rating !== undefined) {
            if (rating < 1 || rating > 5) {
                return res.status(400).json({
                    success: false,
                    error: 'Rating must be between 1 and 5'
                });
            }
            review.rating = rating;
        }
        if (comment !== undefined) review.comment = comment;
        if (images !== undefined) review.images = images;

        const updatedReview = await review.save();
        
        // Populate thông tin user và product để trả về
        const populatedReview = await Review.findById(updatedReview._id)
            .populate('userId', 'name email')
            .populate('productId', 'name price');

        res.status(200).json({
            success: true,
            message: 'Review updated successfully',
            data: populatedReview
        });
    } catch (error) {
        console.error('Update review error:', error);
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

        // Kiểm tra quyền sở hữu review
        if (review.userId.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                error: 'You can only delete your own reviews'
            });
        }

        await review.deleteOne();
        res.status(200).json({
            success: true,
            message: 'Review deleted successfully',
            data: {}
        });
    } catch (error) {
        console.error('Delete review error:', error);
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
            { $match: { productId: new mongoose.Types.ObjectId(productId) } },
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

// Get products that user has purchased but not reviewed
exports.getUnreviewedProducts = async (req, res) => {
    try {
        const {  productId } = req.params;
        const userId = req.user.id;
        // Bước 1: Lấy danh sách sản phẩm đã mua
        const purchasedProducts = await Order.aggregate([
            { $match: { userId: new mongoose.Types.ObjectId(userId) } },
            { $unwind: '$OrderItems' },
            {
                $lookup: {
                    from: 'orderitems',
                    localField: 'OrderItems',
                    foreignField: '_id',
                    as: 'orderItemDetails'
                }
            },
            { $unwind: '$orderItemDetails' },
            // Nếu có productId, lọc theo sản phẩm cụ thể
            ...(productId ? [{ $match: { 'orderItemDetails.productId': new mongoose.Types.ObjectId(productId) } }] : []),
            {
                $lookup: {
                    from: 'products',
                    localField: 'orderItemDetails.productId',
                    foreignField: '_id',
                    as: 'productDetails'
                }
            },
            { $unwind: '$productDetails' },
            {
                $group: {
                    _id: '$orderItemDetails.productId',
                    productName: { $first: '$productDetails.name' },
                    productDescription: { $first: '$productDetails.description' },
                    productBrand: { $first: '$productDetails.brand' },
                    totalQuantity: { $sum: '$orderItemDetails.quantity' },
                    lastPurchaseDate: { $max: '$createAt' }
                }
            }
        ]);

        // Bước 2: Lấy danh sách sản phẩm đã review
        const reviewedProducts = await Review.find({ userId })
            .distinct('productId');

        // Bước 3: So sánh và tìm sản phẩm chưa được review
        const unreviewedProducts = purchasedProducts.filter(product => 
            !reviewedProducts.some(reviewedId => 
                reviewedId.toString() === product._id.toString()
            )
        );

        res.status(200).json({
            success: true,
            data: {
                totalPurchasedProducts: purchasedProducts.length,
                totalReviewedProducts: reviewedProducts.length,
                unreviewedProducts: unreviewedProducts,
                unreviewedCount: unreviewedProducts.length
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};
