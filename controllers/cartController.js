const Cart = require('../models/cart');
const CartItem = require('../models/cartItem');
const Product = require('../models/product');
const ProductVariant = require('../models/productVariant');
const ImportBatch = require('../models/import_batches');
const mongoose = require('mongoose');

const addToCart = async (req, res) => {
    try {
        const userId = req.user.id;
        const { productId, productVariantId, quantity } = req.body;
        

        // Validate input
        if (!userId || !productId  || !quantity) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: userId, productId, productVariantId, quantity'
            });
        }

        // Check if product exists
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        // Check if product variant exists
        const productVariant = await ProductVariant.findOne({
            _id: productVariantId,
            product_id: productId
        });
      

        // Find or create cart for user
        let cart = await Cart.findOne({ userId });
        if (!cart) {
            cart = new Cart({ userId, cartItems: [] });
            await cart.save();
        }

        // Populate cartItems để kiểm tra cart item thuộc cart của user
        await cart.populate('cartItems');

        // Tìm cartItem trong cart của user hiện tại
        const existingCartItem = cart.cartItems.find(
            item =>
                item.productId.toString() === productId &&
                item.productVariantId.toString() === productVariantId
        );

        if (existingCartItem) {
            existingCartItem.quantity += quantity;
            await existingCartItem.save();
        } else {
            const newCartItem = new CartItem({
                productId,
                productVariantId,
                quantity
            });
            await newCartItem.save();
            cart.cartItems.push(newCartItem._id);
        }

        await cart.save();

        // Populate cart items with product and variant details
        const populatedCart = await Cart.findById(cart._id)
            .populate({
                path: 'cartItems',
                populate: [
                    {
                        path: 'productId',
                        model: 'Product'
                    },
                    {
                        path: 'productVariantId',
                        model: 'ProductVariant'
                    }
                ]
            });

        return res.status(200).json({
            success: true,
            message: 'Product added to cart successfully',
            data: populatedCart
        });

    } catch (error) {
        console.error('Error adding to cart:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

const updateCart = async (req, res) => {
    try {       
         const userId = req.user.id;
        const {cartItemId, quantity } = req.body;

        // Validate input
        if (!userId || !cartItemId || !quantity) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: userId, cartItemId, quantity'
            });
        }

        // Validate quantity
        if (quantity < 1) {
            return res.status(400).json({
                success: false,
                message: 'Quantity must be at least 1'
            });
        }

        // Find user's cart
        const cart = await Cart.findOne({ userId });
        if (!cart) {
            return res.status(404).json({
                success: false,
                message: 'Cart not found'
            });
        }

        // Find cart item
        const cartItem = await CartItem.findById(cartItemId);
        if (!cartItem) {
            return res.status(404).json({
                success: false,
                message: 'Cart item not found'
            });
        }

        // Verify cart item belongs to user's cart
        const isItemInCart = cart.cartItems.some(item => 
            item.toString() === cartItemId
        );

        if (!isItemInCart) {
            return res.status(403).json({
                success: false,
                message: 'Cart item does not belong to user\'s cart'
            });
        }

        // Update quantity
        cartItem.quantity = quantity;
        await cartItem.save();

        // Get updated cart with populated data
        const updatedCart = await Cart.findById(cart._id)
            .populate({
                path: 'cartItems',
                populate: {
                    path: 'productId',
                    model: 'Product'
                }
            });

        return res.status(200).json({
            success: true,
            message: 'Cart updated successfully',
            data: updatedCart
        });

    } catch (error) {
        console.error('Error updating cart:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

const getCart = async (req, res) => {
    try {
        const userId = req.user.id;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }

        // Find user's cart with populated data
        const cart = await Cart.findOne({ userId })
            .populate({
                path: 'cartItems',
                populate: [
                    {
                        path: 'productId',
                        model: 'Product',
                        select: 'name description price images variants'
                    },
                    {
                        path: 'productVariantId',
                        model: 'ProductVariant',
                        select: 'sku price stock attributes images sellPrice',
                        populate: {
                            path: 'attribute',
                            model: 'Attribute',
                            select: 'value description'
                        }
                    }
                ]
            });

        if (!cart) {
            return res.status(404).json({
                success: false,
                message: 'Cart not found'
            });
        }

        // Get import batches for all variants in cart
        const variantIds = cart.cartItems.map(item => item.productVariantId._id);
        const importBatches = await ImportBatch.aggregate([
            {
                $match: {
                    variantId: { $in: variantIds }
                }
            },
            {
                $group: {
                    _id: '$variantId',
                    totalQuantity: { $sum: '$quantity' },
                    batches: {
                        $push: {
                            quantity: '$quantity',
                            importDate: '$importDate',
                            costPrice: '$costPrice'
                        }
                    }
                }
            }
        ]);

        // Create a map of variant ID to import batch data
        const importBatchMap = importBatches.reduce((map, batch) => {
            map[batch._id.toString()] = {
                totalQuantity: batch.totalQuantity,
                batches: batch.batches
            };
            return map;
        }, {});

        // Transform the cart data to a more organized structure
        const transformedCart = {
            _id: cart._id,
            userId: cart.userId,
            createdAt: cart.createdAt,
            updatedAt: cart.updatedAt,
            cartItems: cart.cartItems.map(cartItem => {
                const variantId = cartItem.productVariantId._id.toString();
                const importBatchData = importBatchMap[variantId] || { totalQuantity: 0, batches: [] };

                return {
                    _id: cartItem._id,
                    quantity: cartItem.quantity,
                    product: {
                        _id: cartItem.productId._id,
                        name: cartItem.productId.name,
                        description: cartItem.productId.description,
                        price: cartItem.productId.price,
                        images: cartItem.productId.images,
                        ...(cartItem.productVariantId && {
                            selectedVariant: {
                                _id: cartItem.productVariantId._id,
                                sku: cartItem.productVariantId.sku,
                                price: cartItem.productVariantId.sellPrice,
                                stock: cartItem.productVariantId.stock,
                                images: cartItem.productVariantId.images,
                                totalImportQuantity: importBatchData.totalQuantity,
                                importBatches: importBatchData.batches,
                                attributes: cartItem.productVariantId.attribute.map(attr => ({
                                    value: attr.value,
                                    description: attr.description
                                }))
                            }
                        }),
                        variants: cartItem.productId.variants
                    }
                };
            })
        };

        // Calculate total items and total price
        const totals = transformedCart.cartItems.reduce((acc, item) => {
            acc.totalItems += item.quantity;
            acc.totalPrice += (item.product.selectedVariant.price * item.quantity);
            return acc;
        }, { totalItems: 0, totalPrice: 0 });

        transformedCart.summary = totals;

        return res.status(200).json({
            success: true,
            message: 'Cart retrieved successfully',
            data: transformedCart
        });

    } catch (error) {
        console.error('Error getting cart:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

const getLatestCartItem = async (req, res) => {
    try {
        const userId = req.user.id;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }

        // Find user's cart with populated data
        const cart = await Cart.findOne({ userId })
            .populate({
                path: 'cartItems',
                populate: [
                    {
                        path: 'productId',
                        model: 'Product',
                        select: 'name description price images variants'
                    },
                    {
                        path: 'productVariantId',
                        model: 'ProductVariant',
                        select: 'sku price stock attributes images sellPrice',
                        populate: {
                            path: 'attribute',
                            model: 'Attribute',
                            select: 'value description'
                        }
                    }
                ]
            });

        if (!cart || cart.cartItems.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No items found in cart'
            });
        }

        // Get the last added cart item (last in the array)
        const lastCartItem = cart.cartItems[cart.cartItems.length - 1];
        
        // Transform the cart item data
        const latestItem = {
            _id: lastCartItem._id,
            quantity: lastCartItem.quantity,
            product: {
                _id: lastCartItem.productId._id,
                name: lastCartItem.productId.name,
                description: lastCartItem.productId.description,
                price: lastCartItem.productId.price,
                images: lastCartItem.productId.images,
                ...(lastCartItem.productVariantId && {
                    selectedVariant: {
                        _id: lastCartItem.productVariantId._id,
                        sku: lastCartItem.productVariantId.sku,
                        price: lastCartItem.productVariantId.sellPrice,
                        stock: lastCartItem.productVariantId.stock,
                        images: lastCartItem.productVariantId.images,
                        attributes: lastCartItem.productVariantId.attribute.map(attr => ({
                            value: attr.value,
                            description: attr.description
                        }))
                    }
                })
            }
        };

        return res.status(200).json({
            success: true,
            message: 'Latest cart item retrieved successfully',
            data: latestItem
        });

    } catch (error) {
        console.error('Error getting latest cart item:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

const deleteCartItem = async (req, res) => {
    try {
        const userId = req.user.id;
        const { cartItemId } = req.params;

        if (!userId || !cartItemId) {
            return res.status(400).json({
                success: false,
                message: 'User ID and Cart Item ID are required'
            });
        }

        // Find user's cart
        const cart = await Cart.findOne({ userId });
        if (!cart) {
            return res.status(404).json({
                success: false,
                message: 'Cart not found'
            });
        }

        // Find cart item
        const cartItem = await CartItem.findById(cartItemId);
        if (!cartItem) {
            return res.status(404).json({
                success: false,
                message: 'Cart item not found'
            });
        }

        // Verify cart item belongs to user's cart
        const isItemInCart = cart.cartItems.some(item => 
            item.toString() === cartItemId
        );

        if (!isItemInCart) {
            return res.status(403).json({
                success: false,
                message: 'Cart item does not belong to user\'s cart'
            });
        }

        // Remove cart item from cart
        cart.cartItems = cart.cartItems.filter(item => 
            item.toString() !== cartItemId
        );
        await cart.save();

        // Delete cart item
        await CartItem.findByIdAndDelete(cartItemId);

        // Get updated cart with populated data
        const updatedCart = await Cart.findById(cart._id)
            .populate({
                path: 'cartItems',
                populate: {
                    path: 'productId',
                    model: 'Product'
                }
            });

        return res.status(200).json({
            success: true,
            message: 'Cart item deleted successfully',
            data: updatedCart
        });

    } catch (error) {
        console.error('Error deleting cart item:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

module.exports = {
    addToCart,
    updateCart,
    getCart,
    deleteCartItem,
    getLatestCartItem
};