require('dotenv').config();

const nodemailer = require("nodemailer");
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || "smtp.gmail.com",
  port: process.env.EMAIL_PORT || 587,
  secure: false, // true for port 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER || "vinhnm203@gmail.com",
    pass: process.env.EMAIL_PASSWORD,
  },
});

exports.MailForgotPass = async (receiver, otp) => {
  try {
    // Validation
    if (!receiver || !receiver.email || !receiver.name) {
      throw new Error('Thông tin người nhận không hợp lệ');
    }
    if (!otp || typeof otp !== 'string' || otp.length !== 6) {
      throw new Error('Mã OTP không hợp lệ');
    }

    const info = await transporter.sendMail({
      from: `"${process.env.EMAIL_USER}"`,
      to: receiver.email,
      subject: "Mã OTP để đặt lại mật khẩu",
      text: `Kính gửi ${receiver.name},

Chúng tôi đã nhận được yêu cầu đặt lại mật khẩu từ tài khoản của bạn. 
Mã OTP của bạn là: ${otp}

Mã OTP này sẽ hết hạn sau 5 phút.
Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.

Trân trọng,
Hệ thống hỗ trợ`,

      html: `
        <div style="background-color: #f4f4f4; padding: 20px;">
            <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                    <td align="center" valign="top">
                        <table width="600" border="0" cellspacing="0" cellpadding="0" style="background: url('https://news.umanitoba.ca/wp-content/uploads/2021/11/Career-Month-1-UM-Today-1536x1027.png') no-repeat center center; background-size: cover; padding: 40px; border-radius: 10px;">
                            <tr>
                                <td align="center" style="padding: 20px; background-color: rgba(255, 255, 255, 0.8); border-radius: 10px;">
                                    <h2 style="color: #333;">Kính gửi <strong>${receiver.name}</strong>,</h2>
                                    <p style="color: #555; font-size: 16px;">
                                        Chúng tôi đã nhận được yêu cầu đặt lại mật khẩu từ tài khoản của bạn.
                                    </p>
                                    <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                                        <h3 style="color: #333; margin: 0;">Mã OTP của bạn là:</h3>
                                        <p style="color: #007bff; font-size: 24px; font-weight: bold; margin: 10px 0;">${otp}</p>
                                        <p style="color: #6c757d; font-size: 14px; margin: 0;">Mã này sẽ hết hạn sau 5 phút</p>
                                    </div>
                                    <p style="color: #555; font-size: 16px;">
                                        Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.
                                    </p>
                                    <p style="color: #333; font-weight: bold;">Trân trọng,</p>
                                    <p style="color: #333;">Hệ thống hỗ trợ</p>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </div>
        `,
    });
    console.log("Đã gửi email OTP thành công: %s", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Lỗi khi gửi email OTP:", error.message);
    throw error;
  }
};

exports.MailPasswordChanged = async (receiver) => {
  try {
    // Validation
    if (!receiver || !receiver.email || !receiver.name) {
      throw new Error('Thông tin người nhận không hợp lệ');
    }

    const info = await transporter.sendMail({
      from: `"${process.env.EMAIL_USER}"`,
      to: receiver.email,
      subject: "Thông báo thay đổi mật khẩu",
      text: `Kính gửi ${receiver.name},

Mật khẩu tài khoản của bạn đã được thay đổi thành công.

Nếu bạn không thực hiện thay đổi này, vui lòng liên hệ ngay với chúng tôi để được hỗ trợ.

Trân trọng,
Hệ thống hỗ trợ`,

      html: `
        <div style="background-color: #f4f4f4; padding: 20px;">
            <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                    <td align="center" valign="top">
                        <table width="600" border="0" cellspacing="0" cellpadding="0" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; border-radius: 10px;">
                            <tr>
                                <td align="center" style="padding: 20px; background-color: rgba(255, 255, 255, 0.95); border-radius: 10px;">
                                    <h2 style="color: #333; margin-bottom: 20px;">Kính gửi <strong>${receiver.name}</strong>,</h2>
                                    
                                    <div style="background-color: #e8f5e8; padding: 20px; border-radius: 8px; border-left: 4px solid #28a745; margin: 20px 0;">
                                        <h3 style="color: #28a745; margin: 0 0 10px 0;">✅ Mật khẩu đã được thay đổi thành công</h3>
                                        <p style="color: #555; font-size: 16px; margin: 0;">
                                            Tài khoản của bạn đã được cập nhật với mật khẩu mới.
                                        </p>
                                    </div>
                                    
                                    <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; border-left: 4px solid #ffc107; margin: 20px 0;">
                                        <h4 style="color: #856404; margin: 0 0 10px 0;">⚠️ Lưu ý bảo mật:</h4>
                                        <ul style="color: #856404; margin: 0; padding-left: 20px;">
                                            <li>Không chia sẻ mật khẩu với bất kỳ ai</li>
                                            <li>Sử dụng mật khẩu mạnh và độc đáo</li>
                                            <li>Đăng xuất khỏi các thiết bị không tin cậy</li>
                                        </ul>
                                    </div>
                                    
                                    <div style="background-color: #f8d7da; padding: 15px; border-radius: 8px; border-left: 4px solid #dc3545; margin: 20px 0;">
                                        <p style="color: #721c24; font-size: 14px; margin: 0;">
                                            <strong>Nếu bạn không thực hiện thay đổi này, vui lòng liên hệ ngay với chúng tôi để được hỗ trợ.</strong>
                                        </p>
                                    </div>
                                    
                                    <p style="color: #333; font-weight: bold; margin-top: 30px;">Trân trọng,</p>
                                    <p style="color: #333;">Hệ thống hỗ trợ Pet Nest</p>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </div>
        `,
    });
    console.log("Đã gửi email thông báo đổi mật khẩu thành công: %s", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Lỗi khi gửi email thông báo đổi mật khẩu:", error.message);
    throw error;
  }
};

exports.sendMail = async (to, subject, html) => {
  const info = await transporter.sendMail({
    from: `"${process.env.EMAIL_USER}"`,
    to,
    subject,
    html
  });
  console.log("Đã gửi email voucher thành công: %s", info.messageId);
  return { success: true, messageId: info.messageId };
};


