const Product = require('../models/product');
const Order = require('../models/order');
const mongoose = require('mongoose');
const Attribute = require('../models/attribute'); // adjust path as needed
const Category = require('../models/category');
const ProductVariant = require('../models/productVariant');
const {cloudinary} = require('../config/cloudinary');

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
                    brand: { $first: '$brand' },
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
                    brand: 1,
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
                    brand: { $first: '$brand' },
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
                    brand: 1,
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
                    brand: { $first: '$brand' },
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
                    brand: { $first: '$brand' },
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
            const categoryIds = categories.map(cat => cat.categoryId);
            console.log('Validated category IDs:', categoryIds);

            const existingCategories = await Category.find({ _id: { $in: categoryIds } });
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
        let { attributes, sellPrice } = req.body;

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
            attribute: attributeIds,
            sellPrice
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
        const { images, attributes, sellPrice } = req.body;

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

        // Update other fields if provided
        if (images) {
            existingVariant.images = images;
        }
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
    deleteImportBatch
};
