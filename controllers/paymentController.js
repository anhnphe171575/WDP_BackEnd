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

exports.createPayment = async (req, res) => {
  const userId = req.user.id;    
    const {  addressId, amount, shippingMethod, paymentMethod, items } = req.body;
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    const timestamp = Date.now() % 1000000; 
    const orderCode = Number(`${timestamp}${randomNum}`.slice(-9)); 
    console.log(req.body)
    const body = {
        orderCode,
        amount: amount,
        description: 'Thanh toan don hang',
        returnUrl: `http://localhost:3000/payment/result?items=${encodeURIComponent(JSON.stringify(items))}&addressId=${encodeURIComponent(addressId)}&amount=${encodeURIComponent(amount)}&shippingMethod=${encodeURIComponent(shippingMethod)}&paymentMethod=${encodeURIComponent(paymentMethod)}`,
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
    const { items, addressId, amount, shippingMethod, paymentMethod, code, cancel, status, orderCode } = req.body;
    const userId = req.user?.id || req.body.userId; // Lấy userId từ req nếu có
    console.log(req.body);

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

      // Tạo Order mới
      const newOrder = new OrderModel({
        userId: userId,
        OrderItems: orderItemIds,
        total: amount,
        status: "completed",
        paymentMethod: paymentMethod,
        address: addressObj,
      });
      await newOrder.save();

      // Xóa các cart item khỏi CartItem
      await CartItem.deleteMany({ _id: { $in: cartItemIds } });

      // Xóa các cart item khỏi Cart của user
      await Cart.updateOne(
        { userId: userId },
        { $pull: { cartItems: { $in: cartItemIds } } }
      );

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

      // Tạo Order mới
      const newOrder = new OrderModel({
        userId: userId,
        OrderItems: orderItemIds,
        total: amount,
        status: "completed",
        paymentMethod: paymentMethod,
        address: addressObj,
      });
      await newOrder.save();

      // Xóa các cart item khỏi CartItem
      await CartItem.deleteMany({ _id: { $in: cartItemIds } });

      // Xóa các cart item khỏi Cart của user
      await Cart.updateOne(
        { userId: userId },
        { $pull: { cartItems: { $in: cartItemIds } } }
      );

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




