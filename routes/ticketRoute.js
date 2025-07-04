const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');
const verifyToken = require('../middleware/auth');
// const authorization = require('../middleware/authorization'); // nếu có phân quyền

// Lấy tất cả ticket của customer đang đăng nhập
router.get('/customer/all', verifyToken, ticketController.getAllTicketsByCustomer);

// Lấy tất cả ticket mà handlerId là user đang đăng nhập (nhân viên marketing)
router.get('/handler/all', verifyToken, ticketController.getAllTicketsByHandler);

// Lấy danh sách ticket của user đang đăng nhập
router.get('/user', verifyToken, ticketController.getTicketsByUser);

// Lấy chi tiết ticket
router.get('/:id', verifyToken, ticketController.getTicketById);

// Tạo ticket mới (khách hàng)
router.post('/', verifyToken, ticketController.createTicket);

// Cập nhật ticket (chỉ admin/nhân viên được cập nhật trạng thái, phân công, phản hồi)
router.patch('/:id', verifyToken, ticketController.updateTicket);

// Xóa ticket (chỉ admin hoặc chủ sở hữu)
router.delete('/:id', verifyToken, ticketController.deleteTicket);

module.exports = router;
