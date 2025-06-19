const Order = require('../models/order');
const OrderItem = require('../models/orderItem');
const Voucher = require('../models/voucher')
const Product = require('../models/product')
const ProductVariant = require('../models/productVariant')
const Attribute = require('../models/attribute')
const ImportBatch = require('../models/import_batches');

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

        if(status == 'cancelled') {
            // Return stock for each product in the order
            const order = await Order.findById(req.params.id).populate('OrderItems');
            if (!order) {
                return res.status(404).json({ message: 'Order not found' });
            }
            let orderItemsId = [];
            for (const item of order.OrderItems) {
                orderItemsId.push(item);
            }
            const orderItems = await OrderItem.find({ _id: { $in: orderItemsId } });
            for (const item of orderItems) {
                // Update stock for import_batches: cộng vào batch mới nhất của variant
                if (item.productVariant) {
                    // Tìm batch mới nhất của variant này
                    const latestBatch = await ImportBatch.findOne({ variantId: item.productVariant })
                        .sort({ importDate: -1 });
                    if (latestBatch) {
                        latestBatch.quantity += item.quantity;
                        await latestBatch.save();
                    }
                }
            }
        }
        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }
        order.status = status || order.status;
        order.paymentMethod = paymentMethod || order.paymentMethod;
        order.voucher = voucher || order.voucher;
        order.updateAt = Date.now();
        await order.save();
        res.status(200).json(order);
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
// edit status of orderItem
exports.editOrderItemStatus = async (req, res) => {
    try {
        const orderId = req.params.id;
        const orderItemId = req.params.orderItemId;
        // Lấy quantity từ body
        const { quantity } = req.body;

        // Find the order item
        const orderItem = await OrderItem.findById(orderItemId);
        if (!orderItem) {
            return res.status(404).json({ message: 'Order item not found' });
        }   
        // Update the status
        orderItem.status = 'returned';
        if (quantity && Number(quantity) > 0) {        
            // Update stock for import_batches: cộng vào batch mới nhất của variant
            if (orderItem.productVariant) {
                const latestBatch = await ImportBatch.findOne({ variantId: orderItem.productVariant })
                    .sort({ importDate: -1 });
                if (latestBatch) {
                    latestBatch.quantity += Number(quantity);
                    await latestBatch.save();
                }
            }
        }
        await orderItem.save();
        res.status(200).json({ message: 'Order item status updated successfully', orderItem });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
// request return order item
exports.requestReturnOrderItem = async (req, res) => {
    try {
        const orderId = req.params.id;
        const orderItemId = req.params.orderItemId;
        const { reason } = req.body;

        // Validate input
        if (!reason) {
            return res.status(400).json({ message: 'Reason for return is required' });
        }

        // Find the order item
        const orderItem = await OrderItem.findById(orderItemId);
        if (!orderItem) {
            return res.status(404).json({ message: 'Order item not found' });
        }
        // Check if the order item is already returned or return requested
        if ( orderItem.status === 'returned-requested') {
            return res.status(400).json({ message: 'Order item has already been returned or return requested' });
        }
        // Update the status to 'returned-requested'
        orderItem.status = 'returned-requested';
        orderItem.reason = reason;
        orderItem.returnRequestedAt = Date.now();
        await orderItem.save();
        res.status(200).json({ message: 'Return request submitted successfully', orderItem });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}
