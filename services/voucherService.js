const VoucherUser = require('../models/voucherUser');
const Voucher = require('../models/voucher');
const { sendMail } = require('./sendMail');
const User = require('../models/userModel'); // Đảm bảo đúng tên file model user

async function assignVoucherToUser(userId, voucherCode, sendMailNow = true) {
  console.log('--- BẮT ĐẦU assignVoucherToUser ---');
  console.log('User:', userId, 'VoucherCode:', voucherCode, 'sendMailNow:', sendMailNow);
  // Tìm voucher theo code
  const voucher = await Voucher.findOne({ code: voucherCode });
  if (!voucher) {
    console.log('Không tìm thấy voucher:', voucherCode);
    throw new Error('Không tìm thấy voucher');
  }
  console.log('Voucher tìm được:', voucher.code, 'usedCount:', voucher.usedCount, 'usageLimit:', voucher.usageLimit);

  // Kiểm tra usageLimit
  if (voucher.usageLimit > 0 && voucher.usedCount >= voucher.usageLimit) {
    console.log('Voucher đã hết lượt tặng:', voucher.code);
    throw new Error('Voucher đã hết lượt tặng');
  }

  // Kiểm tra user đã có voucher này chưa
  const existed = await VoucherUser.findOne({ userId, voucherId: voucher._id });
  if (existed) {
    console.log('User đã nhận voucher này trước đó:', userId, voucherCode);
    return false; // Đã tặng rồi
  }

  // Tạo bản ghi tặng voucher
  await VoucherUser.create({ userId, voucherId: voucher._id });
  console.log('Đã tạo bản ghi VoucherUser cho user:', userId, 'voucher:', voucherCode);

  // Tăng usedCount
  voucher.usedCount += 1;
  await voucher.save();
  console.log('Đã tăng usedCount cho voucher:', voucher.code, 'usedCount mới:', voucher.usedCount);

  // Gửi email thông báo nếu cần
  const user = await User.findById(userId);
  if (sendMailNow && user && user.email) {
    console.log('Gửi mail voucher cho:', user.email);
    await sendMail(
      user.email,
      'Bạn vừa nhận được voucher từ Shop!',
      `<div style="text-align:center;">
      <img src="https://prestashoppe.com/116-large_default/prestashop-signup-discount-welcome-voucher.jpg" alt="Voucher" style="max-width:300px; margin-bottom:16px; border-radius:8px;" />
      <p>Chúc mừng bạn đã nhận được voucher <b>${voucher.code}</b> trị giá <b>${voucher.discountAmount.toLocaleString()}đ</b> cho đơn hàng từ ${voucher.minOrderValue.toLocaleString()}đ.<br>
      Hạn sử dụng: ${voucher.validFrom.toLocaleDateString()} - ${voucher.validTo.toLocaleDateString()}<br>
      Hãy sử dụng ngay nhé!</p>
   </div>`
    );
    console.log('Đã gửi email voucher thành công cho:', user.email);
  } else {
    console.log('Không gửi mail voucher (sendMailNow:', sendMailNow, ', user:', user ? user.email : null, ')');
  }

  console.log('--- KẾT THÚC assignVoucherToUser ---');
  return true;
}

module.exports = { assignVoucherToUser };
