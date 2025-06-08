const mongoose = require('mongoose');
const Order = require('../models/order');
const OrderItem = require('../models/orderItem');

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
}

// Get order details by order ID
exports.getOrderDetails = async (req, res) => {
    try {
        const orderId = req.params.orderId;
        const userId = req.user.id;

        const order = await Order.findOne({ _id: orderId, userId })
            .populate({
                path: 'OrderItems.orderItem_id',
                populate: {
                    path: 'productId',
                    select: 'name description'
                }
            })
            .populate('voucher', 'code discountAmount discountPercent');

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy đơn hàng'
            });
        }

        res.status(200).json({
            success: true,
            data: order
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
}