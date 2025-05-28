const express = require('express');
const router = express.Router();

/**
 * @swagger
 * /users:
 *   get:
 *     summary: Lấy danh sách người dùng
 *     responses:
 *       200:
 *         description: Thành công
 */
router.get('/', (req, res) => {
    try {
        console.log('GET /api/users route hit');
        res.status(200).json([{ id: 1, name: 'Nguyen Van A' }]);
    } catch (error) {
        console.error('Error in GET /api/users:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/:id', (req, res) => {
    try {
        console.log('GET /api/users/:id route hit');
        res.status(200).json([{ id: 1, name: 'Nguyen Van A' }]);
    } catch (error) {
        console.error('Error in GET /api/users:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


module.exports = router;
  