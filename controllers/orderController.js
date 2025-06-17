const Order = require('../models/order');
const OrderItem = require('../models/orderItem');
const Voucher = require('../models/voucher')
const Product = require('../models/product')
const ProductVariant = require('../models/productVariant')
const Attribute = require('../models/attribute')

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
            .populate('userId', 'name email address')
            .populate({
                path: 'OrderItems',
                populate: [
                    {
                        path: 'productId',
                        model: 'Product',
                        select: 'name'
                    },
                    {
                        path: 'productVariant',
                        model: 'ProductVariant',
                        select: 'images ',
                        populate: {
                            path: 'attribute',
                            model: 'Attribute',
                            select: 'value description'
                        }
                    }
                ]
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

exports.getOrdersDashboard = async (req, res) => {
    try {
        const totalOrders = await Order.countDocuments();

        // Danh sách status cố định
        const allStatuses = ["pending","processing", "shipped", "cancelled", "completed", "returned"];

        // 1. Group theo năm, tháng và status
        const ordersStatusByYearMonth = await Order.aggregate([
            {
                $group: {
                    _id: {
                        year: { $year: '$createAt' },
                        month: { $month: '$createAt' },
                        status: '$status'
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } }
        ]);

        // 2. Build resultStatusByYear: đủ 12 tháng và đủ status
        const statusYearsSet = new Set(ordersStatusByYearMonth.map(item => item._id.year));
        const statusYears = Array.from(statusYearsSet).sort();

        const resultStatusByYear = statusYears.map(year => {
            const months = Array.from({ length: 12 }, (_, i) => {
                const statuses = allStatuses.map(status => ({
                    status,
                    count: 0
                }));
                return { month: i + 1, statuses };
            });

            ordersStatusByYearMonth
                .filter(item => item._id.year === year)
                .forEach(item => {
                    const monthIndex = item._id.month - 1;
                    const statusIndex = allStatuses.indexOf(item._id.status);
                    if (statusIndex !== -1) {
                        months[monthIndex].statuses[statusIndex].count = item.count;
                    }
                });

            return { year, months };
        });

        // 3. Group theo năm và tháng (tổng số đơn hàng)
        const ordersByYearMonth = await Order.aggregate([
            {
                $group: {
                    _id: {
                        year: { $year: '$createAt' },
                        month: { $month: '$createAt' }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } }
        ]);

        // 4. Build resultByYear
        const yearsSet = new Set(ordersByYearMonth.map(item => item._id.year));
        const years = Array.from(yearsSet).sort();

        const resultByYear = years.map(year => {
            const months = Array.from({ length: 12 }, (_, i) => ({
                month: i + 1,
                count: 0
            }));

            ordersByYearMonth
                .filter(item => item._id.year === year)
                .forEach(item => {
                    months[item._id.month - 1].count = item.count;
                });

            return { year, months };
        });

        // 5. Response
        res.status(200).json({
            totalOrders,
            ordersByYear: resultByYear,
            ordersStatusByYearMonth: resultStatusByYear
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
