const Order = require('../models/order');
const OrderItem = require('../models/orderItem');
const Voucher = require('../models/voucher')
const Product = require('../models/product')

// Create new order
exports.createOrder = async (req, res) => {
    try {
        const { userId, OrderItems, total, status, paymentMethod, voucher } = req.body;
        
        const order = new Order({
            userId,
            OrderItems,
            total,
            status,
            paymentMethod,
            voucher
        });

        const savedOrder = await order.save();
        res.status(201).json(savedOrder);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Get all orders
exports.getAllOrders = async (req, res) => {
    try {
        const orders = await Order.find()
            .populate('userId', 'name email')
            .populate({
                path: 'OrderItems',
                populate: {
                    path: 'productId',
                    model: 'Product',
                    select: 'name image'
                }
            })
            .populate('voucher');
        res.status(200).json(orders);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get order by ID
exports.getOrderById = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate('userId', 'name email')
            .populate({
                path: 'OrderItems.orderItem_id',
                populate: {
                    path: 'productId',
                    model: 'Product'
                }
            })
            .populate('voucher');
            
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }
        res.status(200).json(order);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Update order
exports.updateOrder = async (req, res) => {
    try {
        const { status, paymentMethod, voucher } = req.body;
        const order = await Order.findById(req.params.id);
        
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        if (status) order.status = status;
        if (paymentMethod) order.paymentMethod = paymentMethod;
        if (voucher) order.voucher = voucher;
        order.updateAt = Date.now();

        const updatedOrder = await order.save();
        res.status(200).json(updatedOrder);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Delete order
exports.deleteOrder = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        await order.remove();
        res.status(200).json({ message: 'Order deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
