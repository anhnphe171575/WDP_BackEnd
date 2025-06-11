const Cart = require('../models/cart');
const CartItem = require('../models/cartItem');
const Product = require('../models/product');

const addToCart = async (req, res) => {
    try {
        const userId = req.user.id;
        const {  productId, quantity } = req.body;

        // Validate input
        if (!userId || !productId || !quantity) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: userId, productId, quantity'
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

        // Find or create cart for user
        let cart = await Cart.findOne({ userId });
        if (!cart) {
            cart = new Cart({ userId, cartItems: [] });
        }

        // Check if product already exists in cart
        const existingCartItem = await CartItem.findOne({
            productId: productId,
            _id: { $in: cart.cartItems.map(item => item.cartItem_id) }
        });

        if (existingCartItem) {
            // Update quantity if product already in cart
            existingCartItem.quantity += quantity;
            await existingCartItem.save();
        } else {
            // Create new cart item
            const newCartItem = new CartItem({
                productId,
                quantity
            });
            await newCartItem.save();
            
            // Add cart item to cart
            cart.cartItems.push({ cartItem_id: newCartItem._id });
        }

        await cart.save();

        // Populate cart items with product details
        const populatedCart = await Cart.findById(cart._id)
            .populate({
                path: 'cartItems.cartItem_id',
                populate: {
                    path: 'productId',
                    model: 'Product'
                }
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
            item.cartItem_id.toString() === cartItemId
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
                path: 'cartItems.cartItem_id',
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
                path: 'cartItems.cartItem_id',
                populate: {
                    path: 'productId',
                    model: 'Product',
                    populate: {
                        path: 'variants',
                        model: 'ProductVariant',
                        select: 'images sellPrice'
                    }
                }
            });

        if (!cart) {
            return res.status(404).json({
                success: false,
                message: 'Cart not found'
            });
        }

        // Transform the cart data to include variant information
        const transformedCart = {
            ...cart.toObject(),
            cartItems: cart.cartItems.map(item => ({
                ...item.cartItem_id.toObject(),
                product: {
                    ...item.cartItem_id.productId.toObject(),
                    variant: item.cartItem_id.productId.variants[0] // Get the first variant
                }
            }))
        };

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
            item.cartItem_id.toString() === cartItemId
        );

        if (!isItemInCart) {
            return res.status(403).json({
                success: false,
                message: 'Cart item does not belong to user\'s cart'
            });
        }

        // Remove cart item from cart
        cart.cartItems = cart.cartItems.filter(item => 
            item.cartItem_id.toString() !== cartItemId
        );
        await cart.save();

        // Delete cart item
        await CartItem.findByIdAndDelete(cartItemId);

        // Get updated cart with populated data
        const updatedCart = await Cart.findById(cart._id)
            .populate({
                path: 'cartItems.cartItem_id',
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
    deleteCartItem
};
