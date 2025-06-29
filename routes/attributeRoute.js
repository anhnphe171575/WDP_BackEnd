const express = require('express');
const router = express.Router();
const attributeController = require('../controllers/attributeController');

/**
 * @swagger
 * /attributes:
 *   get:
 *     summary: Lấy danh sách attribute (có filter)
 */
router.get('/', attributeController.getAttributes);

/**
 * @swagger
 * /attributes/tree:
 *   get:
 *     summary: Lấy tree attribute
 */
router.get('/tree', attributeController.getAttributeTree);

/**
 * @swagger
 * /attributes/{id}:
 *   get:
 *     summary: Lấy chi tiết attribute
 */
router.get('/:id', attributeController.getAttributeById);

/**
 * @swagger
 * /attributes:
 *   post:
 *     summary: Tạo mới attribute
 */
router.post('/', attributeController.createAttribute);

/**
 * @swagger
 * /attributes/{id}:
 *   put:
 *     summary: Cập nhật attribute
 */
router.put('/:id', attributeController.updateAttribute);

/**
 * @swagger
 * /attributes/{id}:
 *   delete:
 *     summary: Xóa attribute
 */
router.delete('/:id', attributeController.deleteAttribute);

module.exports = router; 