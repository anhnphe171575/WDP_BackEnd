const Product = require('../models/product');
const Order = require('../models/order');
const mongoose = require('mongoose');
const Attribute = require('../models/attribute'); // adjust path as needed
const Category = require('../models/category');
const ProductVariant = require('../models/productVariant');
const {cloudinary} = require('../config/cloudinary');
const OrderItem = require('../models/orderItem');

// Get top 5 best-selling products or 5 most recent products if no sales
const getTopSellingProducts = async (req, res) => {
    try {
        const topProducts = await Order.aggregate([
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
            {
                $group: {
                    _id: '$orderItemDetails.productId',
                    totalSold: { $sum: '$orderItemDetails.quantity' }
                }
            },
            { $sort: { totalSold: -1 } },
            { $limit: 5 },
            {
                $lookup: {
                    from: 'products',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'productDetails'
                }
            },
            { $unwind: '$productDetails' },
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
                    name: '$productDetails.name',
                    description: '$productDetails.description',
                    brand: '$productDetails.brand',
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

        console.log('Top products:', topProducts);

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
                        brand: 1,
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

const getProductsBySearch = async (req, res) => {
    try {
        const { search } = req.params;
        if (!search || search.trim() === "") {
            return res.status(400).json({
                success: false,
                message: "Search term is required"
            });
        }
        // Tìm kiếm không phân biệt hoa thường, lấy cả variant và attribute
        const products = await Product.find({
            name: { $regex: search, $options: "i" }
        })
        .populate('category', 'name description parentCategory')
        .lean();

        // Lấy variants và attribute cho từng sản phẩm
        const productIds = products.map(p => p._id);
        const variants = await ProductVariant.find({ product_id: { $in: productIds } }).lean();
        const variantIds = variants.map(v => v._id);

        // Tính tổng nhập kho cho từng variant
        const ImportBatch = require('../models/import_batches');
        const importAgg = await ImportBatch.aggregate([
            { $match: { variantId: { $in: variantIds } } },
            { $group: { _id: '$variantId', importedQuantity: { $sum: '$quantity' } } }
        ]);
        const importMap = importAgg.reduce((map, item) => {
            map[item._id.toString()] = item.importedQuantity;
            return map;
        }, {});

        // Tính tổng đã bán cho từng variant (chỉ đơn completed/shipping/processing)
        const Order = require('../models/order');
        const soldAgg = await Order.aggregate([
            { $match: { status: { $in: ['completed', 'shipping', 'processing'] } } },
            { $unwind: '$OrderItems' },
            {
                $lookup: {
                    from: 'orderitems',
                    localField: 'OrderItems',
                    foreignField: '_id',
                    as: 'orderItemDetail'
                }
            },
            { $unwind: '$orderItemDetail' },
            { $match: { 'orderItemDetail.productVariant': { $in: variantIds } } },
            {
                $group: {
                    _id: '$orderItemDetail.productVariant',
                    orderedQuantity: { $sum: '$orderItemDetail.quantity' }
                }
            }
        ]);
        const soldMap = soldAgg.reduce((map, item) => {
            map[item._id.toString()] = item.orderedQuantity;
            return map;
        }, {});

        // Gắn availableQuantity vào từng variant
        const variantsWithStock = variants.map(variant => {
            const imported = importMap[variant._id.toString()] || 0;
            const ordered = soldMap[variant._id.toString()] || 0;
            const available = imported - ordered;
            return {
                ...variant,
                importedQuantity: imported,
                orderedQuantity: ordered,
                availableQuantity: available
            };
        });

        // Lấy reviews cho tất cả sản phẩm
        const Review = require('../models/reviewModel');
        const reviews = await Review.find({ productId: { $in: productIds } })
            .populate('userId', 'name avatar')
            .lean();

        // Gắn variants và reviews vào từng product
        const productMap = {};
        products.forEach(p => { productMap[p._id.toString()] = { ...p, variants: [], reviews: [] }; });
        variantsWithStock.forEach(variant => {
            const pid = variant.product_id.toString();
            if (productMap[pid]) {
                productMap[pid].variants.push(variant);
            }
        });
        reviews.forEach(review => {
            const pid = review.productId.toString();
            if (productMap[pid]) {
                productMap[pid].reviews.push(review);
            }
        });

        const result = Object.values(productMap);

        res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error searching products',
            error: error.message
        });
    }
}

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

        // Step 1: Get all products in the category with their variants
        const products = await Product.aggregate([
            {
                $match: {
                    category: objectCategoryId
                }
            },
            {
                $lookup: {
                    from: 'productvariants',
                    localField: '_id',
                    foreignField: 'product_id',
                    as: 'variants'
                }
            },
            { $unwind: '$variants' },
            // Lookup import batches for each variant
            {
                $lookup: {
                    from: 'importbatches',
                    localField: 'variants._id',
                    foreignField: 'variantId',
                    as: 'importBatches'
                }
            },
            // Lookup ordered quantity for each variant (from completed orders)
            {
                $lookup: {
                    from: 'orderitems',
                    let: { variantId: '$variants._id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: ['$productVariant', '$$variantId'] }
                            }
                        },
                        // Join to orders to filter only completed
                        {
                            $lookup: {
                                from: 'orders',
                                localField: 'orderId',
                                foreignField: '_id',
                                as: 'order'
                            }
                        },
                        { $unwind: '$order' },
                        { $match: { 'order.status': 'completed' } },
                        {
                            $group: {
                                _id: null,
                                totalOrdered: { $sum: '$quantity' }
                            }
                        }
                    ],
                    as: 'orderedInfo'
                }
            },
            // Calculate available quantity
            {
                $addFields: {
                    'variants.importedQuantity': { $sum: '$importBatches.quantity' },
                    'variants.orderedQuantity': {
                        $ifNull: [ { $arrayElemAt: ['$orderedInfo.totalOrdered', 0] }, 0 ]
                    },
                    'variants.availableQuantity': {
                        $subtract: [
                            { $sum: '$importBatches.quantity' },
                            { $ifNull: [ { $arrayElemAt: ['$orderedInfo.totalOrdered', 0] }, 0 ] }
                        ]
                    }
                }
            },
            // Group back by product
            {
                $group: {
                    _id: '$_id',
                    name: { $first: '$name' },
                    description: { $first: '$description' },
                    brand: { $first: '$brand' },
                    category: { $first: '$category' },
                    variants: { $push: '$variants' }
                }
            },
            // Only include products with at least one variant with availableQuantity > 0
            {
                $addFields: {
                    variants: {
                        $filter: {
                            input: '$variants',
                            as: 'variant',
                            cond: { $gt: ['$$variant.availableQuantity', 0] }
                        }
                    }
                }
            },
            { $match: { 'variants.0': { $exists: true } } },
            // Project final fields
            {
                $project: {
                    _id: 1,
                    name: 1,
                    description: 1,
                    brand: 1,
                    category: 1,
                    minSellPrice: { $min: '$variants.sellPrice' },
                    images: {
                        $reduce: {
                            input: '$variants.images',
                            initialValue: [],
                            in: { $concatArrays: ['$$value', '$$this'] }
                        }
                    },
                    variants: {
                        _id: 1,
                        sellPrice: 1,
                        images: 1,
                        importedQuantity: 1,
                        orderedQuantity: 1,
                        availableQuantity: 1
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

const getAllBestSellingProducts = async (req, res) => {
    try {
        // Lấy tất cả sản phẩm bán chạy nhất, không lọc theo category
        // 1. Lấy top 5 sản phẩm bán chạy nhất (theo tổng số lượng bán ra)
        const Order = require('../models/order');
        const Product = require('../models/product');
        const ProductVariant = require('../models/productVariant');
        const ImportBatch = require('../models/import_batches');
        const Category = require('../models/category');

        // Lấy tổng số lượng bán cho từng sản phẩm
        const sales = await Order.aggregate([
            { $match: { status: { $in: ['completed', 'shipping', 'processing'] } } },
            { $unwind: '$OrderItems' },
            {
                $lookup: {
                    from: 'orderitems',
                    localField: 'OrderItems',
                    foreignField: '_id',
                    as: 'orderItemDetail'
                }
            },
            { $unwind: '$orderItemDetail' },
            {
                $group: {
                    _id: '$orderItemDetail.productId',
                    totalSold: { $sum: '$orderItemDetail.quantity' }
                }
            },
            { $sort: { totalSold: -1 } },
            { $limit: 5 }
        ]);
        const topProductIds = sales.map(s => s._id);
        // Lấy thông tin sản phẩm
        const products = await Product.find({ _id: { $in: topProductIds } }).lean();
        // Lấy tất cả variants của các sản phẩm này
        const variants = await ProductVariant.find({ product_id: { $in: topProductIds } }).lean();
        const variantIds = variants.map(v => v._id);
        // Tính tổng nhập kho cho từng variant
        const importAgg = await ImportBatch.aggregate([
            { $match: { variantId: { $in: variantIds } } },
            { $group: { _id: '$variantId', importedQuantity: { $sum: '$quantity' } } }
        ]);
        const importMap = importAgg.reduce((map, item) => {
            map[item._id.toString()] = item.importedQuantity;
            return map;
        }, {});
        // Tính tổng đã bán cho từng variant
        const soldAgg = await Order.aggregate([
            { $match: { status: { $in: ['completed', 'shipping', 'processing'] } } },
            { $unwind: '$OrderItems' },
            {
                $lookup: {
                    from: 'orderitems',
                    localField: 'OrderItems',
                    foreignField: '_id',
                    as: 'orderItemDetail'
                }
            },
            { $unwind: '$orderItemDetail' },
            { $match: { 'orderItemDetail.productVariant': { $in: variantIds } } },
            {
                $group: {
                    _id: '$orderItemDetail.productVariant',
                    orderedQuantity: { $sum: '$orderItemDetail.quantity' }
                }
            }
        ]);
        const soldMap = soldAgg.reduce((map, item) => {
            map[item._id.toString()] = item.orderedQuantity;
            return map;
        }, {});
        // Gắn availableQuantity vào từng variant
        const variantsWithStock = variants.map(variant => {
            const imported = importMap[variant._id.toString()] || 0;
            const ordered = soldMap[variant._id.toString()] || 0;
            const available = imported - ordered;
            return {
                ...variant,
                importedQuantity: imported,
                orderedQuantity: ordered,
                availableQuantity: available
            };
        });
        // Gắn variants vào từng product
        const productsWithVariants = products.map(product => {
            const productVariants = variantsWithStock.filter(v => v.product_id.toString() === product._id.toString());
            return {
                ...product,
                variants: productVariants
            };
        });
        // Gắn lại số lượng bán vào từng product
        const result = productsWithVariants.map(product => {
            const sale = sales.find(s => s._id.toString() === product._id.toString());
            return {
                ...product,
                totalSold: sale ? sale.totalSold : 0,
                variants: product.variants
            };
        });
        res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error getting best selling products',
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

        // 1. Lấy tất cả sản phẩm và variants trong category
        const products = await Product.find({ category: objectCategoryId })
            .lean();
        const productIds = products.map(p => p._id);
        const variants = await ProductVariant.find({ product_id: { $in: productIds } }).lean();
        const variantIds = variants.map(v => v._id);

        // 2. Tính tổng nhập kho cho từng variant
        const ImportBatch = require('../models/import_batches');
        const importAgg = await ImportBatch.aggregate([
            { $match: { variantId: { $in: variantIds } } },
            { $group: { _id: '$variantId', importedQuantity: { $sum: '$quantity' } } }
        ]);
        const importMap = importAgg.reduce((map, item) => {
            map[item._id.toString()] = item.importedQuantity;
            return map;
        }, {});

        // 3. Tính tổng đã bán cho từng variant (chỉ đơn completed)
        const Order = require('../models/order');
        const OrderItem = require('../models/orderItem');
        const soldAgg = await Order.aggregate([
            { $match: { status: { $in: ['processing', 'completed', 'shipping'] } } },
            { $unwind: '$OrderItems' },
            {
                $lookup: {
                    from: 'orderitems',
                    localField: 'OrderItems',
                    foreignField: '_id',
                    as: 'orderItemDetail'
                }
            },
            { $unwind: '$orderItemDetail' },
            { $match: { 'orderItemDetail.productVariant': { $in: variantIds } } },
            {
                $group: {
                    _id: '$orderItemDetail.productVariant',
                    orderedQuantity: { $sum: '$orderItemDetail.quantity' }
                }
            }
        ]);
        const soldMap = soldAgg.reduce((map, item) => {
            map[item._id.toString()] = item.orderedQuantity;
            return map;
        }, {});

        // 4. Gắn availableQuantity vào từng variant
        variants.forEach(variant => {
            const imported = importMap[variant._id.toString()] || 0;
            const ordered = soldMap[variant._id.toString()] || 0;
            const available = imported - ordered;
            variant.importedQuantity = imported;
            variant.orderedQuantity = ordered;
            variant.availableQuantity = available;
        });

        // 5. Gắn tất cả variants vào từng product (không filter theo availableQuantity)
        const productsWithVariants = products.map(product => {
            const productVariants = variants.filter(v => v.product_id.toString() === product._id.toString());
            return {
                ...product,
                variants: productVariants.map(v => ({
                    _id: v._id,
                    images: v.images,
                    sellPrice: v.sellPrice,
                    importedQuantity: v.importedQuantity,
                    orderedQuantity: v.orderedQuantity,
                    availableQuantity: v.availableQuantity,
                    attribute: v.attribute
                }))
            };
        });

        // 6. Lấy reviews và user cho từng product (giữ nguyên logic cũ)
        const productIdsWithVariants = productsWithVariants.map(p => p._id);
        const Review = require('../models/reviewModel');
        const reviews = await Review.find({ productId: { $in: productIdsWithVariants } })
            .populate('userId', 'name avatar')
            .lean();
        const User = require('../models/userModel');
        const users = await User.find().lean();
        // Gắn reviews vào từng product
        const reviewMap = {};
        reviews.forEach(r => {
            if (!reviewMap[r.productId]) reviewMap[r.productId] = [];
            reviewMap[r.productId].push({
                _id: r._id,
                rating: r.rating,
                comment: r.comment,
                images: r.images,
                createdAt: r.createdAt,
                user: users.find(u => u._id.toString() === r.userId?._id?.toString())
                    ? {
                        _id: r.userId._id,
                        name: r.userId.name,
                        avatar: r.userId.avatar
                    } : null
            });
        });

        // 7. Format kết quả trả về
        const result = productsWithVariants.map(product => {
            const productReviews = reviewMap[product._id.toString()] || [];
            const averageRating = productReviews.length > 0 ? (productReviews.reduce((sum, r) => sum + (r.rating || 0), 0) / productReviews.length) : 0;
            return {
                _id: product._id,
                name: product.name,
                description: product.description,
                brand: product.brand,
                category: product.category,
                createAt: product.createAt,
                updateAt: product.updateAt,
                variants: product.variants,
                averageRating,
                totalReviews: productReviews.length,
                reviews: productReviews
            };
        });

        res.status(200).json({
            success: true,
            data: result
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

        // 1. Lấy product và tất cả variants
        const product = await Product.findById(id).lean();
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }
        const variants = await ProductVariant.find({ product_id: product._id }).lean();
        const variantIds = variants.map(v => v._id);

        // 2. Lấy thông tin category (nhiều category)
        const Category = require('../models/category');
        let categoryInfo = [];
        if (Array.isArray(product.category)) {
            categoryInfo = await Category.find({ _id: { $in: product.category } }).lean();
        } else if (product.category) {
            const cat = await Category.findById(product.category).lean();
            if (cat) categoryInfo = [cat];
        }
        // Chỉ lấy _id, name, description
        categoryInfo = categoryInfo.map(cat => ({
            _id: cat._id,
            name: cat.name,
            description: cat.description
        }));

        // 3. Tính tổng nhập kho cho từng variant
        const ImportBatch = require('../models/import_batches');
        const importAgg = await ImportBatch.aggregate([
            { $match: { variantId: { $in: variantIds } } },
            { $group: { _id: '$variantId', importedQuantity: { $sum: '$quantity' } } }
        ]);
        const importMap = importAgg.reduce((map, item) => {
            map[item._id.toString()] = item.importedQuantity;
            return map;
        }, {});

        // 4. Tính tổng đã bán cho từng variant (chỉ đơn completed)
        const Order = require('../models/order');
        const soldAgg = await Order.aggregate([
            { $match: { status: { $in: ['processing', 'completed', 'shipping'] } } },
            { $unwind: '$OrderItems' },
            {
                $lookup: {
                    from: 'orderitems',
                    localField: 'OrderItems',
                    foreignField: '_id',
                    as: 'orderItemDetail'
                }
            },
            { $unwind: '$orderItemDetail' },
            { $match: { 'orderItemDetail.productVariant': { $in: variantIds } } },
            {
                $group: {
                    _id: '$orderItemDetail.productVariant',
                    orderedQuantity: { $sum: '$orderItemDetail.quantity' }
                }
            }
        ]);
        const soldMap = soldAgg.reduce((map, item) => {
            map[item._id.toString()] = item.orderedQuantity;
            return map;
        }, {});

        // 5. Gắn availableQuantity vào từng variant (không filter theo availableQuantity)
        const variantsWithStock = variants.map(variant => {
            const imported = importMap[variant._id.toString()] || 0;
            const ordered = soldMap[variant._id.toString()] || 0;
            const available = imported - ordered;
            return {
                ...variant,
                importedQuantity: imported,
                orderedQuantity: ordered,
                availableQuantity: available
            };
        });

        // 6. Lấy reviews và user cho product (giữ nguyên logic cũ)
        const Review = require('../models/reviewModel');
        const reviews = await Review.find({ productId: product._id })
            .populate('userId', 'name avatar')
            .lean();
        const User = require('../models/userModel');
        const users = await User.find().lean();
        // Gắn reviews vào product
        const productReviews = reviews.map(r => ({
            _id: r._id,
            rating: r.rating,
            comment: r.comment,
            images: r.images,
            createdAt: r.createdAt,
            user: users.find(u => u._id.toString() === r.userId?._id?.toString())
                ? {
                    _id: r.userId._id,
                    name: r.userId.name,
                    avatar: r.userId.avatar
                } : null
        }));
        const averageRating = productReviews.length > 0 ? (productReviews.reduce((sum, r) => sum + (r.rating || 0), 0) / productReviews.length) : 0;

        // 7. Format kết quả trả về
        const result = {
            _id: product._id,
            name: product.name,
            description: product.description,
            brand: product.brand,
            category: categoryInfo,
            createAt: product.createAt,
            updateAt: product.updateAt,
            variants: variantsWithStock,
            averageRating,
            totalReviews: productReviews.length,
            reviews: productReviews
        };

        res.status(200).json({
            success: true,
            data: result
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

// Create new product
const createProduct = async (req, res) => {
    try {
        const { name, description, brand, categories } = req.body;
        
        console.log('Received data for product creation:', { name, description, brand, categories });

        // Validate required fields
        if (!name || !description || !categories || categories.length === 0) {
            console.log('Validation failed:', { name, description, brand, categories });
            return res.status(400).json({
                success: false,
                message: 'Name, description and at least one category are required'
            });
        }

        // Validate categories and prepare category array
        const categoryArray = [];
        for (const category of categories) {
            if (!category.categoryId) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid category data: categoryId is required'
                });
            }

            console.log('Validating category:', category);
            const categoryDoc = await Category.findById(category.categoryId);
            if (!categoryDoc) {
                console.log('Category not found:', category.categoryId);
                return res.status(400).json({
                    success: false,
                    message: `Category with ID ${category.categoryId} not found`
                });
            }

            // Add category to array if it's not already included
            if (!categoryArray.includes(categoryDoc._id)) {
                categoryArray.push(categoryDoc._id);
            }
        }

        // Create product with all categories and brand
        const product = new Product({
            name,
            description,
            brand: brand || '',
            category: categoryArray
        });

        console.log('Creating product with data:', product);

        await product.save();

        // Populate category information for response
        const populatedProduct = await Product.findById(product._id)
            .populate({
                path: 'category',
                select: 'name description',
                populate: {
                    path: 'parentCategory',
                    select: 'name'
                }
            });

        console.log('Created product:', populatedProduct);

        res.status(201).json({
            success: true,
            message: 'Product created successfully',
            data: populatedProduct
        });
    } catch (error) {
        console.error('Error in createProduct:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating product',
            error: error.message
        });
    }
};

// Get all products with categories, variants and prices
const getAllProducts = async (req, res) => {
    try {
      const products = await Product.find()
        .populate('category', 'name description')  // populate categoryId lấy name + description
        .exec();
  
      res.status(200).json({
        success: true,
        message: 'Lấy danh sách sản phẩm thành công',
        data: products
      });
    } catch (error) {
      console.error("Lỗi khi lấy danh sách sản phẩm:", error);
      res.status(500).json({
        success: false,
        message: 'Lỗi server',
        error: error.message
      });
    }
  };


// Update product
const updateProduct = async (req, res) => {
    try {
        const { productId } = req.params;
        const { name, description, brand, categories } = req.body;

        // Validate productId
        if (!mongoose.Types.ObjectId.isValid(productId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid product ID'
            });
        }

        // Validate required fields
        if (!name || !description) {
            
            return res.status(400).json({
                success: false,
                message: 'Name and description are required'
            });
        }

        // Find existing product
        const existingProduct = await Product.findById(productId);
        if (!existingProduct) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        // Prepare update data
        const updateData = {
            name,
            description,
            brand: brand || ''
        };

        // Only update categories if provided
        if (categories && Array.isArray(categories)) {
            // Validate each category has categoryId
            for (const category of categories) {
                if (!category.categoryId) {
                    return res.status(400).json({
                        success: false,
                        message: 'Each category must have a categoryId'
                    });
                }
            }

            // Validate all categories exist
             const categoryIds = [...new Set(categories.map(cat => cat.categoryId))];
        console.log('Validated category IDs:', categoryIds);
            // const categoryIds = categories.map(cat => cat.categoryId);
            // console.log('Validated category IDs:', categoryIds);

            const existingCategories = await Category.find({ _id: { $in: categoryIds } });
            console.log(existingCategories);
            console.log(existingCategories.length );
            console.log(categoryIds.length)
            if (existingCategories.length !== categoryIds.length) {
                return res.status(400).json({
                    success: false,
                    message: 'One or more categories do not exist'
                });
            }

            // Add categories to update data
            updateData.category = categoryIds;
        }

        // Update product
        const updatedProduct = await Product.findByIdAndUpdate(
            productId,
            { $set: updateData },
            { new: true }
        ).populate('category');

        // Format response
        const response = {
            _id: updatedProduct._id,
            name: updatedProduct.name,
            description: updatedProduct.description,
            brand: updatedProduct.brand,
            category: updatedProduct.category.map(cat => ({
                _id: cat._id,
                name: cat.name,
                description: cat.description
            }))
        };

        res.json({
            success: true,
            message: 'Product updated successfully',
            data: response
        });
    } catch (error) {
        console.error('Error updating product:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

// Delete product
const deleteProduct = async (req, res) => {
    try {
        const productId = req.params.productId;
        
        console.log('Attempting to delete product with ID:', productId);

        // Validate product ID
        if (!productId) {
            console.log('No product ID provided');
            return res.status(400).json({
                success: false,
                message: 'Product ID is required'
            });
        }

        if (!mongoose.Types.ObjectId.isValid(productId)) {
            console.log('Invalid product ID format:', productId);
            return res.status(400).json({
                success: false,
                message: 'Invalid product ID format'
            });
        }

        // Check if product exists
        const product = await Product.findById(productId);
        if (!product) {
            console.log('Product not found:', productId);
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        console.log('Found product to delete:', product);

        // Delete all variants associated with the product
        const deletedVariants = await ProductVariant.deleteMany({ product_id: productId });
        console.log('Deleted variants:', deletedVariants);

        // Delete the product
        const deletedProduct = await Product.findByIdAndDelete(productId);
        console.log('Deleted product:', deletedProduct);

        if (!deletedProduct) {
            console.log('Failed to delete product:', productId);
            return res.status(404).json({
                success: false,
                message: 'Failed to delete product'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Product and its variants deleted successfully',
            data: {
                product: deletedProduct,
                variantsDeleted: deletedVariants.deletedCount
            }
        });
    } catch (error) {
        console.error('Error in deleteProduct:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting product',
            error: error.message
        });
    }
};

// Get product variants by productId
const getProductVariantsByProductId = async (req, res) => {
    try {
        const productId = req.params.productId;

        // Check if product exists first
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        const variants = await ProductVariant.find({ product_id: productId })
            .populate({
                path: 'attribute',
                select: 'value description',
                populate: {
                    path: 'parentId',
                    select: 'value'
                }
            });

        // Return empty array instead of 404 when no variants found
        res.status(200).json({
            success: true,
            data: variants || []
        });
    } catch (error) {
        console.error('Error getting product variants:', error);
        res.status(500).json({
            success: false,
            message: 'Error getting product variants',
            error: error.message
        });
    }
};

const getChildAttributesByProductId = async (req, res) => {
    try {
        const productId = req.params.productId;

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        const categoryIds = product.category;

        const attributes = await Attribute.aggregate([
            {
                $match: {
                    categories: { $in: categoryIds }
                }
            },
            {
                $lookup: {
                    from: 'attributes',
                    localField: '_id',
                    foreignField: 'parentId',
                    as: 'children'
                }
            },
            {
                $project: {
                    _id: 1,
                    value: 1,
                    description: 1,
                    categories: 1,
                    parentId: 1,
                    children: {
                        $map: {
                            input: '$children',
                            as: 'child',
                            in: {
                                _id: '$$child._id',
                                value: '$$child.value',
                                description: '$$child.description',
                                parentId: '$$child.parentId'
                            }
                        }
                    }
                }
            }
        ]);


        const parentAttributes = attributes.filter(attr => !attr.parentId);
        const childAttributes = attributes.filter(attr => attr.parentId);

        res.status(200).json({
            success: true,
            data: {
                categoryIds,
                parentAttributes,
                childAttributes
            }
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({
            success: false,
            message: 'Error getting child attributes',
            error: error.message
        });
    }
};


const getChildAttributesByParentId = async (req, res) => {
    try {
        const parentId = req.params.parentId;

        const childAttributes = await Attribute.find({ parentId })
            .select('_id value description')
            .populate({
                path: 'parentId',
                select: 'value'
            });

        if (!childAttributes.length) {
            return res.status(404).json({
                success: false,
                message: 'No child attributes found for this parent'
            });
        }

        res.status(200).json({
            success: true,
            data: childAttributes
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error getting child attributes',
            error: error.message
        });
    }
};

const createProductVariant = async (req, res) => {
    try {
        const productId = req.params.productId;
        let { attributes } = req.body;

        // Xử lý file ảnh
        let images = [];
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                const result = await cloudinary.uploader.upload(file.path, { folder: 'product-variants' });
                images.push({ url: result.secure_url });
            }
        }

        // Validate product exists
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        // Validate attributes
        const attributeIds = [];
        if (Array.isArray(attributes)) {
            for (const attrId of attributes) {
                const attr = await Attribute.findById(attrId);
                if (!attr) {
                    return res.status(400).json({
                        success: false,
                        message: `Attribute with ID ${attrId} not found`
                    });
                }
                attributeIds.push(attrId);
            }
        } else if (attributes) {
            // Trường hợp chỉ có 1 attribute (không phải mảng)
            const attr = await Attribute.findById(attributes);
            if (!attr) {
                return res.status(400).json({
                    success: false,
                    message: `Attribute with ID ${attributes} not found`
                });
            }
            attributeIds.push(attributes);
        }

        // Create new variant
        const productVariant = new ProductVariant({
            product_id: productId,
            images,
            attribute: attributeIds
        });

        await productVariant.save();

        // Populate attributes for response
        const populatedVariant = await ProductVariant.findById(productVariant._id)
            .populate({
                path: 'attribute',
                select: 'value description',
                populate: {
                    path: 'parentId',
                    select: 'value'
                }
            });

        res.status(201).json({
            success: true,
            message: 'Product variant created successfully',
            data: populatedVariant
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error creating product variant',
            error: error.message
        });
    }
};

const deleteProductVariant = async (req, res) => {
    try {
        const variantId = req.params.variantId;

        // Find and delete the variant
        const deletedVariant = await ProductVariant.findByIdAndDelete(variantId);

        if (!deletedVariant) {
            return res.status(404).json({
                success: false,
                message: 'Product variant not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Product variant deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error deleting product variant',
            error: error.message
        });
    }
};

const updateProductVariant = async (req, res) => {
    try {
        const variantId = req.params.variantId;
        let { attributes, sellPrice } = req.body;

        // Validate variant exists
        const existingVariant = await ProductVariant.findById(variantId);
        if (!existingVariant) {
            return res.status(404).json({
                success: false,
                message: 'Product variant not found'
            });
        }

        // Validate attributes if provided
        if (attributes) {
            const attributeIds = [];
            for (const attrId of attributes) {
                const attr = await Attribute.findById(attrId);
                if (!attr) {
                    return res.status(400).json({
                        success: false,
                        message: `Attribute with ID ${attrId} not found`
                    });
                }
                attributeIds.push(attrId);
            }
            existingVariant.attribute = attributeIds;
        }

        // --- XỬ LÝ ẢNH CŨ VÀ ẢNH MỚI ---
        let images = [];
        // 1. Ảnh cũ (url) gửi qua existingImages (có thể là string hoặc mảng)
        if (req.body.existingImages) {
            if (Array.isArray(req.body.existingImages)) {
                images = req.body.existingImages.map(url => ({ url }));
            } else if (typeof req.body.existingImages === 'string') {
                images = [{ url: req.body.existingImages }];
            }
        }
        // 2. Ảnh mới (file upload)
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                const result = await cloudinary.uploader.upload(file.path, { folder: 'product-variants' });
                images.push({ url: result.secure_url });
            }
        }
        if (images.length > 0) {
            existingVariant.images = images;
        }

        // Update sellPrice nếu có
        if (sellPrice !== undefined) {
            if (sellPrice < 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Price cannot be negative'
                });
            }
            existingVariant.sellPrice = sellPrice;
        }

        // Save the updated variant
        await existingVariant.save();

        // Populate attributes for response
        const updatedVariant = await ProductVariant.findById(variantId)
            .populate({
                path: 'attribute',
                select: 'value description',
                populate: {
                    path: 'parentId',
                    select: 'value'
                }
            });

        res.status(200).json({
            success: true,
            message: 'Product variant updated successfully',
            data: updatedVariant
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error updating product variant',
            error: error.message
        });
    }
};

// Import Batch Management Functions
const getImportBatchesByVariantId = async (req, res) => {
    try {
        const variantId = req.params.variantId;

        // Check if variant exists first
        const variant = await ProductVariant.findById(variantId);
        if (!variant) {
            return res.status(404).json({
                success: false,
                message: 'Product variant not found'
            });
        }

        const ImportBatch = require('../models/import_batches');
        const importBatches = await ImportBatch.find({ variantId })
            .sort({ importDate: -1 });

        res.status(200).json({
            success: true,
            data: importBatches || []
        });
    } catch (error) {
        console.error('Error getting import batches:', error);
        res.status(500).json({
            success: false,
            message: 'Error getting import batches',
            error: error.message
        });
    }
};

const createImportBatch = async (req, res) => {
    try {
        const variantId = req.params.variantId;
        const { importDate, quantity, costPrice } = req.body;

        // Validate variant exists
        const variant = await ProductVariant.findById(variantId);
        if (!variant) {
            return res.status(404).json({
                success: false,
                message: 'Product variant not found'
            });
        }

        // Validate required fields
        if (!importDate || !quantity || costPrice === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Import date, quantity and cost price are required'
            });
        }

        if (quantity <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Quantity must be greater than 0'
            });
        }

        if (costPrice <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Cost price must be greater than 0'
            });
        }

        const ImportBatch = require('../models/import_batches');
        const importBatch = new ImportBatch({
            variantId,
            importDate: new Date(importDate),
            quantity,
            costPrice
        });

        await importBatch.save();

        res.status(201).json({
            success: true,
            message: 'Import batch created successfully',
            data: importBatch
        });
    } catch (error) {
        console.error('Error creating import batch:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating import batch',
            error: error.message
        });
    }
};

const updateImportBatch = async (req, res) => {
    try {
        const batchId = req.params.batchId;
        const { importDate, quantity, costPrice } = req.body;

        const ImportBatch = require('../models/import_batches');
        const existingBatch = await ImportBatch.findById(batchId);
        if (!existingBatch) {
            return res.status(404).json({
                success: false,
                message: 'Import batch not found'
            });
        }

        // Validate required fields
        if (!importDate || !quantity || costPrice === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Import date, quantity and cost price are required'
            });
        }

        if (quantity <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Quantity must be greater than 0'
            });
        }

        if (costPrice <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Cost price must be greater than 0'
            });
        }

        // Update batch
        existingBatch.importDate = new Date(importDate);
        existingBatch.quantity = quantity;
        existingBatch.costPrice = costPrice;

        await existingBatch.save();

        res.status(200).json({
            success: true,
            message: 'Import batch updated successfully',
            data: existingBatch
        });
    } catch (error) {
        console.error('Error updating import batch:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating import batch',
            error: error.message
        });
    }
};

const deleteImportBatch = async (req, res) => {
    try {
        const batchId = req.params.batchId;

        const ImportBatch = require('../models/import_batches');
        const deletedBatch = await ImportBatch.findByIdAndDelete(batchId);

        if (!deletedBatch) {
            return res.status(404).json({
                success: false,
                message: 'Import batch not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Import batch deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting import batch:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting import batch',
            error: error.message
        });
    }
};

// Get top 5 worst-selling products (including those with zero sales)
const getAllWorstSellingProducts = async (req, res) => {
    try {
        // 1. Get all products and their total sold (including zero sales)
        // First, aggregate sales per product
        const sales = await Order.aggregate([
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
            {
                $group: {
                    _id: '$orderItemDetails.productId',
                    totalSold: { $sum: '$orderItemDetails.quantity' }
                }
            }
        ]);
        // Map productId to totalSold
        const salesMap = {};
        sales.forEach(s => {
            if (s._id) salesMap[s._id.toString()] = s.totalSold;
        });
        // 2. Get all products
        const allProducts = await Product.find();
        // 3. Attach totalSold to each product (default 0 if not sold)
        const productsWithSales = allProducts.map(p => ({
            _id: p._id,
            name: p.name,
            description: p.description,
            brand: p.brand,
            category: p.category,
            totalSold: salesMap[p._id.toString()] || 0
        }));
        // 4. Sort ascending and take 5
        const worstProducts = productsWithSales.sort((a, b) => a.totalSold - b.totalSold).slice(0, 5);
        // 5. Populate variants and attributes for each product
        const populated = await Promise.all(worstProducts.map(async (prod) => {
            const variants = await ProductVariant.find({ product_id: prod._id })
                .populate({
                    path: 'attribute',
                    select: 'value description',
                    populate: { path: 'parentId', select: 'value' }
                });
            return { ...prod, variants };
        }));
        res.status(200).json({
            success: true,
            data: populated
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error getting worst selling products',
            error: error.message
        });
    }
};

// Cập nhật costPrice cho product variant
const updateProductVariantCostPrice = async (req, res) => {
  try {
    const { variantId } = req.params;
    const { costPrice } = req.body;

    if (!costPrice || costPrice < 0) {
      return res.status(400).json({
        success: false,
        message: 'Cost price phải là số dương'
      });
    }

    const variant = await ProductVariant.findById(variantId);
    if (!variant) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy product variant'
      });
    }

    variant.costPrice = costPrice;
    await variant.save();

    res.json({
      success: true,
      message: 'Cập nhật cost price thành công',
      data: variant
    });

  } catch (error) {
    console.error('Error updating cost price:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

const getProductDashboardData = async (req, res) => {
    try {
        const [totalProducts, allCategories, allProducts] = await Promise.all([
            Product.countDocuments(),
            Category.find().lean(),
            Product.find().select('_id category').lean()
        ]);

        const categoryMap = new Map();
        allCategories.forEach(cat => {
            cat._id = cat._id.toString();
            if (cat.parentCategory) cat.parentCategory = cat.parentCategory.toString();
            categoryMap.set(cat._id, cat);
        });

        const categoryProductSets = new Map();
        allCategories.forEach(cat => {
            categoryProductSets.set(cat._id, new Set());
        });

        allProducts.forEach(product => {
            const productId = product._id.toString();
            const uniqueCatIds = [...new Set(product.category.map(c => c.toString()))];
            
            uniqueCatIds.forEach(catId => {
                let currentCatId = catId;
                while (currentCatId) {
                    if (categoryProductSets.has(currentCatId)) {
                        categoryProductSets.get(currentCatId).add(productId);
                    }
                    const category = categoryMap.get(currentCatId);
                    currentCatId = category ? category.parentCategory : null;
                }
            });
        });

        const nodes = {};
        allCategories.forEach(cat => {
            nodes[cat._id] = { ...cat, children: [] };
        });

        Object.values(nodes).forEach(node => {
            if (node.parentCategory && nodes[node.parentCategory]) {
                nodes[node.parentCategory].children.push(node);
            }
        });

        const rootNodes = Object.values(nodes).filter(node => !node.parentCategory);

        const buildResponseTree = (node) => {
            const productCount = categoryProductSets.get(node._id).size;
            const subCategories = node.children
                .map(buildResponseTree)
                .filter(child => child.productCount > 0)
                .sort((a, b) => b.productCount - a.productCount);

            const result = {
                categoryName: node.name,
                productCount,
            };

            if (subCategories.length > 0) {
                result.subCategories = subCategories;
            }

            return result;
        };

        const productsByCategory = rootNodes
            .map(buildResponseTree)
            .filter(root => root.productCount > 0)
            .sort((a, b) => b.productCount - a.productCount);

        const productsByBrand = await Product.aggregate([
            {
                $group: {
                    _id: '$brand',
                    count: { $sum: 1 }
                }
            },
            {
                $project: {
                    brandName: '$_id',
                    count: 1,
                    _id: 0
                }
            },
            { $sort: { count: -1 } }
        ]);
        
        const lowStockVariants = await ProductVariant.aggregate([
            {
                $lookup: {
                    from: 'importbatches',
                    localField: '_id',
                    foreignField: 'variantId',
                    as: 'importBatches'
                }
            },
            {
                $addFields: {
                    totalQuantity: { $sum: '$importBatches.quantity' }
                }
            },
            {
                $match: {
                    totalQuantity: { $lte: 10 }
                }
            },
            {
                $lookup: {
                    from: 'products',
                    localField: 'product_id',
                    foreignField: '_id',
                    as: 'productDetails'
                }
            },
            { $unwind: '$productDetails' },
            {
                $project: {
                    productName: '$productDetails.name',
                    variantId: '$_id',
                    images: '$images',
                    totalQuantity: 1,
                    _id: 0
                }
            },
            { $limit: 10 }
        ]);

        res.status(200).json({
            success: true,
            data: {
                totalProducts,
                totalLowStock: lowStockVariants.length,
                productsByCategory,
                productsByBrand,
                lowStockVariants
            }
        });

    } catch (error) {
        console.error('Error getting product dashboard data:', error);
        res.status(500).json({
            success: false,
            message: 'Error getting product dashboard data',
            error: error.message
        });
    }
};

module.exports = {
    getTopSellingProducts,
    getProductsByCategory,
    getProductDetailsByCategory,
    getProductById,
    createProduct,
    getAllProducts,
    updateProduct,
    deleteProduct,
    getProductVariantsByProductId,
    getChildAttributesByProductId,
    getChildAttributesByParentId,
    createProductVariant,
    deleteProductVariant,
    updateProductVariant,
    getImportBatchesByVariantId,
    createImportBatch,
    updateImportBatch,
    deleteImportBatch,
    getAllBestSellingProducts,
    getProductsBySearch,
    getAllWorstSellingProducts,
    updateProductVariantCostPrice,
    getProductDashboardData
};
