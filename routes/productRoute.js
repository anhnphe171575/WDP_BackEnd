const express = require('express');
const router = express.Router();
const { getTopSellingProducts, getAllProducts, getProductVariantsByProductId, getProductsBySearch, getAllBestSellingProducts, getAllWorstSellingProducts, getChildAttributesByProductId, getChildAttributesByParentId, getProductById, createProductVariant, updateProductVariant, deleteProductVariant,createProduct, deleteProduct , getProductsByCategory, getProductDetailsByCategory,updateProduct, getImportBatchesByVariantId, createImportBatch, updateImportBatch, deleteImportBatch, updateProductVariantCostPrice } = require('../controllers/product');
const { upload } = require('../config/cloudinary');
const  verifyToken  = require('../middleware/auth');
const  authorizeRoles = require('../middleware/authorization');

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
router.get('/search/:search', getProductsBySearch);
router.get('/',verifyToken,authorizeRoles(0),getAllProducts);
router.get('/product-variant/:productId',getProductVariantsByProductId);
router.get('/child-attributes/:productId',getChildAttributesByProductId);
router.get('/child-attributes/parent/:parentId', getChildAttributesByParentId);
router.post('/:productId/variant', upload.array('images'), createProductVariant);
router.put('/variant/:variantId', upload.array('images'), updateProductVariant);
router.delete('/variant/:variantId', deleteProductVariant);
router.post('/',createProduct);
router.put('/:productId',updateProduct);
router.delete('/:productId',deleteProduct)
router.get('/productsByCategory/:categoryId', getProductsByCategory);
router.get('/productDetailsByCategory/:categoryId', getProductDetailsByCategory);
router.get('/productById/:id', getProductById);
router.get('/best-selling', getAllBestSellingProducts);
router.get('/worst-selling', getAllWorstSellingProducts);
router.get('/import-batches/:variantId', getImportBatchesByVariantId);
router.post('/import-batches/:variantId', createImportBatch);
router.put('/import-batches/:batchId', updateImportBatch);
router.delete('/import-batches/:batchId', deleteImportBatch);

// Route cập nhật costPrice cho product variant
router.put('/variant/:variantId/cost-price', updateProductVariantCostPrice);

module.exports = router;
