const jwt = require("jsonwebtoken");
const User = require("../models/User");

const auth = async (req, res, next) => {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.split(" ")[1]
    : null;

  if (!token) {
    console.warn(`[Auth] Missing token for request: ${req.method} ${req.originalUrl}`);
    return res.status(401).json({ message: "Missing auth token" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.userId).select("isAdmin isActive");
    if (!user) {
      console.error(`[Auth] User ${decoded.userId} not found for provided token.`);
      return res.status(401).json({ message: "User not found" });
    }

    if (!user.isActive) {
      console.warn(`[Auth] Deactivated user ${user.id} attempted to access API.`);
      return res.status(401).json({ message: "Account is deactivated" });
    }

    req.user = {
      userId: user.id,
      isAdmin: Boolean(user.isAdmin),
    };

    return next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

const adminOnly = (req, res, next) => {
  if (!req.user?.isAdmin) {
    console.warn(`[Auth] Forbidden: Non-admin ${req.user?.userId} tried to access ${req.method} ${req.originalUrl}`);
    return res.status(403).json({ message: "Admin access required" });
  }
  return next();
};

module.exports = {
  auth,
  adminOnly,
};
