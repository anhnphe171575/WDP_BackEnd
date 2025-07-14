const Order = require('../models/order');
const OrderItem = require('../models/orderItem');
const Voucher = require('../models/voucher')
const Product = require('../models/product')
const ProductVariant = require('../models/productVariant')
const Attribute = require('../models/attribute')
const ImportBatch = require('../models/import_batches');
const Notification = require('../models/notificationModel');
const User = require('../models/userModel');
const { getIO } = require('../config/socket.io');

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
            .populate('voucher').sort({ createAt: -1 });
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
        if(status === 'processing') {
            const notification = new Notification({
                orderId: order.id,
                userId: order.userId,
                title: 'Trạng thái đơn hàng',
                description: 'Đơn hàng của bạn đang được xử lý.',
                type: 'order',
            });
            await notification.save();
            // Emit notification qua socket.io
            try {
                const io = getIO();
                io.to(order.userId.toString()).emit('notification', notification);
            } catch (e) {
                console.error('Socket emit error:', e);
            }
        }
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

        console.log(order);
        
        res.status(200).json({ message: 'Order deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getOrdersDashboard = async (req, res) => {
    try {
        const totalOrders = await Order.countDocuments();

        // Danh sách status cố định
        const allStatuses = ["pending","processing", "shipping", "cancelled", "completed"];

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
        console.log(orderId)

        // Kiểm tra order tồn tại
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        const orderItem = await OrderItem.findById(orderItemId);
        if (!orderItem) {
            return res.status(404).json({ message: 'Order item not found' });
        }

        // Kiểm tra orderItem có thuộc order không
        if (!order.OrderItems.includes(orderItemId)) {
            return res.status(400).json({ message: 'Order item does not belong to this order' });
        }

        // Chỉ xử lý các item đang ở trạng thái 'returned-requested'
        if (orderItem.status !== 'returned-requested') {
            return res.status(400).json({ message: `Order item is not in 'returned-requested' state.`});
        }
        
        orderItem.status = 'returned';
        orderItem.returnedAt = Date.now();

        // Hoàn lại số lượng hàng đã yêu cầu trả vào kho
        if (orderItem.returnRequestedQuantity && orderItem.returnRequestedQuantity > 0) {        
            if (orderItem.productVariant) {
                const latestBatch = await ImportBatch.findOne({ variantId: orderItem.productVariant })
                    .sort({ importDate: 1 });
                if (latestBatch) {
                    latestBatch.quantity += orderItem.returnRequestedQuantity;
                    await latestBatch.save();
                }
            }
        }
        await orderItem.save();

        // Kiểm tra xem tất cả các orderItems trong đơn hàng đã được trả hết chưa
        const allOrderItems = await OrderItem.find({ _id: { $in: order.OrderItems } });
        const allReturned = allOrderItems.every(item => item.status === 'returned');
        
        if (allReturned) {
            order.status = 'returned';
            await order.save();
        }

        // Gửi thông báo tới user
        const notification = new Notification({
            orderId: order.id,
            userId: order.userId,
            title: 'Trạng thái đơn hàng',
            description: `Một sản phẩm trong đơn hàng của bạn đã được xác nhận trả hàng thành công.`,
            type: 'order',
        });
        await notification.save();
        // Emit notification qua socket.io
        try {
            const io = getIO();
            io.to(order.userId.toString()).emit('notification', notification);
        } catch (e) {
            console.error('Socket emit error:', e);
        }

        res.status(200).json({ 
            message: 'Order item status updated successfully to returned.', 
            orderItem,
            orderStatus: order.status
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
// request return order item
exports.requestReturnOrderItem = async (req, res) => {
    try {
        const orderId = req.params.id;
        const { reason, items } = req.body; // items is an array of { orderItemId, returnQuantity }
        console.log(req.body);
        
        // Validate input
        if (!reason || !items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ message: 'Lý do và danh sách sản phẩm cần trả là bắt buộc.' });
        }

        const updatedOrderItems = [];
        const errorMessages = [];

        const order = await Order.findById(orderId).lean();
        if (!order) {
            return res.status(404).json({ message: 'Không tìm thấy đơn hàng.' });
        }
        const orderItemIdsInOrder = order.OrderItems.map(item => item.toString());

        for (const item of items) {
            const { orderItemId, returnQuantity } = item;

            if (!orderItemId || !returnQuantity || Number(returnQuantity) <= 0) {
                errorMessages.push(`Dữ liệu không hợp lệ cho một trong các sản phẩm.`);
                continue; 
            }
            
            if (!orderItemIdsInOrder.includes(orderItemId)) {
                errorMessages.push(`Sản phẩm với ID ${orderItemId} không thuộc đơn hàng này.`);
                continue;
            }

            const orderItem = await OrderItem.findById(orderItemId);

            if (!orderItem) {
                errorMessages.push(`Không tìm thấy sản phẩm trong đơn hàng với ID ${orderItemId}.`);
                continue;
            }

            if (orderItem.status === 'returned-requested' || orderItem.status === 'returned') {
                errorMessages.push(`Sản phẩm ${orderItemId} đã được yêu cầu trả hoặc đã được trả.`);
                continue;
            }
            
            if (Number(returnQuantity) > orderItem.quantity) {
                 errorMessages.push(`Số lượng trả của sản phẩm ${orderItemId} lớn hơn số lượng đã mua.`);
                 continue;
            }

            // Update the status to 'returned-requested'
            orderItem.status = 'returned-requested';
            orderItem.reason = reason;
            orderItem.returnRequestedQuantity = Number(returnQuantity);
            orderItem.returnRequestedAt = Date.now();
            
            await orderItem.save();
            updatedOrderItems.push(orderItem);
        }
       
        if (errorMessages.length > 0 && updatedOrderItems.length === 0) {
             return res.status(400).json({ 
                message: 'Yêu cầu của bạn có lỗi, không có sản phẩm nào được cập nhật.', 
                errors: errorMessages,
            });
        }
        
        res.status(200).json({ 
            message: 'Yêu cầu trả hàng đã được gửi thành công.', 
            updatedOrderItems,
            errors: errorMessages.length > 0 ? errorMessages : undefined
        });
         
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}
exports.updateBulkStatus= async(req, res)=>{
    try {
        const { orderIds, status } = req.body;

        if (!orderIds || !status || !Array.isArray(orderIds) || orderIds.length === 0) {
            return res.status(400).json({ message: 'Yêu cầu không hợp lệ, vui lòng cung cấp orderIds và status.' });
        }
        

        if (status === 'cancelled') {
            const orders = await Order.find({ _id: { $in: orderIds } }).populate('OrderItems');

            for (const order of orders) {
                // Chỉ xử lý các đơn hàng chưa bị hủy
                if (order.status !== 'cancelled') {
                    for (const item of order.OrderItems) {
                        if (item.productVariant) {
                            const latestBatch = await ImportBatch.findOne({ variantId: item.productVariant })
                                .sort({ importDate: -1 });
                            if (latestBatch) {
                                latestBatch.quantity += item.quantity;
                                await latestBatch.save();
                            }
                        }
                    }
                }
            }
        }

        const result = await Order.updateMany(
            { _id: { $in: orderIds } },
            { $set: { status: status, updateAt: Date.now() } }
        );

        res.status(200).json({ message: `Đã cập nhật ${result.modifiedCount} đơn hàng thành công.` });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
}
exports.requestCancelledOrderItem = async(req,res)=>{
    try {
        const orderId = req.params.id;
        const { reason, items } = req.body; // items is an array of { orderItemId, cancelQuantity }

        if (!reason || !items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ message: 'Lý do và danh sách sản phẩm cần hủy là bắt buộc.' });
        }

        const updatedOrderItems = [];
        const errorMessages = [];

        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ message: 'Không tìm thấy đơn hàng.' });
        }
        const orderItemIdsInOrder = order.OrderItems.map(item => item.toString());

        for (const item of items) {
            const { orderItemId, cancelQuantity } = item;

            if (!orderItemId || !cancelQuantity || Number(cancelQuantity) <= 0) {
                errorMessages.push(`Dữ liệu không hợp lệ cho sản phẩm ID ${orderItemId}.`);
                continue;
            }
            
            if (!orderItemIdsInOrder.includes(orderItemId)) {
                errorMessages.push(`Sản phẩm với ID ${orderItemId} không thuộc đơn hàng này.`);
                continue;
            }

            const orderItem = await OrderItem.findById(orderItemId);

            if (!orderItem) {
                errorMessages.push(`Không tìm thấy sản phẩm trong đơn hàng với ID ${orderItemId}.`);
                continue;
            }
            
            // Allow cancellation only for items that have not been cancelled or returned
            if (['cancelled', 'returned', 'returned-requested'].includes(orderItem.status)) {
                errorMessages.push(`Sản phẩm ${orderItemId} đã được xử lý (hủy/trả) và không thể hủy.`);
                continue;
            }

            // Return stock to the OLDEST import batch
            if (orderItem.productVariant) {
                const oldestBatch = await ImportBatch.findOne({ variantId: orderItem.productVariant }).sort({ importDate: 1 });
                if (oldestBatch) {
                    oldestBatch.quantity += Number(orderItem.quantity);
                    await oldestBatch.save();
                } else {
                    errorMessages.push(`Không tìm thấy lô hàng cho sản phẩm ${orderItemId} để cập nhật kho.`);
                    continue; // Skip this item if no batch found
                }
            }
            
            orderItem.status = 'cancelled';
            orderItem.reason = reason;
            // Assuming partial cancellation is not supported for simplicity, 
            // or if it is, this reflects the cancelled amount.
            orderItem.cancelRequestedQuantity = (orderItem.quantity || 0) 
            
            await orderItem.save();
            updatedOrderItems.push(orderItem);
        }
       
        if (errorMessages.length > 0 && updatedOrderItems.length === 0) {
             return res.status(400).json({ 
                message: 'Yêu cầu của bạn có lỗi, không có sản phẩm nào được cập nhật.', 
                errors: errorMessages,
            });
        }
        
        // Check if all items in the order are now cancelled or returned
        const allOrderItems = await OrderItem.find({ _id: { $in: order.OrderItems } });
        const allItemsFinalized = allOrderItems.every(item => ['cancelled', 'returned'].includes(item.status));

        if (allItemsFinalized) {
            order.status = 'cancelled'; // Or a more appropriate status like 'completed_with_returns_cancellations'
            await order.save();
        }
        const countOrderCancelledByUser = await Order.countDocuments({ userId: order.userId, status: 'cancelled' });
        console.log(countOrderCancelledByUser);
        if (countOrderCancelledByUser > 3) {
            await User.findByIdAndUpdate(order.userId, {
                $set: { role: -1, bannedUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }
            });
        }else if (countOrderCancelledByUser === 3) {
            // send notification to user
            const notification = new Notification({
                orderId: order.id,
                userId: order.userId,
                title: 'Trạng thái đơn hàng',
                description: `Bạn đã hủy 3 đơn hàng, vui lòng không hủy đơn hàng nữa.Nếu không sẽ bị cấm 1 tháng`,
                type: 'order',
            });
            await notification.save();
            // Emit notification qua socket.io
            try {
                const io = getIO();
                io.to(order.userId.toString()).emit('notification', notification);
            } catch (e) {
                console.error('Socket emit error:', e);
            }
        } 
        res.status(200).json({ 
            message: 'Hủy sản phẩm thành công.', 
            updatedOrderItems,
            orderStatus: order.status,
            errors: errorMessages.length > 0 ? errorMessages : undefined
        });
         
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

// Reject an order return request
exports.rejectReturnRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        if (!reason) {
            return res.status(400).json({ message: 'Reason for rejection is required.' });
        }

        const order = await Order.findById(id).populate('OrderItems');

        if (!order) {
            return res.status(404).json({ message: 'Order not found.' });
        }

        const itemsToReject = order.OrderItems.filter(item => item.status === 'returned-requested');

        if (itemsToReject.length === 0) {
            return res.status(400).json({ message: 'No return request found for this order.' });
        }

        for (const item of itemsToReject) {
            await OrderItem.findByIdAndUpdate(item._id, {
                status: 'completed',
                reason: `Return rejected: ${reason}`,
                returnRequestedQuantity: 0,
                returnRequestedAt: null
            });
        }
        
        order.status = 'reject-return';
        order.reasonRejectCancel = reason;
        order.updateAt = Date.now();

        await order.save();

        const updatedOrder = await Order.findById(id).populate({
            path: 'OrderItems',
            populate: {
                path: 'productId',
                select: 'name'
            }
        });

        res.status(200).json({
            message: 'Order return request rejected successfully.',
            order: updatedOrder
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get order by user ID
exports.getOrderByUserId = async (req, res) => {
    try {
        const orders = await Order.find({ userId: req.params.userId })
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

// Get total revenue
exports.getTotalRevenue = async (req, res) => {
    try {
        // Tính tổng doanh thu từ các đơn hàng đã hoàn thành
        const totalRevenue = await Order.aggregate([
            {
                $match: {
                    status: 'completed'
                }
            },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: '$total' },
                    orderCount: { $sum: 1 }
                }
            }
        ]);

        // Tính doanh thu theo từng tháng trong năm hiện tại
        const currentYear = new Date().getFullYear();
        const revenueByMonth = await Order.aggregate([
            {
                $match: {
                    status: 'completed',
                    createAt: {
                        $gte: new Date(currentYear, 0, 1),
                        $lt: new Date(currentYear + 1, 0, 1)
                    }
                }
            },
            {
                $group: {
                    _id: { $month: '$createAt' },
                    monthlyRevenue: { $sum: '$total' },
                    orderCount: { $sum: 1 }
                }
            },
            {
                $sort: { '_id': 1 }
            }
        ]);

        // Tính doanh thu theo từng năm
        const revenueByYear = await Order.aggregate([
            {
                $match: {
                    status: 'completed'
                }
            },
            {
                $group: {
                    _id: { $year: '$createAt' },
                    yearlyRevenue: { $sum: '$total' },
                    orderCount: { $sum: 1 }
                }
            },
            {
                $sort: { '_id': 1 }
            }
        ]);

        // Tính doanh thu theo trạng thái đơn hàng
        const revenueByStatus = await Order.aggregate([
            {
                $group: {
                    _id: '$status',
                    revenue: { $sum: '$total' },
                    orderCount: { $sum: 1 }
                }
            },
            {
                $sort: { 'revenue': -1 }
            }
        ]);

        // Tính doanh thu của tháng hiện tại
        const currentMonth = new Date().getMonth();
        const currentMonthRevenue = await Order.aggregate([
            {
                $match: {
                    status: 'completed',
                    createAt: {
                        $gte: new Date(currentYear, currentMonth, 1),
                        $lt: new Date(currentYear, currentMonth + 1, 1)
                    }
                }
            },
            {
                $group: {
                    _id: null,
                    currentMonthRevenue: { $sum: '$total' },
                    orderCount: { $sum: 1 }
                }
            }
        ]);

        // Tính doanh thu của tháng trước
        const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        const previousMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
        const previousMonthRevenue = await Order.aggregate([
            {
                $match: {
                    status: 'completed',
                    createAt: {
                        $gte: new Date(previousMonthYear, previousMonth, 1),
                        $lt: new Date(previousMonthYear, previousMonth + 1, 1)
                    }
                }
            },
            {
                $group: {
                    _id: null,
                    previousMonthRevenue: { $sum: '$total' },
                    orderCount: { $sum: 1 }
                }
            }
        ]);

        const result = {
            totalRevenue: totalRevenue[0]?.totalRevenue || 0,
            totalOrderCount: totalRevenue[0]?.orderCount || 0,
            currentMonthRevenue: currentMonthRevenue[0]?.currentMonthRevenue || 0,
            currentMonthOrderCount: currentMonthRevenue[0]?.orderCount || 0,
            previousMonthRevenue: previousMonthRevenue[0]?.previousMonthRevenue || 0,
            previousMonthOrderCount: previousMonthRevenue[0]?.orderCount || 0,
            revenueByMonth: revenueByMonth,
            revenueByYear: revenueByYear,
            revenueByStatus: revenueByStatus
        };

        // Tính phần trăm tăng trưởng so với tháng trước
        if (result.previousMonthRevenue > 0) {
            let growth = ((result.currentMonthRevenue - result.previousMonthRevenue) / result.previousMonthRevenue * 100).toFixed(2);
            // Nếu growth là -100.00 thì trả về 0
            result.monthlyGrowthPercentage = (growth === "-100.00" || growth === -100 || growth === -100.00) ? 0 : growth;
        } else {
            result.monthlyGrowthPercentage = 0;
        }

        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get import recommendations based on inventory and sales
exports.getRecommendImports = async (req, res) => {
    try {
        // Lấy tất cả sản phẩm với thông tin chi tiết
        const products = await Product.find()
            .populate({
                path: 'category',
                select: 'name'
            });

        const recommendations = [];

        for (const product of products) {
            // Lấy tất cả variants của sản phẩm
            const variants = await ProductVariant.find({ product_id: product._id })
                .populate({
                    path: 'attribute',
                    select: 'value description'
                });

            for (const variant of variants) {
                // Tính tồn kho hiện tại của variant
                const importBatches = await ImportBatch.find({ variantId: variant._id });
                const currentStock = importBatches.reduce((total, batch) => total + batch.quantity, 0);
                

                // Tính doanh số trung bình/tháng của variant này
                const MonthsAgo = new Date();
                MonthsAgo.setMonth(MonthsAgo.getMonth() - 1);

                const salesData = await Order.aggregate([
                    {
                        $match: {
                            status: 'completed',
                            createAt: { $gte: MonthsAgo }
                        }
                    },
                    {
                        $unwind: '$OrderItems'
                    },
                    {
                        $lookup: {
                            from: 'orderitems',
                            localField: 'OrderItems',
                            foreignField: '_id',
                            as: 'orderItemDetails'
                        }
                    },
                    {
                        $unwind: '$orderItemDetails'
                    },
                    {
                        $match: {
                            'orderItemDetails.productVariant': variant._id
                        }
                    },
                    {
                        $group: {
                            _id: {
                                year: { $year: '$createAt' },
                                month: { $month: '$createAt' }
                            },
                            monthlySales: { $sum: '$orderItemDetails.quantity' }
                        }
                    },
                    {
                        $sort: { '_id.year': 1, '_id.month': 1 }
                    }
                ]);

                // Tính doanh số trung bình/tháng
                let averageMonthlySales = 0;
                if (salesData.length > 0) {
                    const totalSales = salesData.reduce((sum, data) => sum + data.monthlySales, 0);
                    averageMonthlySales = Math.round(totalSales / salesData.length);
                }

                // Kiểm tra điều kiện đề xuất nhập
                const shouldImport = currentStock < (averageMonthlySales * 0.5);
                
                const suggestedQuantity = shouldImport ? Math.max(0, averageMonthlySales - currentStock) : 0;

                // Tạo tên sản phẩm với thông tin variant
                let productName = product.name;
                let attributeNames = '';
                if (variant.attribute && variant.attribute.length > 0) {
                    attributeNames = variant.attribute.map(attr => attr.value).join(' - ');
                    productName += ` (${attributeNames})`;
                }

                recommendations.push({
                    productId: product._id,
                    variantId: variant._id,
                    img: variant.images && variant.images.length > 0 ? variant.images[0].url : null,
                    productName: productName,
                    currentStock: currentStock,
                    averageMonthlySales: averageMonthlySales,
                    shouldImport: shouldImport,
                    attributeNames: attributeNames,
                    suggestedQuantity: suggestedQuantity,
                    category: product.category.map(cat => cat.name).join(', '),
                    brand: product.brand
                });
            }
        }

        // Lọc chỉ lấy những sản phẩm cần nhập (shouldImport = true)
        const filteredRecommendations = recommendations.filter(r => r.shouldImport);

        // Sắp xếp theo suggestedQuantity giảm dần
        filteredRecommendations.sort((a, b) => b.suggestedQuantity - a.suggestedQuantity);

        // Thống kê tổng quan
        const totalProducts = recommendations.length;
        const productsNeedImport = filteredRecommendations.length;
        const totalSuggestedQuantity = filteredRecommendations.reduce((sum, r) => sum + r.suggestedQuantity, 0);

        res.status(200).json({
            summary: {
                totalProducts,
                productsNeedImport,
                totalSuggestedQuantity
            },
            recommendations: filteredRecommendations
        });

    } catch (error) {
        console.error('Error in getRecommendImports:', error);
        res.status(500).json({ message: error.message });
    }
};


