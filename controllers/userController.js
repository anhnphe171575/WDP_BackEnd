const mongoose = require('mongoose');
const Order = require('../models/order');
const OrderItem = require('../models/orderItem');
const User = require('../models/userModel');
const { Server } = require('socket.io');
const Notification = require('../models/notificationModel');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require("dotenv").config();
const transporter = require('../config/email');
const Voucher = require('../models/voucher');
const Product = require('../models/product')
const ProductVariant = require('../models/productVariant')


// Get all orders of user
exports.getAllOrders = async (req, res) => {
    try {
        const userId = req.user.id;

        const orders = await Order.find({ userId })
            .select('_id total status paymentMethod createAt OrderItems voucher reasonRejectCancel')
            .sort({ createAt: -1 })
            .lean();

        // Lấy tất cả OrderItems
        const orderItemIds = orders.reduce((ids, order) => {
            return [...ids, ...order.OrderItems.filter(id => id)];
        }, []);

        const orderItems = await OrderItem.find({
            _id: { $in: orderItemIds }
        }).populate({
            path: 'productVariant',
            select: 'images sellPrice attribute',
            populate: {
                path: 'attribute',
                select: 'value'
            }
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
                    
                    const variantInfo = orderItem.productVariant ? {
                        images: orderItem.productVariant.images || [],
                        sellPrice: orderItem.productVariant.sellPrice || 0,
                        attributes: orderItem.productVariant.attribute ? 
                                    orderItem.productVariant.attribute.map(attr => attr.value) : []
                    } : {};

                    return {
                        _id:orderItem._id,
                        productName: product ? product.name : 'Sản phẩm không tìm thấy',
                        quantity: orderItem.quantity || 0,
                        price: orderItem.price || 0,
                        status:orderItem.status,
                        ...variantInfo
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
                vouchers: orderVouchers,
                reasonRejectCancel: order.reasonRejectCancel || ''
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

        // Lấy danh sách productId và productVariantId
        const productIds = [];
        const productVariantIds = [];
        orderItems.forEach(item => {
            if (item.productId) productIds.push(item.productId);
            if (item.productVariant) productVariantIds.push(item.productVariant);
        });

        // Lấy thông tin voucher
        const vouchers = await Voucher.find({
            _id: { $in: order.voucher || [] }
        }).lean();

        // Tìm tất cả products
        const products = await Product.find({
            _id: { $in: productIds }
        }).lean();

        // Tìm tất cả product variants
        const productVariants = await ProductVariant.find({
            _id: { $in: productVariantIds }
        }).populate('attribute').lean();

        // Tạo product map
        const productMap = products.reduce((map, product) => {
            if (product && product._id) {
                map[product._id.toString()] = product;
            }
            return map;
        }, {});

        // Tạo product variant map
        const productVariantMap = productVariants.reduce((map, variant) => {
            if (variant && variant._id) {
                map[variant._id.toString()] = variant;
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

                    // Lấy product variant
                    const productVariant = productVariantMap[orderItem.productVariant?.toString()];
                    const variantInfo = productVariant ? {
                        images: productVariant.images || [],
                        attributes: productVariant.attribute || [],
                        sellPrice: productVariant.sellPrice || 0
                    } : null;

                    return {
                        _id: orderItem._id,
                        product: {
                            name: productName,
                            id: orderItem.productId
                        },
                        variant: variantInfo,
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
        const { name, email, password, phone, role, address } = req.body;

        // Validate required fields
        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng nhập đầy đủ thông tin bắt buộc'
            });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'Email đã được sử dụng'
            });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Generate verification token
        const verificationToken = jwt.sign(
            { email },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Create new user
        const newUser = new User({
            name,
            email,
            password: hashedPassword,
            phone,
            role,
            address,
            verified: false,
            verificationToken,
            verificationTokenExpires: new Date(Date.now() + 24 * 60 * 60 * 1000)
        });

        // Save user to database
        await newUser.save();

        // Send verification email
        const emailSent = await sendVerificationEmail(email, verificationToken);
        if (!emailSent) {
            // If email sending fails, delete the user
            await User.findByIdAndDelete(newUser._id);
            return res.status(500).json({
                success: false,
                message: 'Lỗi khi gửi email xác thực'
            });
        }

        // Send response
        res.status(201).json({
            success: true,
            message: 'Đăng ký thành công. Vui lòng kiểm tra email để xác thực tài khoản.',
            user: {
                id: newUser._id,
                name: newUser.name,
                email: newUser.email,
                role: newUser.role
            }
        });
    } catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server',
            error: error.message
        });
    }
};
const sendVerificationEmail = async (email, verificationToken) => {
    // Tạo URL xác thực với đầy đủ thông tin
    const verificationUrl = `${process.env.BASE_URL || 'http://localhost:5000'}/api/auth/verify-email?token=${verificationToken}`;

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Verify your email',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #333;">Hello!</h1>
            <p style="color: #666; line-height: 1.6;">Thank you for registering. Please click the button below to verify your email:</p>
            <div style="text-align: center; margin: 20px 0;">
              <a href="${verificationUrl}" 
                 style="display: inline-block; padding: 12px 24px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 4px; font-weight: bold;">
                Verify email
              </a>
            </div>
            <p style="color: #666; line-height: 1.6;">The link will expire in 24 hours.</p>
            <p style="color: #666; line-height: 1.6;">If you did not request this verification, please ignore this email.</p>
          </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        return true;
    } catch (error) {
        console.error('Error sending verification email:', error);
        return false;
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

exports.updateProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const { name, phone, dob, address } = req.body;
        // Chỉ lấy các trường hợp lệ
        const updateFields = {};
        if (name !== undefined) updateFields.name = name;
        if (phone !== undefined) updateFields.phone = phone;
        if (dob !== undefined) updateFields.dob = dob;
        if (address !== undefined) updateFields.address = address;

        if (Object.keys(updateFields).length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Không có trường nào để cập nhật'
            });
        }

        const user = await User.findByIdAndUpdate(
            userId,
            { $set: updateFields },
            { new: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy người dùng'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Cập nhật thông tin cá nhân thành công',
            data: user
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get user dashboard statistics
exports.getUserDashboard = async (req, res) => {
    try {
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth();

        // 1. Thống kê user đăng ký theo tháng trong năm hiện tại
        const userRegistrationByMonth = await User.aggregate([
            {
                $match: {
                    createdAt: {
                        $gte: new Date(currentYear, 0, 1),
                        $lt: new Date(currentYear + 1, 0, 1)
                    },
                    role: { $ne: 0 } // Loại trừ admin developer
                }
            },
            {
                $group: {
                    _id: { $month: '$createdAt' },
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { '_id': 1 }
            }
        ]);

        // 1.1. Thống kê user đăng ký theo tháng trong năm trước
        const userRegistrationByMonthLastYear = await User.aggregate([
            {
                $match: {
                    createdAt: {
                        $gte: new Date(currentYear - 1, 0, 1),
                        $lt: new Date(currentYear, 0, 1)
                    },
                    role: { $ne: 0 } // Loại trừ admin developer
                }
            },
            {
                $group: {
                    _id: { $month: '$createdAt' },
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { '_id': 1 }
            }
        ]);

        // 1.2. Thống kê user đăng ký theo tháng trong năm 2 năm trước
        const userRegistrationByMonthTwoYearsAgo = await User.aggregate([
            {
                $match: {
                    createdAt: {
                        $gte: new Date(currentYear - 2, 0, 1),
                        $lt: new Date(currentYear - 1, 0, 1)
                    },
                    role: { $ne: 0 } // Loại trừ admin developer
                }
            },
            {
                $group: {
                    _id: { $month: '$createdAt' },
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { '_id': 1 }
            }
        ]);

        // 2. Thống kê user đăng ký theo năm
        const userRegistrationByYear = await User.aggregate([
            {
                $match: {
                    role: { $ne: 0 } // Loại trừ admin developer
                }
            },
            {
                $group: {
                    _id: { $year: '$createdAt' },
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { '_id': 1 }
            }
        ]);

        // 3. Top khách hàng mua hàng nhiều nhất (theo tổng giá trị đơn hàng)
        const topCustomersByRevenue = await Order.aggregate([
            {
                $match: {
                    status: 'completed'
                }
            },
            {
                $group: {
                    _id: '$userId',
                    totalRevenue: { $sum: '$total' },
                    orderCount: { $sum: 1 },
                    averageOrderValue: { $avg: '$total' }
                }
            },
            {
                $sort: { 'totalRevenue': -1 }
            },
            {
                $limit: 10
            },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'userInfo'
                }
            },
            {
                $unwind: '$userInfo'
            },
            {
                $project: {
                    userId: '$_id',
                    userName: '$userInfo.name',
                    userEmail: '$userInfo.email',
                    totalRevenue: 1,
                    orderCount: 1,
                    averageOrderValue: 1
                }
            }
        ]);

        // 4. Top khách hàng mua hàng nhiều nhất (theo số lượng đơn hàng)
        const topCustomersByOrderCount = await Order.aggregate([
            {
                $match: {
                    status: 'completed'
                }
            },
            {
                $group: {
                    _id: '$userId',
                    totalRevenue: { $sum: '$total' },
                    orderCount: { $sum: 1 },
                    averageOrderValue: { $avg: '$total' }
                }
            },
            {
                $sort: { 'orderCount': -1 }
            },
            {
                $limit: 10
            },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'userInfo'
                }
            },
            {
                $unwind: '$userInfo'
            },
            {
                $project: {
                    userId: '$_id',
                    userName: '$userInfo.name',
                    userEmail: '$userInfo.email',
                    totalRevenue: 1,
                    orderCount: 1,
                    averageOrderValue: 1
                }
            }
        ]);

        // 5. Top user cancel hàng nhiều nhất
        const topUsersByCancellations = await Order.aggregate([
            {
                $match: {
                    status: 'cancelled'
                }
            },
            {
                $group: {
                    _id: '$userId',
                    cancelledOrderCount: { $sum: 1 },
                    totalCancelledValue: { $sum: '$total' }
                }
            },
            {
                $sort: { 'cancelledOrderCount': -1 }
            },
            {
                $limit: 10
            },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'userInfo'
                }
            },
            {
                $unwind: '$userInfo'
            },
            {
                $project: {
                    userId: '$_id',
                    userName: '$userInfo.name',
                    userEmail: '$userInfo.email',
                    cancelledOrderCount: 1,
                    totalCancelledValue: 1
                }
            }
        ]);

        // 6. Thống kê tổng quan
        const totalUsers = await User.countDocuments({ role: { $ne: 0 } });
        const totalVerifiedUsers = await User.countDocuments({ 
            role: { $ne: 0 }, 
            verified: true 
        });
        const totalUnverifiedUsers = await User.countDocuments({ 
            role: { $ne: 0 }, 
            verified: false 
        });

        // 7. Thống kê user theo role
        const usersByRole = await User.aggregate([
            {
                $match: {
                    role: { $ne: 0 }
                }
            },
            {
                $group: {
                    _id: '$role',
                    count: { $sum: 1 }
                }
            }
        ]);

        // 8. Thống kê user mới trong tháng hiện tại
        const currentMonthUsers = await User.countDocuments({
            createdAt: {
                $gte: new Date(currentYear, currentMonth, 1),
                $lt: new Date(currentYear, currentMonth + 1, 1)
            },
            role: { $ne: 0 }
        });

        // 9. Thống kê user mới trong tháng trước
        const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        const previousMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
        const previousMonthUsers = await User.countDocuments({
            createdAt: {
                $gte: new Date(previousMonthYear, previousMonth, 1),
                $lt: new Date(previousMonthYear, previousMonth + 1, 1)
            },
            role: { $ne: 0 }
        });

        // 10. Tạo mảng đầy đủ 12 tháng cho user registration
        const fullUserRegistrationByMonth = Array.from({ length: 12 }, (_, i) => {
            const monthData = userRegistrationByMonth.find(item => item._id === i + 1);
            return {
                month: i + 1,
                count: monthData ? monthData.count : 0
            };
        });

        // 10.1. Tạo mảng đầy đủ 12 tháng cho năm trước
        const fullUserRegistrationByMonthLastYear = Array.from({ length: 12 }, (_, i) => {
            const monthData = userRegistrationByMonthLastYear.find(item => item._id === i + 1);
            return {
                month: i + 1,
                count: monthData ? monthData.count : 0
            };
        });

        // 10.2. Tạo mảng đầy đủ 12 tháng cho 2 năm trước
        const fullUserRegistrationByMonthTwoYearsAgo = Array.from({ length: 12 }, (_, i) => {
            const monthData = userRegistrationByMonthTwoYearsAgo.find(item => item._id === i + 1);
            return {
                month: i + 1,
                count: monthData ? monthData.count : 0
            };
        });

        // 11. Khách hàng tiềm năng (chưa có order nào)
        const usersWithOrders = await Order.distinct('userId');

        const totalPotentialCustomers = await User.countDocuments({
            _id: { $nin: usersWithOrders },
            role: 1
        });

        const potentialCustomersList = await User.find({
            _id: { $nin: usersWithOrders },
            role: 1
        })
        .sort({ createdAt: -1 })
        .limit(10)
        .select('name email phone createdAt verified')
        .lean();

        const result = {
            // Tổng quan
            totalUsers,
            totalVerifiedUsers,
            totalUnverifiedUsers,
            currentMonthUsers,
            previousMonthUsers,
            userGrowthPercentage: previousMonthUsers > 0 
                ? ((currentMonthUsers - previousMonthUsers) / previousMonthUsers * 100).toFixed(2)
                : 0,

            // Thống kê theo thời gian
            userRegistrationByMonth: fullUserRegistrationByMonth,
            userRegistrationByMonthLastYear: fullUserRegistrationByMonthLastYear,
            userRegistrationByMonthTwoYearsAgo: fullUserRegistrationByMonthTwoYearsAgo,
            userRegistrationByYear,

            // Thống kê theo role
            usersByRole,

            // Top khách hàng
            topCustomersByRevenue,
            topCustomersByOrderCount,

            // Top user cancel
            topUsersByCancellations,

            // Khách hàng tiềm năng
            totalPotentialCustomers,
            potentialCustomers: potentialCustomersList
        };

        res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('User dashboard error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

