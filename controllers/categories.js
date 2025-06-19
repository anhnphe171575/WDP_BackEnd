const Category = require('../models/category');
const Order = require('../models/order');
const OrderItem = require('../models/orderItem');
const Product = require('../models/product');
const Attribute = require('../models/attribute');
const { cloudinary } = require('../config/cloudinary');
const fs = require('fs');
const path = require('path');

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
        res.status(200).json({
            success: true,
            data: parentCategories
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            message: error.message 
        });
    }
};

// Hàm đệ quy để lấy tất cả categories con
const getAllChildCategories = async (parentId, currentDepth = 1) => {
    // Stop recursion if we've reached depth 3
    if (currentDepth >= 3) {
        return [];
    }

    const children = await Category.find({
        parentCategory: parentId
    }).select('_id name description image');

    const result = [];
    for (const child of children) {
        const grandChildren = await getAllChildCategories(child._id, currentDepth + 1);
        result.push({
            ...child.toObject(),
            children: grandChildren
        });
    }
    return result;
};


const getCategoryChildrenById = async (req, res) => {
    try {
        const { categoryId } = req.params;
        
        // Verify if category exists
        const category = await Category.findById(categoryId);
        if (!category) {
            return res.status(404).json({ message: 'Category not found' });
        }

        // Get only direct child categories (one level)
        const childCategories = await Category.find({
            parentCategory: categoryId
        }).select('_id name description image');

        res.status(200).json({
            success: true,
            parent: {
                _id: category._id,
                name: category.name,
                description: category.description,
                image: category.image
            },
            children: childCategories
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Hàm đệ quy để lấy tất cả attribute con
const getAllChildAttributes = async (parentId) => {
    const children = await Attribute.find({
        parentId: parentId
    }).select('_id value description parentId');

    const result = [];
    for (const child of children) {
        const grandChildren = await getAllChildAttributes(child._id);
        result.push({
            ...child.toObject(),
            children: grandChildren
        });
    }
    return result;
};

const getAttributesByCategoryId = async (req, res) => {
    try {
        const { categoryId } = req.params;
        
        // Verify if category exists
        const category = await Category.findById(categoryId);
        if (!category) {
            return res.status(404).json({ message: 'Category not found' });
        }

        // Get parent attributes associated with this category (those without parentId)
        const parentAttributes = await Attribute.find({
            categories: categoryId,
            parentId: null
        }).select('_id value description parentId');

        // Get all child attributes for each parent attribute
        const attributesWithChildren = [];
        for (const attr of parentAttributes) {
            const children = await getAllChildAttributes(attr._id);
            attributesWithChildren.push({
                ...attr.toObject(),
                children: children
            });
        }

        res.status(200).json({
            success: true,
            category: {
                _id: category._id,
                name: category.name
            },
            attributes: attributesWithChildren
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


const getChildCategories = async (req, res) => {
    try {
        // Lấy tất cả categories cha (parentCategory: null)
        const parentCategories = await Category.find({ 
            parentCategory: null 
        }).select('_id name description image');

        // Tạo một mảng để lưu kết quả cuối cùng
        const result = [];

        // Với mỗi category cha, tìm tất cả categories con và cháu
        for (const parent of parentCategories) {
            const allChildren = await getAllChildCategories(parent._id);

            // Thêm category cha và tất cả categories con vào kết quả
            result.push({
                parent: {
                    _id: parent._id,
                    name: parent.name,
                    description: parent.description,
                    image: parent.image
                },
                children: allChildren
            });
        }

        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getChildCategoriesByParentId = async (req, res) => {
    try {
        const parentId = req.params.parentId;

        // Validate parentId
        if (!parentId) {
            return res.status(400).json({
                success: false,
                message: 'Parent ID is required'
            });
        }

        // Find child categories
        const childCategories = await Category.find({
            parentCategory: parentId
        }).select('_id name description image');

        res.status(200).json({
            success: true,
            data: childCategories
        });
    } catch (error) {
        console.error('Error getting child categories:', error);
        res.status(500).json({
            success: false,
            message: 'Error getting child categories',
            error: error.message
        });
    }
};

const createCategory = async (req, res) => {
    try {
        const { name, description, parentCategory } = req.body;
        let imageUrl = null;

        // Validate required fields
        if (!name) {
            return res.status(400).json({
                success: false,
                message: 'Category name is required'
            });
        }

        // If parentCategory is provided, verify it exists
        if (parentCategory) {
            const parentExists = await Category.findById(parentCategory);
            if (!parentExists) {
                return res.status(404).json({
                    success: false,
                    message: 'Parent category not found'
                });
            }

            // Check if parent category already has a parent (max 2 levels)
            if (parentExists.parentCategory) {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot add more than 2 levels of categories'
                });
            }
        }

        // Handle image upload if provided
        if (req.file) {
            try {
                const result = await cloudinary.uploader.upload(req.file.path, {
                    folder: 'categories',
                });
                imageUrl = result.secure_url;
                console.log('Uploaded image URL:', imageUrl);
            } catch (uploadError) {
                console.error('Error uploading image:', uploadError);
                return res.status(500).json({
                    success: false,
                    message: 'Error uploading image'
                });
            }
        }

        // Create new category
        const newCategory = new Category({
            name,
            description: description || '',
            image: imageUrl,
            parentCategory: parentCategory || null
        });

        const savedCategory = await newCategory.save();

        res.status(201).json({
            success: true,
            data: savedCategory
        });
    } catch (error) {
        console.error('Error creating category:', error);
        // If there's an error and image was uploaded, delete it
        if (req.file && req.file.filename) {
            try {
                await cloudinary.uploader.destroy(req.file.filename);
            } catch (deleteError) {
                console.error('Error deleting uploaded image:', deleteError);
            }
        }
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

const createChildCategory = async (req, res) => {
    try {
        const { parentId } = req.params;
        const { name, description } = req.body;
        let imageUrl = null;

        // Validate required fields
        if (!name) {
            return res.status(400).json({
                success: false,
                message: 'Category name is required'
            });
        }

        if (!parentId) {
            return res.status(400).json({
                success: false,
                message: 'Parent category ID is required'
            });
        }

        // Verify parent category exists
        const parentCategory = await Category.findById(parentId);
        if (!parentCategory) {
            return res.status(404).json({
                success: false,
                message: 'Parent category not found'
            });
        }

        // Check if parent category is already a level 3 category
        if (parentCategory.parentCategory) {
            const grandParent = await Category.findById(parentCategory.parentCategory);
            if (grandParent && grandParent.parentCategory) {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot add more than 3 levels of categories'
                });
            }
        }

        // Handle image upload if provided
        if (req.file) {
            try {
                const result = await cloudinary.uploader.upload(req.file.path, {
                    folder: 'categories',
                });
                imageUrl = result.secure_url;
                console.log('Uploaded image URL:', imageUrl);
            } catch (uploadError) {
                console.error('Error uploading image:', uploadError);
                return res.status(500).json({
                    success: false,
                    message: 'Error uploading image'
                });
            }
        }

        // Create new child category
        const newCategory = new Category({
            name,
            description: description || '',
            image: imageUrl,
            parentCategory: parentId
        });

        const savedCategory = await newCategory.save();

        res.status(201).json({
            success: true,
            data: savedCategory
        });
    } catch (error) {
        console.error('Error creating child category:', error);
        // If there's an error and image was uploaded, delete it
        if (req.file && req.file.filename) {
            try {
                await cloudinary.uploader.destroy(req.file.filename);
            } catch (deleteError) {
                console.error('Error deleting uploaded image:', deleteError);
            }
        }
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

const updateCategory = async (req, res) => {
    try {
        const { categoryId } = req.params;
        const { name, description, parentCategory } = req.body;
        let imageUrl;

        // Validate categoryId
        if (!categoryId) {
            return res.status(400).json({
                success: false,
                message: 'Category ID is required'
            });
        }

        // Find the category to update
        const category = await Category.findById(categoryId);
        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }

        // Validate required fields
        if (!name) {
            return res.status(400).json({
                success: false,
                message: 'Category name is required'
            });
        }

        // If parentCategory is provided, verify it exists and validate hierarchy
        if (parentCategory) {
            const parentExists = await Category.findById(parentCategory);
            if (!parentExists) {
                return res.status(404).json({
                    success: false,
                    message: 'Parent category not found'
                });
            }

            // Check if trying to set parent to itself
            if (parentCategory === categoryId) {
                return res.status(400).json({
                    success: false,
                    message: 'Category cannot be its own parent'
                });
            }

            // Check if parent category already has a parent (max 2 levels)
            if (parentExists.parentCategory) {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot add more than 2 levels of categories'
                });
            }

            // Check if this category has children and we're trying to make it a child
            const hasChildren = await Category.exists({ parentCategory: categoryId });
            if (hasChildren) {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot move category with children to be a child category'
                });
            }
        }

        // Handle image update
        if (req.file) {
            // Delete old image from Cloudinary if it exists
            if (category.image) {
                try {
                    const urlParts = category.image.split('/');
                    const filename = urlParts[urlParts.length - 1];
                    const publicId = filename.split('.')[0];
                    await cloudinary.uploader.destroy(publicId);
                } catch (error) {
                    console.log('Error deleting old image from Cloudinary:', error);
                }
            }

            // Upload new image
            const result = await cloudinary.uploader.upload(req.file.path, {
                folder: 'categories',
            });
            
            imageUrl = result.secure_url;
        }

        // Update fields
        category.name = name;
        category.description = description || '';
        if (parentCategory !== undefined) {
            category.parentCategory = parentCategory || null;
        }
        
        // Update image if new one was uploaded
        if (imageUrl) {
            category.image = imageUrl;
        }

        // Update timestamp
        category.updateAt = Date.now();

        const updatedCategory = await category.save();

        res.status(200).json({
            success: true,
            message: 'Category updated successfully',
            data: updatedCategory
        });
    } catch (error) {
        console.error('Error updating category:', error);
        // If there's an error and new image was uploaded, delete it
        if (req.file && req.file.filename) {
            try {
                await cloudinary.uploader.destroy(req.file.filename);
            } catch (deleteError) {
                console.error('Error deleting uploaded image:', deleteError);
            }
        }
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

const deleteCategory = async (req, res) => {
    try {
        const { categoryId } = req.params;

        // Validate categoryId
        if (!categoryId) {
            return res.status(400).json({
                success: false,
                message: 'Category ID is required'
            });
        }

        // Find the category to delete
        const category = await Category.findById(categoryId);
        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }

        // Check if category has children
        const hasChildren = await Category.exists({ parentCategory: categoryId });
        if (hasChildren) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete category with child categories. Please delete child categories first.'
            });
        }

        // Delete image from Cloudinary if it exists
        if (category.image) {
            try {
                const urlParts = category.image.split('/');
                const filename = urlParts[urlParts.length - 1];
                const publicId = filename.split('.')[0];
                await cloudinary.uploader.destroy(publicId);
            } catch (error) {
                console.log('Error deleting image from Cloudinary:', error);
            }
        }

        // Delete the category
        await Category.findByIdAndDelete(categoryId);

        res.status(200).json({
            success: true,
            message: 'Category deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting category:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Lấy tất cả categories và xuất ra file JSON
const exportAllCategoriesToJson = async (req, res) => {
    try {
        const categories = await Category.find().lean();
        const filePath = path.join(__dirname, '../categories.json');
        fs.writeFileSync(filePath, JSON.stringify(categories, null, 2), 'utf-8');
        res.status(200).json({
            success: true,
            message: 'Exported all categories to categories.json',
            filePath
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error exporting categories',
            error: error.message
        });
    }
};

module.exports = {
    getAllCategoriesPopular,
    getParentCategories,
    getChildCategories,
    getCategoryChildrenById,
    getAttributesByCategoryId,
    getChildCategoriesByParentId,
    createCategory,
    createChildCategory,
    updateCategory,
    deleteCategory,
    exportAllCategoriesToJson
};
