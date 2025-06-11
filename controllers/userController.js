const mongoose = require('mongoose');
const Order = require('../models/order');
const OrderItem = require('../models/orderItem');
const User = require('../models/userModel');
const Voucher = require('../models/voucher'); 
const Product = require('../models/product')


// Get all orders of user
exports.getAllOrders = async (req, res) => {
    try {
        const userId = req.user.id;

        const orders = await Order.find({ userId })
            .select('_id total status paymentMethod createAt')
            .sort({ createAt: -1 });

        res.status(200).json({
            success: true,
            data: orders
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get all users
exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.find({ role: { $ne: 0 } }).select('-password');
        res.status(200).json({
            success: true,
            data: users
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get user by ID
exports.getUserById = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password');
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        res.status(200).json({
            success: true,
            data: user
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get order details by order ID
exports.getOrderDetails = async (req, res) => {
    try {
        const orderId = req.params.orderId;
        const userId = req.user.id;

        // Tìm order trước
        const order = await Order.findOne({ _id: orderId, userId }).lean();
        
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy đơn hàng'
            });
        }

        // OrderItems là array các ObjectId trực tiếp, không phải object có orderItem_id
        const orderItemIds = order.OrderItems.filter(id => id); // Lọc bỏ null/undefined

        console.log('OrderItem IDs to find:', orderItemIds);

        // Tìm tất cả OrderItems
        const orderItems = await OrderItem.find({
            _id: { $in: orderItemIds }
        }).lean();
        
        console.log('OrderItems found:', orderItems);
        
        // Lấy danh sách productId
        const productIds = orderItems
            .filter(item => item && item.productId)
            .map(item => item.productId);
            
        console.log('Product IDs to find:', productIds);
            
        // Tìm tất cả products
        const products = await Product.find({
            _id: { $in: productIds }
        }).lean();
        
        console.log('Products found:', products);
        
        // Tạo product map
        const productMap = products.reduce((map, product) => {
            if (product && product._id) {
                map[product._id.toString()] = product;
            }
            return map;
        }, {});

        // Tạo orderItem map
        const orderItemMap = orderItems.reduce((map, item) => {
            if (item && item._id) {
                map[item._id.toString()] = item;
            }
            return map;
        }, {});

        // Format lại dữ liệu
        const formattedOrder = {
            ...order,
            OrderItems: order.OrderItems.map(orderItemId => {
                // orderItemId là ObjectId trực tiếp
                const orderItem = orderItemMap[orderItemId.toString()];
                
                if (orderItem) {
                    // Lấy product từ productMap
                    const product = productMap[orderItem.productId?.toString()];
                    const productName = product ? product.name : 'Sản phẩm không tìm thấy';

                    return {
                        _id: orderItem._id,
                        product: {
                            name: productName,
                            id: orderItem.productId
                        },
                        quantity: orderItem.quantity || 0,
                        price: orderItem.price || 0,
                        totalPrice: (orderItem.price || 0) * (orderItem.quantity || 0)
                    };
                }

                return {
                    _id: orderItemId,
                    product: {
                        name: 'OrderItem không tìm thấy'
                    },
                    quantity: 0,
                    price: 0,
                    totalPrice: 0
                };
            })
        };

        res.status(200).json({
            success: true,
            data: formattedOrder
        });
    } catch (error) {
        console.log('Error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
// Create new user
exports.createUser = async (req, res) => {
    try {
        const user = await User.create(req.body);
        res.status(201).json({
            success: true,
            data: user
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// Update user
exports.updateUser = async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.status(200).json({
            success: true,
            data: user
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// Delete user
exports.deleteUser = async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'User deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
