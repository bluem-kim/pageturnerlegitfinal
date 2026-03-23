const express = require("express");
const fs = require("fs/promises");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { OAuth2Client } = require("google-auth-library");

const User = require("../models/User");
const { auth, adminOnly } = require("../middleware/auth");
const { saveJwtToken } = require("../utils/jwtSqliteStore");
const upload = require("../middleware/upload");
const { uploadImageBuffer, uploadImage } = require("../config/cloudinary");
const { sendOTPEmail } = require("../utils/email");

const { sendPushNotificationToUser } = require("../utils/pushNotifications");

const router = express.Router();
const GOOGLE_WEB_CLIENT_ID = String(process.env.GOOGLE_WEB_CLIENT_ID || "").trim();
const GOOGLE_ANDROID_CLIENT_ID = String(process.env.GOOGLE_ANDROID_CLIENT_ID || "").trim();
const googleClient = GOOGLE_WEB_CLIENT_ID ? new OAuth2Client(GOOGLE_WEB_CLIENT_ID) : null;
const GOOGLE_AUDIENCES = [GOOGLE_WEB_CLIENT_ID, GOOGLE_ANDROID_CLIENT_ID].filter(Boolean);
const PUSH_TOKEN_STALE_DAYS = 90;

const buildAuthPayload = (user) => {
  const token = jwt.sign(
    {
      userId: user.id,
      isAdmin: user.isAdmin,
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
  // Store JWT in SQLite for compliance
  saveJwtToken(user.id, token).catch(() => null);
  return {
    email: user.email,
    name: user.name,
    phone: user.phone,
    birthday: user.birthday,
    address: user.address,
    avatar: user.avatar,
    userId: user.id,
    isAdmin: user.isAdmin,
    isActive: user.isActive,
    token,
  };
};

router.get("/", auth, adminOnly, async (req, res) => {
  const users = await User.find().select("-passwordHash").sort({ createdAt: -1 });
  res.json(users);
});

router.put("/:id/status", auth, adminOnly, async (req, res) => {
  const { isActive } = req.body;
  if (typeof isActive !== "boolean") {
    return res.status(400).json({ message: "isActive must be boolean" });
  }

  const user = await User.findById(req.params.id);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  if (String(user._id) === String(req.user.userId) && !isActive) {
    return res.status(400).json({ message: "You cannot deactivate your own account" });
  }

  user.isActive = isActive;
  await user.save();

  return res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    isAdmin: user.isAdmin,
    isActive: user.isActive,
  });
});

router.put("/:id/role", auth, adminOnly, async (req, res) => {
  const { isAdmin } = req.body;
  if (typeof isAdmin !== "boolean") {
    return res.status(400).json({ message: "isAdmin must be boolean" });
  }

  const user = await User.findById(req.params.id);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  if (String(user._id) === String(req.user.userId) && !isAdmin) {
    return res.status(400).json({ message: "You cannot demote your own admin role" });
  }

  user.isAdmin = isAdmin;
  await user.save();

  return res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    isAdmin: user.isAdmin,
    isActive: user.isActive,
  });
});

router.get("/get/count", auth, adminOnly, async (req, res) => {
  const count = await User.countDocuments();
  res.json({ userCount: count });
});

router.get("/profile", auth, async (req, res) => {
  const user = await User.findById(req.user.userId).select("-passwordHash");
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }
  return res.json(user);
});

router.post("/request-password-otp", auth, async (req, res) => {
  const user = await User.findById(req.user.userId);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  user.passwordResetOTP = otp;
  user.passwordResetOTPExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 mins
  await user.save();

  await sendOTPEmail(user.email, user.name, otp);

  return res.json({ message: "OTP sent to your email" });
});

router.post("/forgot-password/request-otp", async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  user.passwordResetOTP = otp;
  user.passwordResetOTPExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 mins
  await user.save();

  await sendOTPEmail(user.email, user.name, otp);

  return res.json({ message: "OTP sent to your email" });
});

router.post("/forgot-password/reset", async (req, res) => {
  const { email, otp, newPassword, confirmNewPassword } = req.body;

  if (!email || !otp || !newPassword || !confirmNewPassword) {
    return res.status(400).json({ message: "All fields are required" });
  }

  if (String(newPassword).length < 6) {
    return res.status(400).json({ message: "New password must be at least 6 characters" });
  }

  if (!/[A-Z]/.test(String(newPassword))) {
    return res.status(400).json({ message: "New password must contain at least one uppercase letter" });
  }

  if (!/[0-9]/.test(String(newPassword))) {
    return res.status(400).json({ message: "New password must contain at least one number" });
  }

  if (newPassword !== confirmNewPassword) {
    return res.status(400).json({ message: "New password confirmation does not match" });
  }

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  // Verify OTP
  if (!user.passwordResetOTP || user.passwordResetOTP !== otp) {
    return res.status(400).json({ message: "Invalid OTP" });
  }

  if (!user.passwordResetOTPExpires || user.passwordResetOTPExpires < new Date()) {
    return res.status(400).json({ message: "OTP has expired" });
  }

  user.passwordHash = await bcrypt.hash(String(newPassword), 10);
  user.passwordResetOTP = null;
  user.passwordResetOTPExpires = null;
  await user.save();

  return res.json({ message: "Password reset successfully" });
});

router.post("/change-password", auth, async (req, res) => {
  const { oldPassword, newPassword, confirmNewPassword, otp } = req.body;

  if (!oldPassword || !newPassword || !confirmNewPassword || !otp) {
    return res.status(400).json({ message: "All fields including OTP are required" });
  }

  if (String(newPassword).length < 6) {
    return res.status(400).json({ message: "New password must be at least 6 characters" });
  }

  if (!/[A-Z]/.test(String(newPassword))) {
    return res.status(400).json({ message: "New password must contain at least one uppercase letter" });
  }

  if (!/[0-9]/.test(String(newPassword))) {
    return res.status(400).json({ message: "New password must contain at least one number" });
  }

  if (newPassword !== confirmNewPassword) {
    return res.status(400).json({ message: "New password confirmation does not match" });
  }

  const current = await User.findById(req.user.userId);
  if (!current) {
    return res.status(404).json({ message: "User not found" });
  }

  // Verify OTP
  if (!current.passwordResetOTP || current.passwordResetOTP !== otp) {
    return res.status(400).json({ message: "Invalid OTP" });
  }

  if (!current.passwordResetOTPExpires || current.passwordResetOTPExpires < new Date()) {
    return res.status(400).json({ message: "OTP has expired" });
  }

  const oldPasswordMatch = await bcrypt.compare(oldPassword, current.passwordHash);
  if (!oldPasswordMatch) {
    return res.status(400).json({ message: "Old password is incorrect" });
  }

  current.passwordHash = await bcrypt.hash(String(newPassword), 10);
  current.passwordResetOTP = null;
  current.passwordResetOTPExpires = null;
  await current.save();

  return res.json({ message: "Password changed successfully" });
});

const updateProfile = async (req, res) => {
  const current = await User.findById(req.user.userId);
  if (!current) {
    return res.status(404).json({ message: "User not found" });
  }

  const nextEmail = req.body.email ? String(req.body.email).toLowerCase() : current.email;
  if (nextEmail !== current.email) {
    const duplicate = await User.findOne({ email: nextEmail, _id: { $ne: current._id } });
    if (duplicate) {
      return res.status(400).json({ message: "Email already exists" });
    }
  }

  const updatePayload = {
    name: req.body.name ?? current.name,
    email: nextEmail,
    phone: req.body.phone ?? current.phone,
    birthday: req.body.birthday ?? current.birthday,
    address: req.body.address ?? current.address,
    avatar: req.body.avatar ?? current.avatar,
  };

  if (req.file?.buffer) {
    const uploaded = await uploadImageBuffer(req.file.buffer, "pageturnerr/users");
    updatePayload.avatar = uploaded.secure_url;
  } else if (req.file?.path) {
    try {
      const uploaded = await uploadImage(req.file.path, "pageturnerr/users");
      updatePayload.avatar = uploaded.secure_url;
    } finally {
      await fs.unlink(req.file.path).catch(() => null);
    }
  }

  const updated = await User.findByIdAndUpdate(req.user.userId, updatePayload, {
    new: true,
  }).select("-passwordHash");

  return res.json(updated);
};

router.put("/profile", auth, upload.single("avatar"), updateProfile);
router.post("/profile", auth, upload.single("avatar"), updateProfile);

router.post("/push-token/test", auth, async (req, res) => {
  const user = await User.findById(req.user.userId);
  if (!user) return res.status(404).json({ message: "User not found" });

  try {
    const tickets = await sendPushNotificationToUser(
      user,
      "Test Notification",
      "If you see this, push notifications are working!",
      { type: "test" }
    );
    res.json({ message: "Test notification sent", tickets });
  } catch (error) {
    res.status(500).json({ message: "Failed to send test push", error: error.message });
  }
});

router.post("/push-token", auth, async (req, res) => {
  const token = String(req.body?.token || "").trim();
  const platform = String(req.body?.platform || "unknown").trim() || "unknown";

  console.log(`[User] Received push token request from ${req.user.userId}. Platform: ${platform}`);

  if (!token) {
    console.error("[User] Push token registration failed: Token is empty");
    return res.status(400).json({ message: "Push token is required" });
  }

  const staleCutoff = new Date(Date.now() - PUSH_TOKEN_STALE_DAYS * 24 * 60 * 60 * 1000);
  const now = new Date();

  const user = await User.findById(req.user.userId).select("pushTokens");
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  const nextTokens = (user.pushTokens || []).filter((entry) => {
    if (!entry?.token) return false;
    if (entry.token === token) return false;
    return new Date(entry.updatedAt || 0) > staleCutoff;
  });
  nextTokens.push({ token, platform, updatedAt: now });

  const updatedUser = await User.findByIdAndUpdate(
    req.user.userId,
    {
      $set: {
        pushTokens: nextTokens,
      },
    },
    {
      new: true,
      projection: { pushTokens: 1 },
    }
  );

  if (!updatedUser) {
    return res.status(404).json({ message: "User not found" });
  }

  return res.json({
    message: "Push token saved",
    tokenCount: (updatedUser.pushTokens || []).length,
  });
});

router.delete("/push-token", auth, async (req, res) => {
  const token = String(req.body?.token || "").trim();
  if (!token) {
    return res.status(400).json({ message: "Push token is required" });
  }

  const user = await User.findById(req.user.userId).select("pushTokens");
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  const before = (user.pushTokens || []).length;
  const updatedUser = await User.findByIdAndUpdate(
    req.user.userId,
    {
      $pull: {
        pushTokens: { token },
      },
    },
    {
      new: true,
      projection: { pushTokens: 1 },
    }
  );

  if (!updatedUser) {
    return res.status(404).json({ message: "User not found" });
  }

  return res.json({
    message: "Push token removed",
    removed: before - (updatedUser.pushTokens || []).length,
  });
});

router.post("/register", async (req, res) => {
  const { name, email, password, phone, isAdmin } = req.body;

  const exists = await User.findOne({ email: email?.toLowerCase() });
  if (exists) {
    return res.status(400).json({ message: "Email already exists" });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({
    name,
    email: email.toLowerCase(),
    passwordHash,
    phone,
    birthday: "",
    address: "",
    avatar: "",
    isAdmin: Boolean(isAdmin),
    isActive: true,
  });

  return res.status(201).json({
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    birthday: user.birthday,
    address: user.address,
    avatar: user.avatar,
    isAdmin: user.isAdmin,
    isActive: user.isActive,
  });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email: email?.toLowerCase() });
  if (!user) {
    return res.status(400).json({ message: "Invalid credentials" });
  }

  if (!user.isActive) {
    return res.status(403).json({ message: "Account is deactivated" });
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordValid) {
    return res.status(400).json({ message: "Invalid credentials" });
  }

  return res.json(buildAuthPayload(user));
});

router.post("/login/google", async (req, res) => {
  if (!GOOGLE_AUDIENCES.length || !googleClient) {
    return res.status(500).json({ message: "Google login is not configured on server" });
  }

  const idToken = String(req.body?.idToken || "").trim();
  if (!idToken) {
    return res.status(400).json({ message: "Google idToken is required" });
  }

  let ticket;
  try {
    ticket = await googleClient.verifyIdToken({
      idToken,
      audience: GOOGLE_AUDIENCES,
    });
  } catch (error) {
    return res.status(401).json({ message: "Invalid Google token" });
  }

  const payload = ticket.getPayload() || {};
  const email = String(payload.email || "").toLowerCase();

  if (!payload.email_verified || !email) {
    return res.status(400).json({ message: "Google account email is not verified" });
  }

  let user = await User.findOne({ email });

  if (!user) {
    const randomPassword = crypto.randomBytes(24).toString("hex");
    const passwordHash = await bcrypt.hash(randomPassword, 10);

    user = await User.create({
      name: String(payload.name || email.split("@")[0] || "Google User"),
      email,
      passwordHash,
      phone: "",
      birthday: "",
      address: "",
      avatar: String(payload.picture || ""),
      isAdmin: false,
      isActive: true,
    });
  } else {
    if (!user.isActive) {
      return res.status(403).json({ message: "Account is deactivated" });
    }

    let changed = false;
    if (!user.avatar && payload.picture) {
      user.avatar = String(payload.picture);
      changed = true;
    }
    if (!user.name && payload.name) {
      user.name = String(payload.name);
      changed = true;
    }
    if (changed) {
      await user.save();
    }
  }

  return res.json(buildAuthPayload(user));
});

router.get("/:id", auth, async (req, res) => {
  if (!req.user.isAdmin && req.user.userId !== req.params.id) {
    return res.status(403).json({ message: "Forbidden" });
  }

  const user = await User.findById(req.params.id).select("-passwordHash");
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }
  return res.json(user);
});

module.exports = router;
