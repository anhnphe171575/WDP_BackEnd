const mongoose = require('mongoose');
const Order = require('../models/order');
const OrderItem = require('../models/orderItem');
const User = require('../models/userModel');
const { Server } = require('socket.io');
const Notification = require('../models/notificationModel');

const Voucher = require('../models/voucher'); 
const Product = require('../models/product')


// Get all orders of user
exports.getAllOrders = async (req, res) => {
    try {
        const userId = req.user.id;

        const orders = await Order.find({ userId })
            .select('_id total status paymentMethod createAt OrderItems voucher')
            .sort({ createAt: -1 })
            .lean();

        // Lấy tất cả OrderItems
        const orderItemIds = orders.reduce((ids, order) => {
            return [...ids, ...order.OrderItems.filter(id => id)];
        }, []);

        const orderItems = await OrderItem.find({
            _id: { $in: orderItemIds }
        }).lean();

        // Lấy tất cả productIds
        const productIds = orderItems
            .filter(item => item && item.productId)
            .map(item => item.productId);

        // Lấy tất cả voucherIds
        const voucherIds = orders.reduce((ids, order) => {
            return [...ids, ...(order.voucher || [])];
        }, []);

        // Lấy thông tin sản phẩm
        const products = await Product.find({
            _id: { $in: productIds }
        }).select('name').lean();

        // Lấy thông tin voucher
        const vouchers = await Voucher.find({
            _id: { $in: voucherIds }
        }).lean();

        // Tạo maps để truy xuất nhanh
        const productMap = products.reduce((map, product) => {
            map[product._id.toString()] = product;
            return map;
        }, {});

        const orderItemMap = orderItems.reduce((map, item) => {
            map[item._id.toString()] = item;
            return map;
        }, {});

        const voucherMap = vouchers.reduce((map, voucher) => {
            map[voucher._id.toString()] = voucher;
            return map;
        }, {});

        // Format lại dữ liệu orders
        const formattedOrders = orders.map(order => {
            const orderItems = order.OrderItems.map(orderItemId => {
                const orderItem = orderItemMap[orderItemId.toString()];
                if (orderItem) {
                    const product = productMap[orderItem.productId?.toString()];
                    return {
                        productName: product ? product.name : 'Sản phẩm không tìm thấy',
                        quantity: orderItem.quantity || 0,
                        price: orderItem.price || 0
                    };
                }
                return null;
            }).filter(item => item);

            // Format thông tin voucher và tính toán giá sau khi trừ voucher
            const orderVouchers = (order.voucher || []).map(voucherId => {
                const voucher = voucherMap[voucherId.toString()];
                return voucher ? {
                    _id: voucher._id,
                    code: voucher.code,
                    discountAmount: voucher.discountAmount || 0,
                    discountPercent: voucher.discountPercent || 0,
                    validFrom: voucher.validFrom,
                    validTo: voucher.validTo
                } : null;
            }).filter(voucher => voucher);

            // Tính tổng giá trị voucher
            const totalVoucherDiscount = orderVouchers.reduce((total, voucher) => {
                if (voucher.discountAmount) {
                    return total + voucher.discountAmount;
                }
                if (voucher.discountPercent) {
                    return total + (order.total * voucher.discountPercent / 100);
                }
                return total;
            }, 0);

            // Tính giá sau khi trừ voucher
            const finalTotal = Math.max(0, order.total - totalVoucherDiscount);

            return {
                _id: order._id,
                total: order.total,
                finalTotal: finalTotal,
                voucherDiscount: totalVoucherDiscount,
                status: order.status,
                paymentMethod: order.paymentMethod,
                createAt: order.createAt,
                items: orderItems,
                vouchers: orderVouchers
            };
        });

        res.status(200).json({
            success: true,
            data: formattedOrders
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

        // Tìm tất cả OrderItems
        const orderItems = await OrderItem.find({
            _id: { $in: orderItemIds }
        }).lean();
        
        // Lấy danh sách productId
        const productIds = orderItems
            .filter(item => item && item.productId)
            .map(item => item.productId);
            
        // Lấy thông tin voucher
        const vouchers = await Voucher.find({
            _id: { $in: order.voucher || [] }
        }).lean();
        
        // Tìm tất cả products
        const products = await Product.find({
            _id: { $in: productIds }
        }).lean();
        
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

        // Format thông tin voucher
        const orderVouchers = vouchers.map(voucher => ({
            _id: voucher._id,
            code: voucher.code,
            discountAmount: voucher.discountAmount || 0,
            discountPercent: voucher.discountPercent || 0,
            validFrom: voucher.validFrom,
            validTo: voucher.validTo
        }));

        // Tính tổng giá trị voucher
        const totalVoucherDiscount = orderVouchers.reduce((total, voucher) => {
            if (voucher.discountAmount) {
                return total + voucher.discountAmount;
            }
            if (voucher.discountPercent) {
                return total + (order.total * voucher.discountPercent / 100);
            }
            return total;
        }, 0);

        // Tính giá sau khi trừ voucher
        const finalTotal = Math.max(0, order.total - totalVoucherDiscount);

        // Format lại dữ liệu
        const formattedOrder = {
            ...order,
            finalTotal: finalTotal,
            voucherDiscount: totalVoucherDiscount,
            vouchers: orderVouchers,
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
        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'User creation failed'
            });
        }
        user.save();
        // 1. Gửi socket đến tất cả client
        req.io.emit('notification', {
            message: `User ${user.name} has registered successfully!`
        });

        // 2. Lưu vào DB
        const notification = new Notification({
            message: `User ${user.name} has registered successfully!`,
            userId: user._id,
            type: 'user_registration',
            title: 'New User Registration',
            description: `User ${user.name} has registered successfully!`,
            read: false
        });

        await notification.save();
        // Save the user to the database
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

// Get user addresses by user ID
exports.getUserAddresses = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId).select('address');
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.status(200).json({
            success: true,
            data: user.address
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Add new address for user
exports.addAddress = async (req, res) => {
    try {
        const userId = req.user.id;
        const newAddress = req.body;
        console.log(newAddress);
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        user.address.push(newAddress);
        await user.save();

        res.status(200).json({
            success: true,
            data: user.address
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Delete address by index
exports.deleteAddress = async (req, res) => {
    try {
        const userId = req.user.id;
        const addressId = req.params.addressId;
        console.log(userId);
        const user = await User.findById(userId);
        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'User not found'
            });
        }

        if (!user.address.some(address => address._id.toString() === addressId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid address index'
            });
        }

        user.address = user.address.filter(address => address._id.toString() !== addressId);
        await user.save();

        res.status(200).json({
            success: true,
            data: user.address  
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Update address by index
exports.updateAddress = async (req, res) => {
    try {
        const userId = req.user.id;
        const addressIndex = parseInt(req.params.index);
        const updatedAddress = req.body;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        if (addressIndex < 0 || addressIndex >= user.address.length) {
            return res.status(400).json({
                success: false,
                message: 'Invalid address index'
            });
        }

        user.address[addressIndex] = {
            ...user.address[addressIndex],
            ...updatedAddress
        };
        await user.save();

        res.status(200).json({
            success: true,
            data: user.address
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

