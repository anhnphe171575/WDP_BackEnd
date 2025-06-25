const Wishlist = require('../models/wishlist');
const ProductVariant = require('../models/productVariant');

// Thêm sản phẩm vào wishlist
exports.addToWishlist = async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId } = req.body;
    let wishlist = await Wishlist.findOne({ user: userId });
    if (!wishlist) {
      wishlist = new Wishlist({ user: userId, products: [productId] });
    } else {
      if (!wishlist.products.includes(productId)) {
        wishlist.products.push(productId);
      }
    }
    await wishlist.save();
    res.status(200).json({ success: true, wishlist });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Xóa sản phẩm khỏi wishlist
exports.removeFromWishlist = async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId } = req.body;
    const wishlist = await Wishlist.findOne({ user: userId });
    if (!wishlist) {
      return res.status(404).json({ success: false, message: 'Wishlist not found' });
    }
    wishlist.products = wishlist.products.filter(
      (id) => id.toString() !== productId
    );
    await wishlist.save();
    res.status(200).json({ success: true, wishlist });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Lấy danh sách wishlist của user
exports.getWishlist = async (req, res) => {
  try {
    const userId = req.user.id;
    const wishlist = await Wishlist.findOne({ user: userId }).populate('products');
    if (!wishlist) {
      return res.status(200).json({ success: true, products: [] });
    }
    // Lấy ảnh variant đầu tiên cho mỗi sản phẩm
    const productsWithImages = await Promise.all(
      wishlist.products.map(async (product) => {
        const variant = await ProductVariant.findOne({ product_id: product._id });
        return {
          ...product.toObject(),
          image: variant?.images?.[0]?.url || null,
        };
      })
    );
    res.status(200).json({ success: true, products: productsWithImages });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}; 