const Voucher = require('../models/voucher');
const VoucherUser = require('../models/voucherUser');

// Tạo voucher mới
const createVoucher = async (req, res) => {
  try {
    const { code, discountAmount, discountPercent, validFrom, validTo, usageLimit } = req.body;
    
    const voucher = new Voucher({
      code,
      discountAmount,
      discountPercent,
      validFrom,
      validTo,
      usageLimit,
      usedCount: 0
    });

    const savedVoucher = await voucher.save();
    res.status(201).json(savedVoucher);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Lấy danh sách tất cả voucher
const getAllVouchers = async (req, res) => {
  try {
    const vouchers = await Voucher.find();
    res.status(200).json(vouchers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Lấy thông tin một voucher theo ID
const getVoucherById = async (req, res) => {
  try {
    const voucher = await Voucher.findById(req.params.id);
    if (!voucher) {
      return res.status(404).json({ message: 'Không tìm thấy voucher' });
    }
    res.status(200).json(voucher);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Cập nhật thông tin voucher
const updateVoucher = async (req, res) => {
  try {
    const { code, discountAmount, discountPercent, validFrom, validTo, usageLimit } = req.body;
    
    const voucher = await Voucher.findById(req.params.id);
    if (!voucher) {
      return res.status(404).json({ message: 'Không tìm thấy voucher' });
    }

    voucher.code = code || voucher.code;
    voucher.discountAmount = discountAmount || voucher.discountAmount;
    voucher.discountPercent = discountPercent || voucher.discountPercent;
    voucher.validFrom = validFrom || voucher.validFrom;
    voucher.validTo = validTo || voucher.validTo;
    voucher.usageLimit = usageLimit || voucher.usageLimit;

    const updatedVoucher = await voucher.save();
    res.status(200).json(updatedVoucher);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Xóa voucher
const deleteVoucher = async (req, res) => {
  try {
    const voucher = await Voucher.findById(req.params.id);
    if (!voucher) {
      return res.status(404).json({ message: 'Không tìm thấy voucher' });
    }

    await voucher.deleteOne();
    res.status(200).json({ message: 'Đã xóa voucher thành công' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Kiểm tra và áp dụng voucher
const validateVoucher = async (req, res) => {
  try {
    const { code } = req.body;
    const voucher = await Voucher.findOne({ code });

    if (!voucher) {
      return res.status(404).json({ message: 'Mã voucher không tồn tại' });
    }

    const now = new Date();
    if (now < voucher.validFrom || now > voucher.validTo) {
      return res.status(400).json({ message: 'Voucher đã hết hạn hoặc chưa đến thời gian sử dụng' });
    }

    if (voucher.usageLimit > 0 && voucher.usedCount >= voucher.usageLimit) {
      return res.status(400).json({ message: 'Voucher đã hết lượt sử dụng' });
    }

    res.status(200).json({
      message: 'Voucher hợp lệ',
      voucher: {
        id: voucher._id,
        discountAmount: voucher.discountAmount,
        discountPercent: voucher.discountPercent
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Lấy danh sách voucher theo userId
const getVouchersByUserId = async (req, res) => {
  try {
    const userId = req.user.id;
    console.log(userId)
    const vouchers = await VoucherUser.find({ userId }).populate('voucherId');
    res.status(200).json(vouchers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Cập nhật trạng thái voucher của user khi sử dụng



module.exports = {
  createVoucher,
  getAllVouchers,
  getVoucherById,
  updateVoucher,
  deleteVoucher,
  validateVoucher,
  getVouchersByUserId
};
