const Product = require('../models/product');
const Order = require('../models/order');
const mongoose = require('mongoose');
const Attribute = require('../models/attribute'); // adjust path as needed

// Get top 5 best-selling products or 5 most recent products if no sales
const getTopSellingProducts = async (req, res) => {
    try {
        const topProducts = await Order.aggregate([
            // Unwind OrderItems array to get individual items
            { $unwind: '$OrderItems' },
            // Lookup to get product details from OrderItem
            {
                $lookup: {
                    from: 'orderitems',
                    localField: 'OrderItems.orderItem_id',
                    foreignField: '_id',
                    as: 'orderItemDetails'
                }
            },
            // Unwind the orderItemDetails array
            { $unwind: '$orderItemDetails' },
            // Group by product and count occurrences
            {
                $group: {
                    _id: '$orderItemDetails.product',
                    totalSold: { $sum: '$orderItemDetails.quantity' }
                }
            },
            // Sort by totalSold in descending order
            { $sort: { totalSold: -1 } },
            // Limit to top 5
            { $limit: 5 },
            // Lookup to get product details
            {
                $lookup: {
                    from: 'products',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'productDetails'
                }
            },
            // Unwind productDetails array
            { $unwind: '$productDetails' },
            // Lookup to get product variants
            {
                $lookup: {
                    from: 'productvariants',
                    localField: '_id',
                    foreignField: 'product_id',
                    as: 'variants'
                }
            },
            // Project only needed fields
            {
                $project: {
                    _id: 1,
                    name: '$productDetails.name',
                    description: '$productDetails.description',
                    totalSold: 1,
                    minSellPrice: { $min: '$variants.sellPrice' },
                    images: {
                        $reduce: {
                            input: '$variants.images',
                            initialValue: [],
                            in: { $concatArrays: ['$$value', '$$this'] }
                        }
                    }
                }
            }
        ]);

        // If no top-selling products found, get 5 most recent products
        if (topProducts.length === 0) {
            const recentProducts = await Product.aggregate([
                { $sort: { createdAt: -1 } },
                { $limit: 5 },
                {
                    $lookup: {
                        from: 'productvariants',
                        localField: '_id',
                        foreignField: 'product_id',
                        as: 'variants'
                    }
                },
                {
                    $project: {
                        _id: 1,
                        name: 1,
                        description: 1,
                        totalSold: { $literal: 0 },
                        minSellPrice: { $min: '$variants.sellPrice' },
                        images: {
                            $reduce: {
                                input: '$variants.images',
                                initialValue: [],
                                in: { $concatArrays: ['$$value', '$$this'] }
                            }
                        }
                    }
                }
            ]);

            return res.status(200).json({
                success: true,
                data: recentProducts
            });
        }

        res.status(200).json({
            success: true,
            data: topProducts
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error getting top selling products',
            error: error.message
        });
    }
};

const getProductsByCategory = async (req, res) => {
    try {
        const { categoryId } = req.params;
        if (!mongoose.isValidObjectId(categoryId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid categoryId'
            });
        }
        const objectCategoryId = new mongoose.Types.ObjectId(categoryId);

        const products = await Product.aggregate([
            {
                $match: {
                    category: objectCategoryId
                }
            },
            // Lookup to get product variants
            {
                $lookup: {
                    from: 'productvariants',
                    localField: '_id',
                    foreignField: 'product_id',
                    as: 'variants'
                }
            },
            // Unwind variants to work with individual variants
            { $unwind: '$variants' },
            // Lookup to get import batches for each variant
            {
                $lookup: {
                    from: 'importbatches',
                    localField: 'variants._id',
                    foreignField: 'variantId',
                    as: 'importBatches'
                }
            },
            // Calculate total quantity for each variant
            {
                $addFields: {
                    'variants.totalQuantity': {
                        $sum: '$importBatches.quantity'
                    }
                }
            },
            // Group back by product
            {
                $group: {
                    _id: '$_id',
                    name: { $first: '$name' },
                    description: { $first: '$description' },
                    category: { $first: '$category' },
                    variants: { $push: '$variants' }
                }
            },
            // Match only products that have at least one variant with quantity > 0
            {
                $match: {
                    'variants.totalQuantity': { $gt: 0 }
                }
            },
            // Project final fields
            {
                $project: {
                    _id: 1,
                    name: 1,
                    description: 1,
                    category: 1,
                    minSellPrice: { $min: '$variants.sellPrice' },
                    images: {
                        $reduce: {
                            input: '$variants.images',
                            initialValue: [],
                            in: { $concatArrays: ['$$value', '$$this'] }
                        }
                    }
                }
            }
        ]);

        res.status(200).json({
            success: true,
            data: products
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error getting products by category',
            error: error.message
        });
    }
};

const getProductDetailsByCategory = async (req, res) => {
    try {
        const { categoryId } = req.params;

        if (!mongoose.isValidObjectId(categoryId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid categoryId'
            });
        }

        const objectCategoryId = new mongoose.Types.ObjectId(categoryId);

        const products = await Product.aggregate([
            { $match: { category: objectCategoryId } },
            {
                $lookup: {
                    from: 'productvariants',
                    localField: '_id',
                    foreignField: 'product_id',
                    as: 'variants'
                }
            },
            // Unwind variants để join tiếp importBatches
            { $unwind: { path: '$variants', preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: 'importbatches',
                    localField: 'variants._id',
                    foreignField: 'variantId',
                    as: 'variants.importBatches'
                }
            },
            {
                $addFields: {
                    'variants.totalQuantity': {
                        $sum: '$variants.importBatches.quantity'
                    }
                }
            },
            // Gom lại từng product (gộp variants thành mảng)
            {
                $group: {
                    _id: '$_id',
                    name: { $first: '$name' },
                    description: { $first: '$description' },
                    category: { $first: '$category' },
                    createAt: { $first: '$createAt' },
                    updateAt: { $first: '$updateAt' },
                    variants: { $push: '$variants' }
                }
            },
            {
                $project: {
                    _id: 1,
                    name: 1,
                    description: 1,
                    category: 1,
                    createAt: 1,
                    updateAt: 1,
                    variants: {
                        _id: 1,
                        images: 1,
                        sellPrice: 1,
                        attribute: 1,        // Lấy nguyên mảng attribute ObjectId từ variant
                        totalQuantity: 1
                    }
                }
            }
        ]);

        res.status(200).json({
            success: true,
            data: products
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error getting product details by category',
            error: error.message
        });
    }
};

const getProductById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid product ID'
            });
        }

        const product = await Product.aggregate([
            { $match: { _id: new mongoose.Types.ObjectId(id) } },
            {
                $lookup: {
                    from: 'productvariants',
                    localField: '_id',
                    foreignField: 'product_id',
                    as: 'variants'
                }
            },
            { $unwind: { path: '$variants', preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: 'importbatches',
                    localField: 'variants._id',
                    foreignField: 'variantId',
                    as: 'variants.importBatches'
                }
            },
            {
                $addFields: {
                    'variants.totalQuantity': {
                        $sum: '$variants.importBatches.quantity'
                    },
                    'variants.importBatches': {
                        $map: {
                            input: '$variants.importBatches',
                            as: 'batch',
                            in: {
                                _id: '$$batch._id',
                                importDate: '$$batch.importDate',
                                quantity: '$$batch.quantity',
                                costPrice: '$$batch.costPrice'
                            }
                        }
                    }
                }
            },
            {
                $group: {
                    _id: '$_id',
                    name: { $first: '$name' },
                    description: { $first: '$description' },
                    category: { $first: '$category' },
                    createAt: { $first: '$createAt' },
                    updateAt: { $first: '$updateAt' },
                    variants: { $push: '$variants' }
                }
            },
            {
                $lookup: {
                    from: 'categories',
                    localField: 'category',
                    foreignField: '_id',
                    as: 'categoryInfo'
                }
            },
            {
                $addFields: {
                    category: {
                        $map: {
                            input: '$categoryInfo',
                            as: 'cat',
                            in: {
                                id: '$$cat._id',
                                name: '$$cat.name'
                            }
                        }
                    }
                }
            },
            {
                $lookup: {
                    from: 'reviews',
                    localField: '_id',
                    foreignField: 'productId',
                    as: 'reviews'
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'reviews.userId',
                    foreignField: '_id',
                    as: 'reviewUsers'
                }
            },
            {
                $addFields: {
                    averageRating: {
                        $avg: '$reviews.rating'
                    },
                    totalReviews: {
                        $size: '$reviews'
                    },
                    reviews: {
                        $map: {
                            input: '$reviews',
                            as: 'review',
                            in: {
                                _id: '$$review._id',
                                rating: '$$review.rating',
                                comment: '$$review.comment',
                                images: '$$review.images',
                                createdAt: '$$review.createdAt',
                                user: {
                                    $let: {
                                        vars: {
                                            user: {
                                                $arrayElemAt: [
                                                    {
                                                        $filter: {
                                                            input: '$reviewUsers',
                                                            as: 'u',
                                                            cond: { $eq: ['$$u._id', '$$review.userId'] }
                                                        }
                                                    },
                                                    0
                                                ]
                                            }
                                        },
                                        in: {
                                            _id: '$$user._id',
                                            name: '$$user.name',
                                            avatar: '$$user.avatar'
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            // Unwind variants to process attributes
            { $unwind: '$variants' },
            // Lookup attributes for each variant
            {
                $lookup: {
                    from: 'attributes',
                    localField: 'variants.attribute',
                    foreignField: '_id',
                    as: 'variants.attributeDetails'
                }
            },
            // Group back by product
            {
                $group: {
                    _id: '$_id',
                    name: { $first: '$name' },
                    description: { $first: '$description' },
                    category: { $first: '$category' },
                    createAt: { $first: '$createAt' },
                    updateAt: { $first: '$updateAt' },
                    averageRating: { $first: '$averageRating' },
                    totalReviews: { $first: '$totalReviews' },
                    reviews: { $first: '$reviews' },
                    variants: {
                        $push: {
                            _id: '$variants._id',
                            images: '$variants.images',
                            sellPrice: '$variants.sellPrice',
                            totalQuantity: '$variants.totalQuantity',
                            importBatches: '$variants.importBatches',
                            attributes: '$variants.attributeDetails'
                        }
                    }
                }
            }
        ]);

        if (!product || product.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        res.status(200).json({
            success: true,
            data: product[0]
        });
    } catch (error) {
        console.error('Error in getProductById:', error);
        res.status(500).json({
            success: false,
            message: 'Error getting product details',
            error: error.message
        });
    }
};

module.exports = {
    getTopSellingProducts,
    getProductsByCategory,
    getProductDetailsByCategory,
    getProductById
};
