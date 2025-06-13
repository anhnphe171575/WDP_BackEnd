const User = require('../models/userModel');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const { MailForgotPass } = require("../services/sendMail");
const crypto = require("crypto");
require("dotenv").config();
const cookieParser = require('cookie-parser');
const transporter = require('../config/email');

const client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'postmessage' // This is required for the token exchange
);

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập email và mật khẩu'
      });
    }
        // Find user by email
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Email hoặc mật khẩu không đúng'
            });
        }

        // Compare password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({
                success: false,
                message: 'Email hoặc mật khẩu không đúng'
            });
        }
        if(!user.verified){
          return res.status(400).json({
            success: false,
            message: 'Tài khoản chưa được xác minh email. Vui lòng kiểm tra email của bạn để kích hoạt tài khoản.'
        });
        }

    // Create JWT token
    const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Send response
    res.status(200).json({
      success: true,
      message: 'Đăng nhập thành công',
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
      error: error.message
    });
  }
};

exports.register = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập đầy đủ thông tin bắt buộc'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email đã được sử dụng'
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Generate verification token
    const verificationToken = jwt.sign(
      { email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Create new user
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      phone,
      role: 1, // Default role for normal user
      verified: false,
      verificationToken,
      verificationTokenExpires: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    });

    // Save user to database
    await newUser.save();

    // Send verification email
    const emailSent = await sendVerificationEmail(email, verificationToken);
    if (!emailSent) {
      // If email sending fails, delete the user
      await User.findByIdAndDelete(newUser._id);
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi gửi email xác thực'
      });
    }

    // Send response
    res.status(201).json({
      success: true,
      message: 'Đăng ký thành công. Vui lòng kiểm tra email để xác thực tài khoản.',
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role
      }
    });

  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
      error: error.message
    });
  }
};

const sendVerificationEmail = async (email, verificationToken) => {
  // Tạo URL xác thực với đầy đủ thông tin
  const verificationUrl = `${process.env.BASE_URL || 'http://localhost:5000'}/api/auth/verify-email?token=${verificationToken}`;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Verify your email',
    html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Hello!</h1>
          <p style="color: #666; line-height: 1.6;">Thank you for registering. Please click the button below to verify your email:</p>
          <div style="text-align: center; margin: 20px 0;">
            <a href="${verificationUrl}" 
               style="display: inline-block; padding: 12px 24px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 4px; font-weight: bold;">
              Verify email
            </a>
          </div>
          <p style="color: #666; line-height: 1.6;">The link will expire in 24 hours.</p>
          <p style="color: #666; line-height: 1.6;">If you did not request this verification, please ignore this email.</p>
        </div>
      `
  };

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Error sending verification email:', error);
    return false;
  }
};

exports.VerifyEmail = async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification token'
      });
    }

    // Tìm user có token tương ứng
    const user = await User.findOne({ verificationToken: token });
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification token or already used'
      });
    }

    // Kiểm tra token đã hết hạn chưa
    if (user.verificationTokenExpires < new Date()) {
      // Xóa token đã hết hạn
      await User.findByIdAndUpdate(user._id, {
        $unset: {
          verificationToken: "",
          verificationTokenExpires: ""
        }
      });

      return res.status(400).json({
        success: false,
        message: 'Verification token has expired. Please register again.'
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Kiểm tra email trong token có khớp với email của user không
      if (decoded.email !== user.email) {
        return res.status(400).json({
          success: false,
          message: 'Invalid verification token'
        });
      }

      // Kiểm tra tài khoản đã được xác thực chưa
      if (user.verified) {
        return res.status(400).json({
          success: false,
          message: 'Account is already verified'
        });
      }

      // Cập nhật trạng thái user và xóa các trường xác thực
      await User.findByIdAndUpdate(user._id, {
        $set: {
          // active: true,
          verified: true
        },
        $unset: {
          verificationToken: "",
          verificationTokenExpires: ""
        }
      });

      // Trả về trang HTML thông báo thành công
      res.status(200).send(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Xác thực email thành công</title>
              <style>
                body {
                  font-family: Arial, sans-serif;
                  display: flex;
                  justify-content: center;
                  align-items: center;
                  height: 100vh;
                  margin: 0;
                  background-color: #f5f5f5;
                }
                .container {
                  text-align: center;
                  padding: 20px;
                  background-color: white;
                  border-radius: 8px;
                  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }
                .success-icon {
                  color: #4CAF50;
                  font-size: 48px;
                  margin-bottom: 20px;
                }
                h1 {
                  color: #333;
                }
                p {
                  color: #666;
                }
                .button {
                  display: inline-block;
                  padding: 10px 20px;
                  background-color: #4CAF50;
                  color: white;
                  text-decoration: none;
                  border-radius: 4px;
                  margin-top: 20px;
                }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="success-icon">✓</div>
                <h1>Email verification successful!</h1>
                <p>Your account has been verified.</p>
                <p>You can login to the system right now.</p>
                <a href="${process.env.CLIENT_URL || 'http://localhost:5000'}/login" class="button">Login</a>
              </div>
            </body>
          </html>
        `);

    } catch (error) {
      // Nếu token hết hạn, xóa token khỏi user
      if (error.name === 'TokenExpiredError') {
        await User.findByIdAndUpdate(user._id, {
          $unset: {
            verificationToken: "",
            verificationTokenExpires: ""
          }
        });
      }

      return res.status(400).json({
        success: false,
        message: 'Verification token has expired'
      });
    }

  } catch (error) {
    console.error('Verify email error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

exports.googleAuth = async (req, res) => {
  try {
    const { credential } = req.body;

    // Verify Google token
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    const { email, name, picture, sub: googleId } = payload;

    // Check if user exists
    let user = await User.findOne({
      $or: [
        { email },
        { googleId }
      ]
    });

    if (!user) {
      // Create new user if doesn't exist
      user = new User({
        name,
        email,
        password: Math.random().toString(36).slice(-8), // Random password
        role: 1, // Default role for normal user
        verified: true, // Google accounts are pre-verified
        avatar: picture,
        googleId // Store Google ID for future reference
      });
      await user.save();
    } else if (!user.googleId) {
      // If user exists but doesn't have googleId, update it
      user.googleId = googleId;
      if (!user.avatar) {
        user.avatar = picture;
      }
      await user.save();
    }
        if (!user) {
            // Create new user if doesn't exist
            user = new User({
                name,
                email,
                role: 1, // Default role for normal user
                verified: true, // Google accounts are pre-verified
                avatar: picture,
                googleId // Store Google ID for future reference
            });
            await user.save();
        } else if (!user.googleId) {
            // If user exists but doesn't have googleId, update it
            user.googleId = googleId;
            if (!user.avatar) {
                user.avatar = picture;
            }
            await user.save();
        }

    // Create JWT token
    const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Send response
    res.status(200).json({
      success: true,
      message: 'Đăng nhập thành công',
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar: user.avatar
      }
    });

  } catch (error) {
    console.error('Google auth error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi xác thực Google',
      error: error.message
    });
  }
};




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

exports.UserProfile = async(req,res) =>{
    try {
        const userId = req.user.id;
        const user = await User.findById(userId).select('-password -verificationToken -verificationTokenExpires');
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy thông tin người dùng'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Lấy thông tin profile thành công',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role,
                avatar: user.avatar,
                verified: user.verified,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt
            }
        });
    } catch (error) {
        console.error('Lỗi khi lấy thông tin profile:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server',
            error: error.message
        });
    }
}