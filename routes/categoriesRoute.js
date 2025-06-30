const express = require('express');
const router = express.Router();
const { getAllCategoriesPopular, getParentCategories,   getChildCategories, getCategoryChildrenById, getAttributesByCategoryId,getChildCategoriesByParentId, createCategory, createChildCategory, updateCategory, deleteCategory } = require('../controllers/categories');
const { upload } = require('../config/cloudinary');
const  verifyToken  = require('../middleware/auth');
const  authorizeRoles = require('../middleware/authorization');

/**
 * @swagger
 * /categories/popular:
 *   get:
 *     summary: Lấy danh sách categories phổ biến
 */
router.get('/popular', getAllCategoriesPopular);
/**
 * @swagger
 * /categories/parent:
 *   get:
 *     summary: Lấy danh sách categories cha
 */
router.get('/parent', getParentCategories);
/**
 * @swagger
 * /categories/child-categories/{parentId}:
 *   get:
 *     summary: Lấy danh sách categories con theo parentId
 */
router.get('/child-categories/:parentId', getChildCategoriesByParentId);

/**
 * @swagger
 * /categories/childCategories:
 *   get:
 *     summary: Lấy danh sách categories con
 */
router.get('/childCategories', getChildCategories);

/**
 * @swagger
 * /categories/childCategories/{categoryId}:
 *   get:
 *     summary: Lấy danh sách categories con theo categoryId
 */
router.get('/childCategories/:categoryId', getCategoryChildrenById);
/**
 * @swagger
 * /categories/attributes/{categoryId}:
 *   get:
 *     summary: Lấy danh sách attributes theo categoryId
 */
router.get('/attributes/:categoryId', getAttributesByCategoryId);

/**
 * @swagger
 * /categories:
 *   post:
 *     summary: Tạo mới category
 */
router.post('/', upload.single('image'), createCategory);

/**
 * @swagger
 * /categories/child-category/{parentId}:
 *   post:
 *     summary: Tạo mới category con
 */
router.post('/child-category/:parentId', upload.single('image'), createChildCategory);

/**
 * @swagger
 * /categories/{categoryId}:
 *   put:
 *     summary: Cập nhật category
 */
router.put('/:categoryId', upload.single('image'), updateCategory);

/**
 * @swagger
 * /categories/{categoryId}:
 *   delete:
 *     summary: Xóa category
 */
router.delete('/:categoryId', deleteCategory);

/**
 * @swagger
 * /categories/export-json:
 *   get:
 *     summary: Export all categories to JSON file
 */
router.get('/export-json', require('../controllers/categories').exportAllCategoriesToJson);

module.exports = router;
