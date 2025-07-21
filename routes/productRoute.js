const express = require('express');
const router = express.Router();
const { getTopSellingProducts, getAllProducts, getProductVariantsByProductId, getProductsBySearch, getAllBestSellingProducts, getAllWorstSellingProducts, getChildAttributesByProductId, getChildAttributesByParentId, getProductById, createProductVariant, updateProductVariant, deleteProductVariant,createProduct, deleteProduct , getProductsByCategory, getProductDetailsByCategory,updateProduct, getImportBatchesByVariantId, createImportBatch, updateImportBatch, deleteImportBatch, updateProductVariantCostPrice, getProductDashboardData } = require('../controllers/product');
const { upload } = require('../config/cloudinary');
const  verifyToken  = require('../middleware/auth');
const  authorizeRoles = require('../middleware/authorization');

/**
 * @swagger
 * tags:
 *   name: Products
 *   description: Quản lý sản phẩm
 */

/**
 * @swagger     
 * /api/products/top-selling:
 *   get:
 *     tags: [Products]
 *     summary: Lấy danh sách sản phẩm bán chạy
 *     responses:
 *       200:
 *         description: Thành công
 *       400:
 *         description: Lỗi request
 */
router.get('/top-selling', getTopSellingProducts);

/**
 * @swagger     
 * /api/products/dashboard:
 *   get:
 *     tags: [Products]
 *     summary: Lấy dữ liệu tổng quan cho dashboard sản phẩm
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Thành công
 *       401:
 *         description: Không có quyền truy cập
 *       500:
 *         description: Lỗi server
 */
router.get('/dashboard', verifyToken, authorizeRoles(8), getProductDashboardData);

/**
 * @swagger
 * /api/products/search/{search}:
 *   get:
 *     tags: [Products]
 *     summary: Tìm kiếm sản phẩm theo tên
 *     parameters:
 *       - in: path
 *         name: search
 *         required: true
 *         schema:
 *           type: string
 *         description: Từ khóa tìm kiếm sản phẩm
 *     responses:
 *       200:
 *         description: Thành công
 *       400:
 *         description: Lỗi request
 */
router.get('/search/:search', getProductsBySearch);


/**
 * @swagger
 * /api/products:
 *   get:
 *     tags: [Products]
 *     summary: Lấy tất cả sản phẩm
 *     responses:
 *       200:
 *         description: Thành công
 *       400:
 *         description: Lỗi request
 */
router.get('/',verifyToken,authorizeRoles(0),getAllProducts);

/**
 * @swagger
 * /api/products/product-variant/{productId}:
 *   get:
 *     tags: [Products]
 *     summary: Lấy các biến thể sản phẩm theo productId
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID sản phẩm
 *     responses:
 *       200:
 *         description: Thành công
 *       400:
 *         description: Lỗi request
 */
router.get('/product-variant/:productId',verifyToken,authorizeRoles(0),getProductVariantsByProductId);

/**
 * @swagger
 * /api/products/child-attributes/{productId}:
 *   get:
 *     tags: [Products]
 *     summary: Lấy thuộc tính con theo productId
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID sản phẩm
 *     responses:
 *       200:
 *         description: Thành công
 *       400:
 *         description: Lỗi request
 */
router.get('/child-attributes/:productId',verifyToken,authorizeRoles(0),getChildAttributesByProductId);

/**
 * @swagger
 * /api/products/child-attributes/parent/{parentId}:
 *   get:
 *     tags: [Products]
 *     summary: Lấy thuộc tính con theo parentId
 *     parameters:
 *       - in: path
 *         name: parentId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID thuộc tính cha
 *     responses:
 *       200:
 *         description: Thành công
 *       400:
 *         description: Lỗi request
 */
router.get('/child-attributes/parent/:parentId', getChildAttributesByParentId);

/**
 * @swagger
 * /api/products/{productId}/variant:
 *   post:
 *     tags: [Products]
 *     summary: Thêm biến thể sản phẩm
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID sản phẩm
 *     responses:
 *       200:
 *         description: Thành công
 *       400:
 *         description: Lỗi request
 */
router.post('/:productId/variant', upload.array('images'), createProductVariant);

/**
 * @swagger
 * /api/products/variant/{variantId}:
 *   put:
 *     tags: [Products]
 *     summary: Cập nhật biến thể sản phẩm
 *     parameters:
 *       - in: path
 *         name: variantId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID biến thể sản phẩm
 *     responses:
 *       200:
 *         description: Thành công
 *       400:
 *         description: Lỗi request
 */
router.put('/variant/:variantId', upload.array('images'), updateProductVariant);

/**
 * @swagger
 * /api/products/variant/{variantId}:
 *   delete:
 *     tags: [Products]
 *     summary: Xóa biến thể sản phẩm
 *     parameters:
 *       - in: path
 *         name: variantId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID biến thể sản phẩm
 *     responses:
 *       200:
 *         description: Thành công
 *       400:
 *         description: Lỗi request
 */
router.delete('/variant/:variantId', deleteProductVariant);

/**
 * @swagger
 * /api/products:
 *   post:
 *     tags: [Products]
 *     summary: Thêm sản phẩm mới
 *     responses:
 *       200:
 *         description: Thành công
 *       400:
 *         description: Lỗi request
 */
router.post('/',createProduct);

/**
 * @swagger
 * /api/products/{productId}:
 *   put:
 *     tags: [Products]
 *     summary: Cập nhật sản phẩm
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID sản phẩm
 *     responses:
 *       200:
 *         description: Thành công
 *       400:
 *         description: Lỗi request
 */
router.put('/:productId',updateProduct);

/**
 * @swagger
 * /api/products/{productId}:
 *   delete:
 *     tags: [Products]
 *     summary: Xóa sản phẩm
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID sản phẩm
 *     responses:
 *       200:
 *         description: Thành công
 *       400:
 *         description: Lỗi request
 */
router.delete('/:productId',deleteProduct)

/**
 * @swagger
 * /api/products/productsByCategory/{categoryId}:
 *   get:
 *     tags: [Products]
 *     summary: Lấy sản phẩm theo danh mục
 *     parameters:
 *       - in: path
 *         name: categoryId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID danh mục
 *     responses:
 *       200:
 *         description: Thành công
 *       400:
 *         description: Lỗi request
 */
router.get('/productsByCategory/:categoryId', getProductsByCategory);

/**
 * @swagger
 * /api/products/productDetailsByCategory/{categoryId}:
 *   get:
 *     tags: [Products]
 *     summary: Lấy chi tiết sản phẩm theo danh mục
 *     parameters:
 *       - in: path
 *         name: categoryId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID danh mục
 *     responses:
 *       200:
 *         description: Thành công
 *       400:
 *         description: Lỗi request
 */
router.get('/productDetailsByCategory/:categoryId', getProductDetailsByCategory);

/**
 * @swagger
 * /api/products/productById/{id}:
 *   get:
 *     tags: [Products]
 *     summary: Lấy chi tiết sản phẩm theo id
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID sản phẩm
 *     responses:
 *       200:
 *         description: Thành công
 *       400:
 *         description: Lỗi request
 */
router.get('/productById/:id', getProductById);

/**
 * @swagger
 * /api/products/best-selling:
 *   get:
 *     tags: [Products]
 *     summary: Lấy sản phẩm bán chạy nhất
 *     responses:
 *       200:
 *         description: Thành công
 *       400:
 *         description: Lỗi request
 */
router.get('/best-selling', getAllBestSellingProducts);

/**
 * @swagger
 * /api/products/worst-selling:
 *   get:
 *     tags: [Products]
 *     summary: Lấy sản phẩm bán chậm nhất
 *     responses:
 *       200:
 *         description: Thành công
 *       400:
 *         description: Lỗi request
 */
router.get('/worst-selling', getAllWorstSellingProducts);

/**
 * @swagger
 * /api/products/import-batches/{variantId}:
 *   get:
 *     tags: [Products]
 *     summary: Lấy danh sách lô nhập theo variantId
 *     parameters:
 *       - in: path
 *         name: variantId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID biến thể sản phẩm
 *     responses:
 *       200:
 *         description: Thành công
 *       400:
 *         description: Lỗi request
 *   post:
 *     tags: [Products]
 *     summary: Thêm lô nhập hàng cho variant
 *     parameters:
 *       - in: path
 *         name: variantId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID biến thể sản phẩm
 *     responses:
 *       200:
 *         description: Thành công
 *       400:
 *         description: Lỗi request
 */
router.get('/import-batches/:variantId',verifyToken,authorizeRoles(0), getImportBatchesByVariantId);
router.post('/import-batches/:variantId', createImportBatch);

/**
 * @swagger
 * /api/products/import-batches/{batchId}:
 *   put:
 *     tags: [Products]
 *     summary: Cập nhật lô nhập hàng
 *     parameters:
 *       - in: path
 *         name: batchId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID lô nhập hàng
 *     responses:
 *       200:
 *         description: Thành công
 *       400:
 *         description: Lỗi request
 *   delete:
 *     tags: [Products]
 *     summary: Xóa lô nhập hàng
 *     parameters:
 *       - in: path
 *         name: batchId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID lô nhập hàng
 *     responses:
 *       200:
 *         description: Thành công
 *       400:
 *         description: Lỗi request
 */
router.put('/import-batches/:batchId', updateImportBatch);
router.delete('/import-batches/:batchId', deleteImportBatch);

/**
 * @swagger
 * /api/products/variant/{variantId}/cost-price:
 *   put:
 *     tags: [Products]
 *     summary: Cập nhật costPrice cho product variant
 *     parameters:
 *       - in: path
 *         name: variantId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID biến thể sản phẩm
 *     responses:
 *       200:
 *         description: Thành công
 *       400:
 *         description: Lỗi request
 */
router.put('/variant/:variantId/cost-price', updateProductVariantCostPrice);

module.exports = router;
