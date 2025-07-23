const express = require("express");
const router = express.Router();
const payOS = require("../utils/payos");
const OrderModel = require("../models/order");
const ProductVariant = require("../models/productVariant");
const Order = require("../models/order");
const OrderItem = require("../models/orderItem");
const Cart = require("../models/cart");
const CartItem = require("../models/cartItem");
const ImportBatch = require("../models/import_batches");
const User = require("../models/userModel");
const Voucher = require("../models/voucher");
const VoucherUser = require("../models/voucherUser");
const { ROLES } = require("../config/role");

// Helper function to find the best order manager
async function findBestOrderManager() {
  const ORDER_MANAGER = ROLES.ORDER_MANAGER;
  // Lấy tất cả order managers
  const orderManagers = await User.find({ role: ORDER_MANAGER });
  if (orderManagers.length === 0) return null;
  const managerIds = orderManagers.map(m => m._id);
  // Đếm số lượng order của từng manager (status khác 'cancelled')
  const orderStats = await OrderModel.aggregate([
    { $match: { OrderManagerId: { $in: managerIds }, status: { $ne: 'cancelled', $ne: 'completed' } } },
    { $group: { _id: "$OrderManagerId", orderCount: { $sum: 1 } } }
  ]);
  // Map OrderManagerId -> số lượng order
  const statsMap = new Map();
  orderStats.forEach(stat => {
    statsMap.set(String(stat._id), stat.orderCount);
  });
  // Gắn số lượng order vào từng manager
  const managersWithStats = orderManagers.map(m => {
    return {
      user: m,
      orderCount: statsMap.get(String(m._id)) || 0
    };
  });
  // Tìm số lượng order ít nhất
  const minCount = Math.min(...managersWithStats.map(m => m.orderCount));
  // Lọc ra các manager có số lượng order ít nhất
  const candidates = managersWithStats.filter(m => m.orderCount === minCount);
  // Random chọn 1 người trong số đó
  const selected = candidates[Math.floor(Math.random() * candidates.length)];
  return selected.user;
}

exports.createPayment = async (req, res) => {
  const userId = req.user.id;    
    const {  addressId, amount, shippingMethod, paymentMethod, items,rebuyItems,voucherId,orderManagerId} = req.body;
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    const timestamp = Date.now() % 1000000; 
    const orderCode = Number(`${timestamp}${randomNum}`.slice(-9)); 
    console.log(req.body)
    const body = {
        orderCode,
        amount: amount,
        description: 'Thanh toan don hang',
        returnUrl: `http://localhost:3000/payment/result?items=${encodeURIComponent(JSON.stringify(items))}&addressId=${encodeURIComponent(addressId)}&amount=${encodeURIComponent(amount)}&shippingMethod=${encodeURIComponent(shippingMethod)}&paymentMethod=${encodeURIComponent(paymentMethod)}&rebuyItems=${encodeURIComponent(JSON.stringify(rebuyItems))}&voucherId=${encodeURIComponent(voucherId)}&orderManagerId=${encodeURIComponent(orderManagerId)}`,
        cancelUrl: `http://localhost:3000/payment/result`   
    };
    try {
        const paymentLinkResponse = await payOS.createPaymentLink(body);
        res.json({
            error: 0,
            message: "ok",
            url: paymentLinkResponse.checkoutUrl
        });
    } catch (error) {
        console.error(error);
        res.send('Something went error');
    }
};

exports.callback = async (req, res) => {
  try {
    const { items, addressId, amount, shippingMethod, paymentMethod, code, cancel, status, orderCode, rebuyItems,voucherId,orderManagerId } = req.body;
    const userId = req.user?.id || req.body.userId; // Lấy userId từ req nếu có

    // Parse items từ JSON string nếu cần
    let parsedItems = items;
    if (typeof items === 'string') {
      try {
        parsedItems = JSON.parse(items);
      } catch (error) {
        console.error('Error parsing items JSON:', error);
        return res.status(400).json({ message: "Invalid items format" });
      }
    }

    // Parse rebuyItems từ JSON string nếu cần
    let parsedRebuyItems = rebuyItems;
    if (typeof rebuyItems === 'string') {
      try {
        parsedRebuyItems = JSON.parse(rebuyItems);
      } catch (error) {
        console.error('Error parsing rebuyItems JSON:', error);
        parsedRebuyItems = [];
      }
    }
    // Đảm bảo parsedRebuyItems là array
    if (!Array.isArray(parsedRebuyItems)) {
        parsedRebuyItems = [parsedRebuyItems];
    }

    if (code === "00" && status === "PAID" && cancel === "false") {
      console.log("aaa");
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      // Tìm address theo addressId
      const addressObj = user.address.id(addressId);
      if (!addressObj) {
        return res.status(404).json({ message: "Address not found" });
      }

      // Lấy thông tin các cart item
      const cartItemIds = parsedItems.map(item => item.cartItemId);
      const cartItems = await CartItem.find({ _id: { $in: cartItemIds } });

      // Tạo các OrderItem
      const orderItemIds = [];
      for (const cartItem of cartItems) {
        // Lấy thông tin product variant để biết giá
        const productVariant = await ProductVariant.findById(cartItem.productVariantId);
        if (!productVariant) {
          return res.status(404).json({ message: `Product variant not found: ${cartItem.productVariantId}` });
        }

        // Trừ số lượng từ các lô nhập cũ nhất
        const importBatches = await ImportBatch.find({ variantId: cartItem.productVariantId })
          .sort({ importDate: 1 }); // Sắp xếp theo ngày nhập, cũ nhất trước

        let remainingQuantity = cartItem.quantity;
        for (const batch of importBatches) {
          if (remainingQuantity <= 0) break;
          
          if (batch.quantity > 0) {
            const quantityToDeduct = Math.min(batch.quantity, remainingQuantity);
            batch.quantity -= quantityToDeduct;
            remainingQuantity -= quantityToDeduct;
            await batch.save();
          }
        }

        if (remainingQuantity > 0) {
          return res.status(400).json({ 
            message: `Insufficient stock for product variant: ${cartItem.productVariantId}` 
          });
        }

        const orderItem = new OrderItem({
          productId: cartItem.productId,
          productVariant: cartItem.productVariantId,
          quantity: cartItem.quantity,
          price: productVariant.sellPrice || 0
        });
        await orderItem.save();
        orderItemIds.push(orderItem._id);
      }
      // Only fetch voucherUser if voucherId is valid
      let voucherUser = null;
      if (voucherId && typeof voucherId === "string" && voucherId.trim() !== "") {
        voucherUser = await VoucherUser.findById(voucherId);
      }

      // Tạo Order mới
      const bestOrderManager = await findBestOrderManager();
      if (!bestOrderManager) {
        return res.status(500).json({ message: "No order manager available" });
      }
      const newOrder = new OrderModel({
        userId: userId,
        OrderManagerId: bestOrderManager._id,
        OrderItems: orderItemIds, 
        total: amount,
        paymentMethod: paymentMethod,
        address: addressObj,
        voucher: voucherUser && voucherUser.voucherId ? [voucherUser.voucherId] : []
      });
      await newOrder.save();

      // Nếu có voucherId thì cập nhật trạng thái voucher
      if (voucherId && typeof voucherId === "string" && voucherId.trim() !== "") {
        const voucherUser = await VoucherUser.findByIdAndUpdate(
          voucherId,  
          { used: true, usedAt: new Date() }
        );
        console.log("voucherUser:", voucherUser);
        // Update Voucher: increment usedCount
        if (voucherUser && voucherUser.voucherId) {
          await Voucher.findByIdAndUpdate(
            voucherUser.voucherId,
            { $inc: { usedCount: 1 } }
          );
        }
      }

      // Xác định các cart item cần xóa (loại trừ rebuyItems)
      const cartItemsToDelete = Array.isArray(parsedRebuyItems) && parsedRebuyItems.length > 0
        ? cartItemIds.filter(id => !parsedRebuyItems.includes(id.toString()))
        : cartItemIds;
    
      // Xóa các cart item khỏi CartItem (chỉ những item không trong rebuyItems)
      if (cartItemsToDelete.length > 0) {
        await CartItem.deleteMany({ _id: { $in: cartItemsToDelete } });

        // Xóa các cart item khỏi Cart của user (chỉ những item không trong rebuyItems)
        await Cart.updateOne(
          { userId: userId },
          { $pull: { cartItems: { $in: cartItemsToDelete } } }
        );
      }

      return res.status(200).json({
        error: 0,
        message: "Order created and payment successful",
        order: newOrder
      });
    } else if (paymentMethod === "cod") {
      console.log("bbb");
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      // Tìm address theo addressId
      const addressObj = user.address.id(addressId);
      if (!addressObj) {
        return res.status(404).json({ message: "Address not found" });
      }

      // Lấy thông tin các cart item
      const cartItemIds = parsedItems.map(item => item.cartItemId);
      const cartItems = await CartItem.find({ _id: { $in: cartItemIds } });

      // Tạo các OrderItem
      const orderItemIds = [];
      for (const cartItem of cartItems) {
        // Lấy thông tin product variant để biết giá
        const productVariant = await ProductVariant.findById(cartItem.productVariantId);
        if (!productVariant) {
          return res.status(404).json({ message: `Product variant not found: ${cartItem.productVariantId}` });
        }

        // Trừ số lượng từ các lô nhập cũ nhất
        const importBatches = await ImportBatch.find({ variantId: cartItem.productVariantId })
          .sort({ importDate: 1 }); // Sắp xếp theo ngày nhập, cũ nhất trước

        let remainingQuantity = cartItem.quantity;
        for (const batch of importBatches) {
          if (remainingQuantity <= 0) break;
          
          if (batch.quantity > 0) {
            const quantityToDeduct = Math.min(batch.quantity, remainingQuantity);
            batch.quantity -= quantityToDeduct;
            remainingQuantity -= quantityToDeduct;
            await batch.save();
          }
        }

        if (remainingQuantity > 0) {
          return res.status(400).json({ 
            message: `Insufficient stock for product variant: ${cartItem.productVariantId}` 
          });
        }

        const orderItem = new OrderItem({
          productId: cartItem.productId,
          productVariant: cartItem.productVariantId,
          quantity: cartItem.quantity,
          price: productVariant.sellPrice || 0
        });
        await orderItem.save();
        orderItemIds.push(orderItem._id);
      }
      // Only fetch voucherUser if voucherId is valid
      let voucherUser = null;
      if (voucherId && typeof voucherId === "string" && voucherId.trim() !== "") {
        voucherUser = await VoucherUser.findById(voucherId);
      }
      // Tạo Order mới
      const bestOrderManager = await findBestOrderManager();
      if (!bestOrderManager) {
        return res.status(500).json({ message: "No order manager available" });
      }
      const newOrder = new OrderModel({
        userId: userId,
        OrderManagerId: bestOrderManager._id,
        OrderItems: orderItemIds,
        total: amount,
        paymentMethod: paymentMethod,
        address: addressObj,
        voucher: voucherUser && voucherUser.voucherId ? [voucherUser.voucherId] : []
      });
      await newOrder.save();

      // Nếu có voucherId thì cập nhật trạng thái voucher
      if (voucherId && typeof voucherId === "string" && voucherId.trim() !== "") {
        const voucherUser = await VoucherUser.findByIdAndUpdate(
          voucherId,  
          { used: true, usedAt: new Date() }
        );
        console.log("voucherUser:", voucherUser);
        // Update Voucher: increment usedCount
        if (voucherUser && voucherUser.voucherId) {
          await Voucher.findByIdAndUpdate(
            voucherUser.voucherId,
            { $inc: { usedCount: 1 } }
          );
        }
      }

      // Xác định các cart item cần xóa (loại trừ rebuyItems)
      const cartItemsToDelete = Array.isArray(parsedRebuyItems) && parsedRebuyItems.length > 0
        ? cartItemIds.filter(id => !parsedRebuyItems.includes(id.toString()))
        : cartItemIds;
      console.log("parsedRebuyItems:", parsedRebuyItems);
      console.log("cartItemIds:", cartItemIds);
      console.log("cartItemsToDelete:", cartItemsToDelete);
      console.log("Should keep items:", parsedRebuyItems);
      // Xóa các cart item khỏi CartItem (chỉ những item không trong rebuyItems)
      if (cartItemsToDelete.length > 0) {
        await CartItem.deleteMany({ _id: { $in: cartItemsToDelete } });
 
        // Xóa các cart item khỏi Cart của user (chỉ những item không trong rebuyItems)
        await Cart.updateOne(
          { userId: userId },
          { $pull: { cartItems: { $in: cartItemsToDelete } } }
        );
      }

      return res.status(200).json({
        error: 0,
        message: "Order created and payment successful",
        order: newOrder
      });
    } else if (paymentMethod === "MOMO") {
      return res.status(200).json({
        error: 1,
        message: "Payment failed",
      });
    } else {
      return res.status(200).json({
        error: 1,
        message: "Payment failed",
      });
    }
  } catch (error) {
    console.error("Callback error:", error);
    return res.status(500).json({
      message: "Error processing payment callback",
      error: error.message
    });
  }
};




