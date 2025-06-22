const express = require('express');
const router = express.Router();
const attributeController = require('../controllers/attributeController');

// Lấy danh sách attribute (có filter)
router.get('/', attributeController.getAttributes);
// Lấy tree attribute
router.get('/tree', attributeController.getAttributeTree);
// Lấy chi tiết attribute
router.get('/:id', attributeController.getAttributeById);
// Tạo mới attribute
router.post('/', attributeController.createAttribute);
// Cập nhật attribute
router.put('/:id', attributeController.updateAttribute);
// Xóa attribute
router.delete('/:id', attributeController.deleteAttribute);

module.exports = router; 