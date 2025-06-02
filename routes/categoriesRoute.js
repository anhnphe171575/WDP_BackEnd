const express = require('express');
const router = express.Router();
const { getAllCategoriesPopular, getParentCategories } = require('../controllers/categories');
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
module.exports = router;
