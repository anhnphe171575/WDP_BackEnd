const express = require('express');
const router = express.Router();
const User = require('../models/UserModel');
const banner = require('../models/bannerModel');
/**
 * @swagger
 * /users:
 *   get:
 *     summary: Lấy danh sách người dùng
 *     responses:
 *       200:
 *         description: Thành công
 */

router.get('/', async (req, res) => {
    try {
        const users = await banner.find();
        res.status(200).json(users);
    } catch (error) {
        console.error('Error in GET /api/users:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});




module.exports = router;
  