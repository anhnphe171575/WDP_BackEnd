const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/userModel");
const { MailForgotPass } = require("../services/sendMail");
const crypto = require("crypto");
require("dotenv").config();
const cookieParser = require('cookie-parser');

// OTP storage with expiration
const otpStore = {};
const otpAttempts = {}; // Lưu số lần gửi OTP
const MAX_OTP_ATTEMPTS = 3; // Số lần gửi OTP tối đa trong 1 giờ
const OTP_COOLDOWN = 60 * 60 * 1000; // 1 giờ tính bằng milliseconds

// Hàm mã hóa OTP
const encryptOTP = (otp) => {
  const algorithm = 'aes-256-cbc';
  const key = crypto.scryptSync(process.env.OTP_ENCRYPTION_KEY || 'your-secret-key', 'salt', 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(otp, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return {
    encrypted,
    iv: iv.toString('hex')
  };
};

// Hàm giải mã OTP
const decryptOTP = (encrypted, iv) => {
  const algorithm = 'aes-256-cbc';
  const key = crypto.scryptSync(process.env.OTP_ENCRYPTION_KEY || 'your-secret-key', 'salt', 32);
  const decipher = crypto.createDecipheriv(algorithm, key, Buffer.from(iv, 'hex'));
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
};

// Hàm kiểm tra và xác thực OTP
const verifyOTPAndCleanup = (email, otp) => {
  const storedOTPData = otpStore[email];

  if (!storedOTPData) {
    return { isValid: false, message: "OTP đã hết hạn hoặc không tồn tại. Vui lòng yêu cầu mã mới." };
  }

  if (Date.now() > storedOTPData.expires) {
    delete otpStore[email];
    return { isValid: false, message: "OTP đã hết hạn. Vui lòng yêu cầu mã mới." };
  }

  const decryptedOTP = decryptOTP(storedOTPData.otp, storedOTPData.iv);

  if (decryptedOTP !== otp) {
    return { isValid: false, message: "Mã OTP không đúng" };
  }

  return { isValid: true };
};

// Hàm kiểm tra giới hạn gửi OTP
const checkOTPLimit = (email) => {
  const now = Date.now();
  if (otpAttempts[email]) {
    if (otpAttempts[email].count >= MAX_OTP_ATTEMPTS) {
      const timeLeft = otpAttempts[email].lastAttempt + OTP_COOLDOWN - now;
      if (timeLeft > 0) {
        return {
          canSend: false,
          message: `Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau ${Math.ceil(timeLeft / 60000)} phút`
        };
      }
      // Reset số lần gửi nếu đã hết thời gian cooldown
      otpAttempts[email] = { count: 0, lastAttempt: now };
    }
  } else {
    otpAttempts[email] = { count: 0, lastAttempt: now };
  }
  return { canSend: true };
};

// Gửi OTP qua email
exports.sendOTP = async (req, res) => {
  const { email } = req.body;
  const generateOTP = () => crypto.randomInt(100000, 999999).toString();

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng với email này" });
    }

    // Kiểm tra giới hạn gửi OTP
    const limitCheck = checkOTPLimit(email);
    if (!limitCheck.canSend) {
      return res.status(429).json({ message: limitCheck.message });
    }

    const otp = generateOTP();
    const { encrypted, iv } = encryptOTP(otp);

    otpStore[email] = {
      otp: encrypted,
      iv: iv,
      expires: Date.now() + 5 * 60 * 1000 // OTP hết hạn sau 5 phút
    };

    // Tăng số lần gửi OTP
    otpAttempts[email].count++;
    otpAttempts[email].lastAttempt = Date.now();

    await MailForgotPass(user, otp);
    res.status(200).json({
      success: true,
      message: "Đã gửi mã OTP đến email của bạn"
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Đã xảy ra lỗi khi xử lý yêu cầu của bạn" });
  }
};

// Xác thực OTP
exports.verifyOTP = async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ message: "Thiếu email hoặc mã OTP" });
  }

  try {
    const verification = verifyOTPAndCleanup(email, otp);

    if (!verification.isValid) {
      return res.status(400).json({ message: verification.message });
    }

    // Tạo reset token
    const resetToken = jwt.sign(
      { email },
      process.env.JWT_SECRET,
      { expiresIn: '15m' } // Token hết hạn sau 15 phút
    );

    return res.status(200).json({
      success: true,
      message: "Xác thực OTP thành công",
      resetToken
    });
  } catch (error) {
    console.error('Lỗi xác thực OTP:', error);
    return res.status(500).json({ message: "Lỗi server" });
  }
};

// Đặt lại mật khẩu
exports.resetPassword = async (req, res) => {
  const { email, otp, newPassword } = req.body;

  if (!email || !otp || !newPassword) {
    return res.status(400).json({ message: "Thiếu thông tin cần thiết" });
  }

  try {
    // Xác thực OTP
    const verification = verifyOTPAndCleanup(email, otp);
    if (!verification.isValid) {
      return res.status(400).json({ message: verification.message });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    // Xóa OTP và reset số lần gửi
    delete otpStore[email];
    delete otpAttempts[email];

    return res.status(200).json({
      success: true,
      message: "Đặt lại mật khẩu thành công"
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Lỗi server" });
  }
};


