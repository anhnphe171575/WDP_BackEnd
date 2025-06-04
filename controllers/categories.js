const Category = require('../models/category');
const Order = require('../models/order');
const OrderItem = require('../models/orderItem');
const Product = require('../models/product');

const getAllCategoriesPopular = async (req, res) => {
    try {
        // Đầu tiên lấy danh sách categories không có parent
        const categoriesWithoutParent = await Category.find({ parentCategory: null }).select('_id');
        const categoryIdsWithoutParent = categoriesWithoutParent.map(cat => cat._id);

        // Lấy danh sách categories có parent_id là những categories không có parent
        const categoriesWithParent = await Category.find({
            parentCategory: { $in: categoryIdsWithoutParent }
        }).select('_id');
        const categoryIdsWithParent = categoriesWithParent.map(cat => cat._id);

        // Tìm categories phổ biến dựa trên orders nhưng chỉ lấy những categories có parent_id là categories không có parent
        const topCategories = await Order.aggregate([
            // Unwind order items array
            { $unwind: '$OrderItems' },
            // Lookup order items
            {
                $lookup: {
                    from: 'orderitems',
                    localField: 'OrderItems.orderItem_id',
                    foreignField: '_id',
                    as: 'orderItemDetails'
                }
            },
            { $unwind: '$orderItemDetails' },
            // Lookup products
            {
                $lookup: {
                    from: 'products',
                    localField: 'orderItemDetails.productId',
                    foreignField: '_id',
                    as: 'productDetails'
                }
            },
            { $unwind: '$productDetails' },
            // Unwind categories array
            { $unwind: '$productDetails.category' },
            // Lookup categories
            {
                $lookup: {
                    from: 'categories',
                    localField: 'productDetails.category.categoryId',
                    foreignField: '_id',
                    as: 'categoryDetails'
                }
            },
            { $unwind: '$categoryDetails' },
            // Chỉ lấy những categories có parent_id là categories không có parent
            {
                $match: {
                    'categoryDetails._id': { $in: categoryIdsWithParent }
                }
            },
            // Group by category and count
            {
                $group: {
                    _id: '$categoryDetails._id',
                    name: { $first: '$categoryDetails.name' },
                    description: { $first: '$categoryDetails.description' },
                    image: { $first: '$categoryDetails.image' },
                    totalOrders: { $sum: '$orderItemDetails.quantity' }
                }
            },
            // Sort by total orders descending
            { $sort: { totalOrders: -1 } },
            // Limit to top 5
            { $limit: 5 }
        ]);

        // Nếu không tìm thấy categories nào từ orders, lấy 5 categories có parent_id là categories không có parent
        if (topCategories.length === 0) {
            const fallbackCategories = await Category.find({
                _id: { $in: categoryIdsWithParent }
            })
            .select('_id name description image')
            .limit(5)
            .lean();
            
            // Thêm totalOrders = 0 cho các categories fallback
            const formattedCategories = fallbackCategories.map(cat => ({
                ...cat,
                totalOrders: 0
            }));
            
            return res.status(200).json(formattedCategories);
        }

        res.status(200).json(topCategories);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
const getParentCategories = async (req, res) => {
    try {
        const parentCategories = await Category.find({ parentCategory: null }).select('_id name description image');
        res.status(200).json(parentCategories);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
module.exports = {
    getAllCategoriesPopular,
    getParentCategories,
};
