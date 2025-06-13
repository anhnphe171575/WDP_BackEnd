const mongoose = require('mongoose');
const Product = require('../models/product');
const Category = require('../models/category');
const Attribute = require('../models/attribute');
const ProductVariant = require('../models/productVariant');

const seedData = async () => {
    try {
        // Clear existing data
        await Promise.all([
            Product.deleteMany({}),
            Category.deleteMany({}),
            Attribute.deleteMany({}),
            ProductVariant.deleteMany({})
        ]);

        // Create Categories (3 levels)
        const mainCategory = await Category.create({
            name: 'Điện thoại',
            description: 'Danh mục điện thoại di động'
        });

        const subCategory = await Category.create({
            name: 'Điện thoại Apple',
            description: 'Điện thoại iPhone',
            parentCategory: mainCategory._id
        });

        const subSubCategory = await Category.create({
            name: 'iPhone 15 Series',
            description: 'Dòng iPhone 15',
            parentCategory: subCategory._id
        });

        // Create Attributes (2 levels)
        const colorAttribute = await Attribute.create({
            value: 'Màu sắc',
            description: 'Thuộc tính màu sắc'
        });

        const sizeAttribute = await Attribute.create({
            value: 'Dung lượng',
            description: 'Thuộc tính dung lượng'
        });

        // Create sub-attributes
        const blackColor = await Attribute.create({
            value: 'Đen',
            parentId: colorAttribute._id,
            categories: [subSubCategory._id]
        });

        const whiteColor = await Attribute.create({
            value: 'Trắng',
            parentId: colorAttribute._id,
            categories: [subSubCategory._id]
        });

        const storage128GB = await Attribute.create({
            value: '128GB',
            parentId: sizeAttribute._id,
            categories: [subSubCategory._id]
        });

        const storage256GB = await Attribute.create({
            value: '256GB',
            parentId: sizeAttribute._id,
            categories: [subSubCategory._id]
        });

        // Create Products
        const iphone15 = await Product.create({
            name: 'iPhone 15 Pro Max',
            description: 'iPhone 15 Pro Max mới nhất từ Apple',
            category: [
                { categoryId: mainCategory._id },
                { categoryId: subCategory._id },
                { categoryId: subSubCategory._id }
            ]
        });

        // Create Product Variants
        const variants = [
            {
                product_id: iphone15._id,
                images: [
                    { url: 'https://example.com/iphone15-black-128.jpg' }
                ],
                attribute: [blackColor._id, storage128GB._id],
                sellPrice: 29990000
            },
            {
                product_id: iphone15._id,
                images: [
                    { url: 'https://example.com/iphone15-black-256.jpg' }
                ],
                attribute: [blackColor._id, storage256GB._id],
                sellPrice: 32990000
            },
            {
                product_id: iphone15._id,
                images: [
                    { url: 'https://example.com/iphone15-white-128.jpg' }
                ],
                attribute: [whiteColor._id, storage128GB._id],
                sellPrice: 29990000
            },
            {
                product_id: iphone15._id,
                images: [
                    { url: 'https://example.com/iphone15-white-256.jpg' }
                ],
                attribute: [whiteColor._id, storage256GB._id],
                sellPrice: 32990000
            }
        ];

        await ProductVariant.insertMany(variants);

        console.log('Seed data created successfully');
    } catch (error) {
        console.error('Error seeding data:', error);
    }
};

module.exports = seedData; 