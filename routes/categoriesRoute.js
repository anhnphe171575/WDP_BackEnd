const express = require('express');
const router = express.Router();
const { getAllCategoriesPopular, getParentCategories,   getChildCategories, getCategoryChildrenById, getAttributesByCategoryId,getChildCategoriesByParentId, createCategory, createChildCategory, updateCategory, deleteCategory } = require('../controllers/categories');
const { upload } = require('../config/cloudinary');

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
 *     consumes:
 *       - multipart/form-data
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               parentCategory:
 *                 type: string
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Category created successfully
 */
router.post('/', upload.single('image'), createCategory);

/**
 * @swagger
 * /categories/child-category/{parentId}:
 *   post:
 *     summary: Create a child category
 *     consumes:
 *       - multipart/form-data
 *     parameters:
 *       - in: path
 *         name: parentId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Child category created successfully
 */
router.post('/child-category/:parentId', upload.single('image'), createChildCategory);

/**
 * @swagger
 * /categories/{categoryId}:
 *   put:
 *     summary: Update a category
 *     consumes:
 *       - multipart/form-data
 *     parameters:
 *       - in: path
 *         name: categoryId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               parentCategory:
 *                 type: string
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Category updated successfully
 */
router.put('/:categoryId', upload.single('image'), updateCategory);

/**
 * @swagger
 * /categories/{categoryId}:
 *   delete:
 *     summary: Delete a category
 *     parameters:
 *       - in: path
 *         name: categoryId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Category deleted successfully
 */
router.delete('/:categoryId', deleteCategory);

module.exports = router;
