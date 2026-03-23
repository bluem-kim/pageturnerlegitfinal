const express = require("express");
const fs = require("fs/promises");
const Promotion = require("../models/Promotion");
const { auth, adminOnly } = require("../middleware/auth");
const { sendPushNotificationToAll } = require("../utils/pushNotifications");
const upload = require("../middleware/upload");
const { uploadImage } = require("../config/cloudinary");

const router = express.Router();

// Helper to upload image to cloudinary
const uploadPromotionImage = async (file) => {
  if (!file) return null;
  const source = file.path || file.buffer;
  try {
    const uploaded = await uploadImage(source, "pageturnerr/promotions");
    return uploaded.secure_url;
  } finally {
    if (file.path) {
      await fs.unlink(file.path).catch(() => null);
    }
  }
};

// GET all active promotions (not archived)
router.get("/", async (req, res) => {
  const promotions = await Promotion.find({ 
    isActive: true,
    isArchived: false 
  }).sort({ createdAt: -1 });
  res.json(promotions);
});

// VALIDATE a coupon code
router.post("/validate", auth, async (req, res) => {
  const { code } = req.body;
  if (!code) {
    return res.status(400).json({ message: "Coupon code is required" });
  }

  const promotion = await Promotion.findOne({ 
    couponCode: code.toUpperCase(), 
    isActive: true,
    isArchived: false
  });

  if (!promotion) {
    return res.status(404).json({ message: "Invalid or expired coupon code" });
  }

  // Check if user already used this coupon
  const alreadyUsed = promotion.usedBy?.some(u => String(u.user) === req.user.userId);
  if (alreadyUsed) {
    return res.status(400).json({ message: "This coupon code can only be used once" });
  }

  // Check dates if applicable
  const now = new Date();
  if (promotion.startDate && promotion.startDate > now) {
    return res.status(400).json({ message: "Coupon is not yet active" });
  }
  if (promotion.endDate && promotion.endDate < now) {
    return res.status(400).json({ message: "Coupon has expired" });
  }

  res.json(promotion);
});

// GET all promotions (admin only)
router.get("/all", auth, adminOnly, async (req, res) => {
  const promotions = await Promotion.find().sort({ createdAt: -1 });
  res.json(promotions);
});

// GET single promotion
router.get("/:id", async (req, res) => {
  const promotion = await Promotion.findById(req.params.id).populate("products");
  if (!promotion) {
    return res.status(404).json({ message: "Promotion not found" });
  }
  res.json(promotion);
});

// CREATE a promotion (admin only)
router.post("/", auth, adminOnly, upload.single("image"), async (req, res) => {
  const { title, description, couponCode, discountPercentage, discountAmount, applyToShipping, startDate, endDate, products } = req.body;

  let imageUrl = req.body.image || "";
  if (req.file) {
    imageUrl = await uploadPromotionImage(req.file);
  }

  const promotion = new Promotion({
    title,
    description,
    couponCode: couponCode ? String(couponCode).toUpperCase() : undefined,
    discountPercentage: Number(discountPercentage) || 0,
    discountAmount: Number(discountAmount) || 0,
    applyToShipping: String(applyToShipping) === "true",
    startDate,
    endDate,
    products,
    image: imageUrl,
  });

  const createdPromotion = await promotion.save();

  // Send push notification to all users
  try {
    console.log(`[Route] Triggering push notification for new promotion: ${title}`);
    await sendPushNotificationToAll(
      `New Promotion: ${title}`,
      description,
      {
        promotionId: createdPromotion.id,
        type: "promotion",
      }
    );
  } catch (error) {
    console.error("[Route] Error sending push notification for promotion:", error.message);
  }

  res.status(201).json(createdPromotion);
});

// UPDATE a promotion (admin only)
router.put("/:id", auth, adminOnly, upload.single("image"), async (req, res) => {
  const { title, description, couponCode, discountPercentage, discountAmount, applyToShipping, startDate, endDate, isActive, isArchived, products } = req.body;

  const promotion = await Promotion.findById(req.params.id);
  if (!promotion) {
    return res.status(404).json({ message: "Promotion not found" });
  }

  let imageUrl = promotion.image;
  if (req.file) {
    imageUrl = await uploadPromotionImage(req.file);
  } else if (req.body.image) {
    imageUrl = req.body.image;
  }

  promotion.title = title ?? promotion.title;
  promotion.description = description ?? promotion.description;
  promotion.couponCode = couponCode ? String(couponCode).toUpperCase() : promotion.couponCode;
  promotion.discountPercentage = Number(discountPercentage) ?? promotion.discountPercentage;
  promotion.discountAmount = Number(discountAmount) ?? promotion.discountAmount;
  promotion.applyToShipping = applyToShipping !== undefined ? String(applyToShipping) === "true" : promotion.applyToShipping;
  promotion.startDate = startDate ?? promotion.startDate;
  promotion.endDate = endDate ?? promotion.endDate;
  promotion.isActive = isActive !== undefined ? String(isActive) === "true" : promotion.isActive;
  promotion.isArchived = isArchived !== undefined ? String(isArchived) === "true" : promotion.isArchived;
  promotion.products = products ?? promotion.products;
  promotion.image = imageUrl;

  const updatedPromotion = await promotion.save();
  res.json(updatedPromotion);
});

// ARCHIVE a promotion (admin only)
router.patch("/:id/archive", auth, adminOnly, async (req, res) => {
  const isArchived = req.body.isArchived !== undefined ? req.body.isArchived : true;
  const promotion = await Promotion.findByIdAndUpdate(
    req.params.id,
    { isArchived },
    { new: true }
  );
  if (!promotion) {
    return res.status(404).json({ message: "Promotion not found" });
  }
  res.json(promotion);
});

// DELETE a promotion (admin only)
router.delete("/:id", auth, adminOnly, async (req, res) => {
  const promotion = await Promotion.findByIdAndDelete(req.params.id);
  if (!promotion) {
    return res.status(404).json({ message: "Promotion not found" });
  }
  res.json({ message: "Promotion deleted" });
});

module.exports = router;
