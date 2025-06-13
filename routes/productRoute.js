const express = require('express');
const router = express.Router();
const { getTopSellingProducts, getAllProducts, getProductVariantsByProductId, getChildAttributesByProductId, getChildAttributesByParentId, getProductById, createProductVariant, updateProductVariant, deleteProductVariant,createProduct, deleteProduct , getProductsByCategory, getProductDetailsByCategory } = require('../controllers/product');

/**
 * @swagger     
 * /products/top-selling:
 *   get:
 *     summary: Lấy danh sách sản phẩm bán chạy
 *     responses:
 *       200:
 *         description: Thành công
 */
router.get('/top-selling', getTopSellingProducts);
router.get('/',getAllProducts);
router.get('/product-variant/:productId',getProductVariantsByProductId);
router.get('/child-attributes/:productId',getChildAttributesByProductId);
router.get('/child-attributes/parent/:parentId', getChildAttributesByParentId);
router.post('/:productId/variant', createProductVariant);
router.put('/variant/:variantId', updateProductVariant);
router.delete('/variant/:variantId', deleteProductVariant);
router.post('/',createProduct);
router.delete('/:productId',deleteProduct)
router.get('/productsByCategory/:categoryId', getProductsByCategory);
router.get('/productDetailsByCategory/:categoryId', getProductDetailsByCategory);
router.get('/productById/:id', getProductById);

module.exports = router;
