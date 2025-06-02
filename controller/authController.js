const User = require('../models/userModel');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const transporter = require('../config/email');

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
            return res.status(401).json({
                success: false,
                message: 'Email hoặc mật khẩu không đúng'
            });
        }

        // Compare password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Email hoặc mật khẩu không đúng'
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
        const { name, email, password, phone, dob} = req.body;

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
            dob,
            role: 1, // Default role for normal user
            verified: false,
            verificationToken,
            verificationTokenExpires: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
        });

        // Save user to database
        await newUser.save();

        // Send verification email
        const emailSent = await exports.sendVerificationEmail(email, verificationToken);
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

exports.sendVerificationEmail = async (email, verificationToken) => {
    // Tạo URL xác thực với đầy đủ thông tin
    const verificationUrl = `${process.env.BASE_URL || 'http://localhost:3000'}/auth/verify-email?token=${verificationToken}`;
  
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
                <a href="${process.env.CLIENT_URL || 'http://localhost:3000'}/login" class="button">Login</a>
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
