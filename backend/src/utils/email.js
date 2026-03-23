const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "sandbox.smtp.mailtrap.io",
  port: 2525,
  auth: {
    user: "a91e4630544112",
    pass: "62193409a73099",
  },
});

const formatPHP = (val) => "₱" + Number(val || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 });

const sendOrderEmail = async (user, order, statusLabel) => {
  const orderId = String(order.id || order._id).slice(-8).toUpperCase();
  const itemsHtml = (order.orderItems || [])
    .map(
      (item) => `
      <tr style="border-bottom: 1px solid #EDE5DC;">
        <td style="padding: 12px 0; font-size: 14px;">
          <div style="font-weight: 700; color: #18120C;">${item.product?.name || "Product"}</div>
          <div style="font-size: 12px; color: #9A8A7A;">Qty: ${item.quantity}</div>
        </td>
        <td style="padding: 12px 0; text-align: right; font-weight: 700; color: #18120C;">
          ${formatPHP((item.product?.price || 0) * item.quantity)}
        </td>
      </tr>
    `
    )
    .join("");

  try {
    const info = await transporter.sendMail({
      from: '"PageTurner Support" <support@pageturner.com>',
      to: user.email,
      subject: `Order Update #${orderId}: ${statusLabel}`,
      html: `
        <div style="font-family: 'Helvetica', Arial, sans-serif; background-color: #FFFAF6; padding: 40px 20px; color: #18120C;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border-radius: 24px; overflow: hidden; border: 1px solid #EDE5DC; box-shadow: 0 10px 30px rgba(24,18,12,0.05);">
            
            <div style="background-color: #F4821F; padding: 30px; text-align: center;">
              <h1 style="color: #FFFFFF; margin: 0; font-size: 24px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px;">Order Updated</h1>
            </div>

            <div style="padding: 30px;">
              <p style="font-size: 16px; margin-top: 0;">Hello <strong style="color: #B85E0E;">${user.name}</strong>,</p>
              <p style="font-size: 15px; line-height: 1.6; color: #5C3A1E;">
                Great news! Your order <strong style="color: #18120C;">#${orderId}</strong> status has been updated to: 
                <span style="display: inline-block; padding: 4px 12px; background-color: #FEF0E3; color: #B85E0E; border-radius: 99px; font-weight: 800; font-size: 13px; margin-left: 4px;">
                  ${statusLabel.toUpperCase()}
                </span>
              </p>

              <div style="margin: 30px 0; border-top: 2px solid #F7F2EC; padding-top: 20px;">
                <h3 style="font-size: 13px; color: #9A8A7A; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 15px;">Order Summary</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  ${itemsHtml}
                </table>
              </div>

              <div style="background-color: #F7F2EC; border-radius: 16px; padding: 20px; margin-bottom: 30px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                  <span style="font-size: 14px; color: #9A8A7A;">Subtotal</span>
                  <span style="font-size: 14px; font-weight: 700;">${formatPHP(order.totalPrice + (order.discountAmount || 0) - (order.shippingFee || 0))}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                  <span style="font-size: 14px; color: #9A8A7A;">Shipping</span>
                  <span style="font-size: 14px; font-weight: 700;">+ ${formatPHP(order.shippingFee)}</span>
                </div>
                ${order.discountAmount > 0 ? `
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px; color: #22C55E;">
                  <span style="font-size: 14px;">Discount</span>
                  <span style="font-size: 14px; font-weight: 700;">- ${formatPHP(order.discountAmount)}</span>
                </div>` : ""}
                <div style="display: flex; justify-content: space-between; margin-top: 15px; border-top: 1px solid #EDE5DC; padding-top: 15px;">
                  <span style="font-size: 18px; font-weight: 900; color: #18120C;">Total</span>
                  <span style="font-size: 18px; font-weight: 900; color: #F4821F;">${formatPHP(order.totalPrice)}</span>
                </div>
              </div>

              <div style="text-align: center;">
                <p style="font-size: 13px; color: #9A8A7A; margin-bottom: 0;">Thank you for choosing PageTurner!</p>
              </div>
            </div>
          </div>
        </div>
      `,
    });
    console.log("Order update email sent: %s", info.messageId);
  } catch (error) {
    console.error("Error sending order email:", error);
  }
};

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
  sendOrderEmail,
  sendOTPEmail,
};
