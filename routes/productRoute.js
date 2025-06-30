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
 */
router.get('/top-selling', getTopSellingProducts);

/**
 * @swagger
 * /products/search/{search}:
 *   get:
 *     summary: Tìm kiếm sản phẩm theo tên
 */
router.get('/search/:search', getProductsBySearch);


/**
 * @swagger
 * /products:
 *   get:
 *     summary: Lấy tất cả sản phẩm
 */
router.get('/',verifyToken,authorizeRoles(0),getAllProducts);

/**
 * @swagger
 * /products/product-variant/{productId}:
 *   get:
 *     summary: Lấy các biến thể sản phẩm theo productId
 */
router.get('/product-variant/:productId',verifyToken,authorizeRoles(0),getProductVariantsByProductId);

/**
 * @swagger
 * /products/child-attributes/{productId}:
 *   get:
 *     summary: Lấy thuộc tính con theo productId
 */
router.get('/child-attributes/:productId',verifyToken,authorizeRoles(0),getChildAttributesByProductId);

/**
 * @swagger
 * /products/child-attributes/parent/{parentId}:
 *   get:
 *     summary: Lấy thuộc tính con theo parentId
 */
router.get('/child-attributes/parent/:parentId', getChildAttributesByParentId);

/**
 * @swagger
 * /products/{productId}/variant:
 *   post:
 *     summary: Thêm biến thể sản phẩm
 */
router.post('/:productId/variant', upload.array('images'), createProductVariant);

/**
 * @swagger
 * /products/variant/{variantId}:
 *   put:
 *     summary: Cập nhật biến thể sản phẩm
 */
router.put('/variant/:variantId', upload.array('images'), updateProductVariant);

/**
 * @swagger
 * /products/variant/{variantId}:
 *   delete:
 *     summary: Xóa biến thể sản phẩm
 */
router.delete('/variant/:variantId', deleteProductVariant);

/**
 * @swagger
 * /products:
 *   post:
 *     summary: Thêm sản phẩm mới
 */
router.post('/',createProduct);

/**
 * @swagger
 * /products/{productId}:
 *   put:
 *     summary: Cập nhật sản phẩm
 */
router.put('/:productId',updateProduct);

/**
 * @swagger
 * /products/{productId}:
 *   delete:
 *     summary: Xóa sản phẩm
 */
router.delete('/:productId',deleteProduct)

/**
 * @swagger
 * /products/productsByCategory/{categoryId}:
 *   get:
 *     summary: Lấy sản phẩm theo danh mục
 */
router.get('/productsByCategory/:categoryId', getProductsByCategory);

/**
 * @swagger
 * /products/productDetailsByCategory/{categoryId}:
 *   get:
 *     summary: Lấy chi tiết sản phẩm theo danh mục
 */
router.get('/productDetailsByCategory/:categoryId', getProductDetailsByCategory);

/**
 * @swagger
 * /products/productById/{id}:
 *   get:
 *     summary: Lấy chi tiết sản phẩm theo id
 */
router.get('/productById/:id', getProductById);

/**
 * @swagger
 * /products/best-selling:
 *   get:
 *     summary: Lấy sản phẩm bán chạy nhất
 */
router.get('/best-selling', getAllBestSellingProducts);

/**
 * @swagger
 * /products/worst-selling:
 *   get:
 *     summary: Lấy sản phẩm bán chậm nhất
 */
router.get('/worst-selling', getAllWorstSellingProducts);

/**
 * @swagger
 * /products/import-batches/{variantId}:
 *   get:
 *     summary: Lấy danh sách lô nhập theo variantId
 */
router.get('/import-batches/:variantId',verifyToken,authorizeRoles(0), getImportBatchesByVariantId);

/**
 * @swagger
 * /products/import-batches/{variantId}:
 *   post:
 *     summary: Thêm lô nhập hàng cho variant
 */
router.post('/import-batches/:variantId', createImportBatch);

/**
 * @swagger
 * /products/import-batches/{batchId}:
 *   put:
 *     summary: Cập nhật lô nhập hàng
 */
router.put('/import-batches/:batchId', updateImportBatch);

/**
 * @swagger
 * /products/import-batches/{batchId}:
 *   delete:
 *     summary: Xóa lô nhập hàng
 */
router.delete('/import-batches/:batchId', deleteImportBatch);

/**
 * @swagger
 * /products/variant/{variantId}/cost-price:
 *   put:
 *     summary: Cập nhật costPrice cho product variant
 */
router.put('/variant/:variantId/cost-price', updateProductVariantCostPrice);

module.exports = router;
