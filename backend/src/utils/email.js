const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "sandbox.smtp.mailtrap.io",
  port: 2525,
  auth: {
    user: "a91e4630544112",
    pass: "62193409a73099",
  },
});

const sendOTPEmail = async (email, name, otp) => {
  try {
    const info = await transporter.sendMail({
      from: '"PageTurner Support" <support@pageturner.com>',
      to: email,
      subject: "Your OTP for Password Change",
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #333; text-align: center;">
          <h2 style="color: #F4821F;">Password Change Verification</h2>
          <p>Hello <strong>${name}</strong>,</p>
          <p>You requested to change your password. Use the following OTP to verify your request:</p>
          <div style="font-size: 32px; font-weight: bold; color: #F4821F; margin: 24px 0; letter-spacing: 4px;">
            ${otp}
          </div>
          <p style="font-size: 12px; color: #999;">This OTP will expire in 10 minutes. If you did not request this, please ignore this email.</p>
        </div>
      `,
    });
    console.log("OTP email sent: %s", info.messageId);
  } catch (error) {
    console.error("Error sending OTP email:", error);
  }
};

module.exports = {
  sendOTPEmail,
};
