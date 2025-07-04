const Order = require('../models/order');
const OrderItem = require('../models/orderItem');
const Product = require('../models/product');
const ProductVariant = require('../models/productVariant');
const ImportBatch = require('../models/import_batches');

// Hàm tính tổng giá vốn theo phương pháp FIFO từ import_batches
async function calculateCostFIFO(variantId, quantityNeeded) {
  let totalCost = 0;
  let quantityLeft = quantityNeeded;
  // Lấy các lô nhập theo thứ tự cũ nhất trước
  const batches = await ImportBatch.find({ variantId }).sort({ importDate: 1 });
  for (const batch of batches) {
    if (quantityLeft <= 0) break;
    const usedQty = Math.min(batch.quantity, quantityLeft);
    totalCost += usedQty * batch.costPrice;
    quantityLeft -= usedQty;
  }
  return totalCost;
}

// Thống kê doanh thu và lãi theo sản phẩm
const getProductRevenueStatistics = async (req, res) => {
  try {
    const { startDate, endDate, limit = 10, sortBy = 'revenue' } = req.query;
    
    // Tạo filter cho ngày
    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter = {
        createAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };
    }

    // Lấy tất cả order đã hoàn thành trong khoảng thời gian
    const completedOrders = await Order.find({
      status: 'completed',
      ...dateFilter
    }).populate('OrderItems');

    // Tạo map để lưu thống kê theo sản phẩm
    const productStats = new Map();

    // Duyệt qua từng order
    for (const order of completedOrders) {
      for (const orderItemId of order.OrderItems) {
        const orderItem = await OrderItem.findById(orderItemId).populate('productId productVariant');
        
        if (orderItem && orderItem.status === 'completed') {
          const productId = orderItem.productId._id.toString();
          const productName = orderItem.productId.name;
          const quantity = orderItem.quantity;
          const revenue = orderItem.price * quantity;
          // Lấy giá vốn thực tế từ import_batches theo FIFO
          let cost = 0;
          if (orderItem.productVariant) {
            cost = await calculateCostFIFO(orderItem.productVariant._id, quantity);
          }
          const profit = revenue - cost;

          if (productStats.has(productId)) {
            const existing = productStats.get(productId);
            existing.totalQuantity += quantity;
            existing.totalRevenue += revenue;
            existing.totalCost += cost;
            existing.totalProfit += profit;
            existing.orderCount += 1;
          } else {
            productStats.set(productId, {
              productId,
              productName,
              totalQuantity: quantity,
              totalRevenue: revenue,
              totalCost: cost,
              totalProfit: profit,
              orderCount: 1,
              profitMargin: cost > 0 ? ((revenue - cost) / revenue * 100) : 0
            });
          }
        }
      }
    }

    // Chuyển map thành array và tính profit margin
    let statistics = Array.from(productStats.values()).map(stat => ({
      ...stat,
      profitMargin: stat.totalRevenue > 0 ? (stat.totalProfit / stat.totalRevenue * 100) : 0
    }));

    // Sắp xếp theo tiêu chí
    switch (sortBy) {
      case 'revenue':
        statistics.sort((a, b) => b.totalRevenue - a.totalRevenue);
        break;
      case 'profit':
        statistics.sort((a, b) => b.totalProfit - a.totalProfit);
        break;
      case 'quantity':
        statistics.sort((a, b) => b.totalQuantity - a.totalQuantity);
        break;
      case 'profitMargin':
        statistics.sort((a, b) => b.profitMargin - a.profitMargin);
        break;
      default:
        statistics.sort((a, b) => b.totalRevenue - a.totalRevenue);
    }

    // Giới hạn số lượng kết quả
    statistics = statistics.slice(0, parseInt(limit));

    // Tính tổng thống kê
    const totalStats = {
      totalRevenue: statistics.reduce((sum, item) => sum + item.totalRevenue, 0),
      totalProfit: statistics.reduce((sum, item) => sum + item.totalProfit, 0),
      totalQuantity: statistics.reduce((sum, item) => sum + item.totalQuantity, 0),
      averageProfitMargin: statistics.length > 0 
        ? statistics.reduce((sum, item) => sum + item.profitMargin, 0) / statistics.length 
        : 0
    };

    res.json({
      success: true,
      data: {
        products: statistics,
        summary: totalStats,
        period: {
          startDate: startDate || null,
          endDate: endDate || null
        }
      }
    });

  } catch (error) {
    console.error('Error in getProductRevenueStatistics:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Thống kê doanh thu theo thời gian
const getRevenueByTime = async (req, res) => {
  try {
    const { period = 'month', startDate, endDate } = req.query;
    
    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter = {
        createAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };
    }

    const completedOrders = await Order.find({
      status: 'completed',
      ...dateFilter
    });

    const revenueByTime = {};
    
    completedOrders.forEach(order => {
      let timeKey;
      const orderDate = new Date(order.createAt);
      
      switch (period) {
        case 'day':
          timeKey = orderDate.toISOString().split('T')[0];
          break;
        case 'week':
          const weekStart = new Date(orderDate);
          weekStart.setDate(orderDate.getDate() - orderDate.getDay());
          timeKey = weekStart.toISOString().split('T')[0];
          break;
        case 'month':
        default:
          timeKey = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}`;
          break;
      }

      if (revenueByTime[timeKey]) {
        revenueByTime[timeKey] += order.total;
      } else {
        revenueByTime[timeKey] = order.total;
      }
    });

    const result = Object.entries(revenueByTime).map(([time, revenue]) => ({
      time,
      revenue
    })).sort((a, b) => a.time.localeCompare(b.time));

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Error in getRevenueByTime:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Thống kê sản phẩm bán chậm (ít doanh thu nhất)
const getLowRevenueProducts = async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    const completedOrders = await Order.find({ status: 'completed' }).populate('OrderItems');
    
    const productStats = new Map();

    for (const order of completedOrders) {
      for (const orderItemId of order.OrderItems) {
        const orderItem = await OrderItem.findById(orderItemId).populate('productId productVariant');
        
        if (orderItem && orderItem.status === 'completed') {
          const productId = orderItem.productId._id.toString();
          const productName = orderItem.productId.name;
          const quantity = orderItem.quantity;
          const revenue = orderItem.price * quantity;
          // Lấy giá vốn thực tế từ import_batches theo FIFO
          let cost = 0;
          if (orderItem.productVariant) {
            cost = await calculateCostFIFO(orderItem.productVariant._id, quantity);
          }
          const profit = revenue - cost;

          if (productStats.has(productId)) {
            const existing = productStats.get(productId);
            existing.totalQuantity += quantity;
            existing.totalRevenue += revenue;
            existing.totalCost += cost;
            existing.totalProfit += profit;
            existing.orderCount += 1;
          } else {
            productStats.set(productId, {
              productId,
              productName,
              totalQuantity: quantity,
              totalRevenue: revenue,
              totalCost: cost,
              totalProfit: profit,
              orderCount: 1
            });
          }
        }
      }
    }

    let statistics = Array.from(productStats.values()).map(stat => ({
      ...stat,
      profitMargin: stat.totalRevenue > 0 ? (stat.totalProfit / stat.totalRevenue * 100) : 0
    }));

    // Sắp xếp theo doanh thu thấp nhất
    statistics.sort((a, b) => a.totalRevenue - b.totalRevenue);
    statistics = statistics.slice(0, parseInt(limit));

    res.json({
      success: true,
      data: statistics
    });

  } catch (error) {
    console.error('Error in getLowRevenueProducts:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

module.exports = {
  getProductRevenueStatistics,
  getRevenueByTime,
  getLowRevenueProducts
}; 