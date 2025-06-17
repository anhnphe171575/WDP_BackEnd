const express = require('express');
const router = express.Router();
const { getAllCategoriesPopular, getParentCategories,   getChildCategories, getCategoryChildrenById, getAttributesByCategoryId,getChildCategoriesByParentId, createCategory, createChildCategory, deleteCategory } = require('../controllers/categories');

/**
 * @swagger
 * /categories/popular:
 *   get:
 *     summary: Lấy danh sách categories phổ biến
 *     responses:
 *       200:
 *         description: Thành công
 */
router.get('/popular', getAllCategoriesPopular);
/**
 * @swagger
 * /categories/parent:
 *   get:
 *     summary: Lấy danh sách categories cha
 *     responses:
 *       200:
 *         description: Thành công
 */
router.get('/parent', getParentCategories);
router.get('/child-categories/:parentId', getChildCategoriesByParentId);

/**
 * @swagger
 * /categories/childCategories:
 *   get:
 *     summary: Lấy danh sách categories con
 *     responses:
 *       200:
 *         description: Thành công
 */
router.get('/childCategories', getChildCategories);

/**
 * @swagger
 * /categories/childCategories/{categoryId}:
 *   get:
 *     summary: Lấy danh sách categories con
 *     responses:
 *       200:
 *         description: Thành công
 */
router.get('/childCategories/:categoryId', getCategoryChildrenById);
/**
 * @swagger
 * /categories/attributes/{categoryId}:
 *   get:
 *     summary: Lấy danh sách attributes
 *     responses:
 *       200:
 *         description: Thành công
 */
router.get('/attributes/:categoryId', getAttributesByCategoryId);

/**
 * @swagger
 * /categories:
 *   post:
 *     summary: Create a new category
 *     responses:
 *       201:
 *         description: Category created successfully
 */
router.post('/', createCategory);
router.post('/child-category/:parentId', createChildCategory);
router.delete('/:categoryId', deleteCategory);

module.exports = router;
