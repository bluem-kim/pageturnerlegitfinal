const express = require("express");

const Order = require("../models/Order");
const OrderItem = require("../models/OrderItem");
const Product = require("../models/Product");
const User = require("../models/User");
const { auth, adminOnly } = require("../middleware/auth");
const { sendPushNotificationToUser } = require("../utils/pushNotifications");

const router = express.Router();

const STATUS = {
  DELIVERED: "1",
  SHIPPED: "2",
  PENDING: "3",
  CANCELLED: "0",
};

const STATUS_LABELS = {
  [STATUS.DELIVERED]: "Delivered",
  [STATUS.SHIPPED]: "Shipped",
  [STATUS.PENDING]: "Pending",
  [STATUS.CANCELLED]: "Cancelled",
};

router.get("/", auth, async (req, res) => {
  const { includeArchived, archived } = req.query;
  let filter = {};
  if (!req.user.isAdmin) {
    filter = { user: req.user.userId };
  }

  if (archived === "1") {
    filter.isArchived = true;
  } else if (includeArchived !== "1") {
    filter.isArchived = { $ne: true };
  }

  const orders = await Order.find(filter)
    .populate("user", "name")
    .populate({
      path: "orderItems",
      populate: { path: "product", model: "Product" },
    })
    .sort({ createdAt: -1 });

  res.json(orders);
});

router.post("/", auth, async (req, res) => {
  console.log(`[Order] NEW ORDER REQUEST RECEIVED from user ${req.user.userId}`);
  const purchaseCounters = {};

  const orderItemsIds = await Promise.all(
    req.body.orderItems.map(async (orderItem) => {
      const product = await Product.findById(orderItem.product);
      if (!product) {
        throw new Error(`Product not found: ${orderItem.product}`);
      }

      const productId = String(orderItem.product);
      purchaseCounters[productId] = (purchaseCounters[productId] || 0) + Number(orderItem.quantity || 0);

      const createdItem = await OrderItem.create({
        quantity: orderItem.quantity,
        product: orderItem.product,
      });
      return createdItem._id;
    })
  );

  const orderItems = await OrderItem.find({ _id: { $in: orderItemsIds } }).populate(
    "product",
    "price"
  );

  const itemsTotal = orderItems.reduce((sum, item) => {
    const price = item.product?.price || 0;
    return sum + price * item.quantity;
  }, 0);

  const shippingFee = Number(req.body.shippingFee || 0);
  const discountAmount = Number(req.body.discountAmount || 0);
  const totalPrice = itemsTotal + (Number.isFinite(shippingFee) ? shippingFee : 0) - (Number.isFinite(discountAmount) ? discountAmount : 0);

  const paymentMethod =
    req.body.paymentMethod && ["Cash on Delivery", "Bank Transfer", "Card Payment"].includes(req.body.paymentMethod)
      ? req.body.paymentMethod
      : "Cash on Delivery";

  const shippingRegion =
    req.body.shippingRegion && ["luzon", "visayas", "mindanao", "overseas"].includes(String(req.body.shippingRegion).toLowerCase())
      ? String(req.body.shippingRegion).toLowerCase()
      : "luzon";

  const createdOrder = await Order.create({
    ...req.body,
    orderItems: orderItemsIds,
    user: req.body.user || req.user.userId,
    paymentMethod,
    shippingRegion,
    shippingFee: Number.isFinite(shippingFee) ? shippingFee : 0,
    discountAmount: Number.isFinite(discountAmount) ? discountAmount : 0,
    totalPrice: Math.max(0, totalPrice),
    status: STATUS.PENDING,
  });

  // Check for low stock on products
  try {
    const { sendPushNotificationToUser } = require("../utils/pushNotifications");
    const admins = await User.find({ isAdmin: true });
    
    for (const item of orderItems) {
      const product = await Product.findById(item.product._id || item.product.id);
      if (product) {
        const newStock = Math.max(0, product.countInStock - item.quantity);
        product.countInStock = newStock;
        await product.save();

        if (newStock <= (product.lowStockThreshold || 5)) {
          for (const adminUser of admins) {
            sendPushNotificationToUser(
              adminUser,
              "Low Stock Alert!",
              `${product.name} is running low (${newStock} left).`,
              { type: "product", productId: product.id }
            ).catch(() => null);
          }
        }
      }
    }
  } catch (err) {
    console.error("[Order] Low Stock Check Error:", err.message);
  }

  // Populate user for push notification
  const populatedOrder = await Order.findById(createdOrder.id).populate("user", "name email pushTokens");

  // Send Order Placed push notification
  if (populatedOrder.user) {
    const { sendPushNotificationToUser } = require("../utils/pushNotifications");
    console.log(`[Order] Attempting to send push notification to user: ${populatedOrder.user.email}`);
    
    // VERIFY TOKENS EXIST
    if (!populatedOrder.user.pushTokens || populatedOrder.user.pushTokens.length === 0) {
      console.warn(`[Order] User ${populatedOrder.user.email} has NO push tokens in database!`);
    } else {
      console.log(`[Order] User ${populatedOrder.user.email} has ${populatedOrder.user.pushTokens.length} tokens.`);
    }

    sendPushNotificationToUser(
      populatedOrder.user,
      "Order Placed successfully!",
      `Your order #${String(populatedOrder.id).slice(-8).toUpperCase()} has been received and is being processed.`,
      { type: "order", orderId: populatedOrder.id }
    )
    .then(res => console.log(`[Order] Push notification result for ${populatedOrder.user.email}:`, JSON.stringify(res)))
    .catch(err => console.error(`[Order] Push notification CRITICAL error for ${populatedOrder.user.email}:`, err.message));
  } else {
    console.warn("[Order] No user found for order, skipping push notification.");
  }

  // If a coupon was used, record it in the Promotion's usedBy array
  if (req.body.couponCode) {
    try {
      const Promotion = require("../models/Promotion");
      await Promotion.findOneAndUpdate(
        { couponCode: String(req.body.couponCode).toUpperCase() },
        { 
          $addToSet: { 
            usedBy: { 
              user: req.user.userId, 
              usedAt: new Date() 
            } 
          } 
        }
      );
    } catch (err) {
      console.error("[Order] Error recording coupon usage:", err.message);
    }
  }

  await Promise.all(
    Object.entries(purchaseCounters).map(([productId, quantity]) => {
      if (!Number.isFinite(quantity) || quantity <= 0) return null;
      return Product.findByIdAndUpdate(productId, {
        $inc: { purchasedCount: quantity },
      });
    })
  );

  const populated = await Order.findById(createdOrder.id)
    .populate("user", "name email")
    .populate({
      path: "orderItems",
      populate: { path: "product", model: "Product" },
    });

  return res.status(201).json(populated);
});

router.put("/:id", auth, adminOnly, async (req, res) => {
  console.log(`[Order] PUT /orders/${req.params.id} request from admin ${req.user.userId}. Body status: ${req.body.status}`);
  if (!Object.values(STATUS).includes(String(req.body.status))) {
    return res.status(400).json({ message: "Invalid status" });
  }

  // Admin cannot set to CANCELLED directly anymore via this route
  if (String(req.body.status) === STATUS.CANCELLED) {
    return res.status(400).json({
      message: "Admin cannot cancel orders directly. Users must request cancellation.",
    });
  }

  if (String(req.body.status) === STATUS.DELIVERED) {
    return res.status(400).json({
      message: "Delivered status must be confirmed by the user",
    });
  }

  const updated = await Order.findByIdAndUpdate(
    req.params.id,
    { status: req.body.status },
    { new: true }
  ).populate("user", "name email pushTokens");

  if (!updated) {
    return res.status(404).json({ message: "Order not found" });
  }

  // Send updates
  if (updated.user) {
    const statusLabel = STATUS_LABELS[String(req.body.status)] || "Updated";

    // Trigger push notification
    console.log(`[Order] Triggering push for order ${updated.id} status: ${statusLabel} for ${updated.user.email}`);
    
    sendPushNotificationToUser(
      updated.user,
      "Order Status Updated",
      `Your order #${String(updated.id).slice(-8).toUpperCase()} is now ${statusLabel}.`,
      { type: "order", orderId: updated.id }
    )
    .then(res => console.log(`[Order] Push result for ${updated.user.email}:`, res))
    .catch(err => console.error(`[Order] Push error for ${updated.user.email}:`, err.message));
  } else {
    console.warn(`[Order] User missing for order ${updated.id}, skipping notifications.`);
  }

  return res.json(updated);
});

router.post("/:id/request-cancel", auth, async (req, res) => {
  const { reason } = req.body;
  if (!reason || !reason.trim()) {
    return res.status(400).json({ message: "Reason is required for cancellation request" });
  }

  const order = await Order.findById(req.params.id).populate("user", "name email");
  if (!order) {
    return res.status(404).json({ message: "Order not found" });
  }

  if (String(order.user._id) !== req.user.userId) {
    return res.status(403).json({ message: "Forbidden" });
  }

  if (String(order.status) !== STATUS.PENDING) {
    return res.status(400).json({ message: "Only pending orders can be requested for cancellation" });
  }

  if (order.cancelRequest?.status === "pending") {
    return res.status(400).json({ message: "Cancellation request is already pending" });
  }

  order.cancelRequest = {
    reason: reason.trim(),
    status: "pending",
    requestDate: new Date(),
  };

  await order.save();

  return res.json({ message: "Cancellation request sent", order });
});

router.post("/:id/handle-cancel-request", auth, adminOnly, async (req, res) => {
  const { action } = req.body; // "approve" or "disapprove"
  if (!["approve", "disapprove"].includes(action)) {
    return res.status(400).json({ message: "Invalid action. Use 'approve' or 'disapprove'" });
  }

  const order = await Order.findById(req.params.id).populate("user", "name email pushTokens");
  if (!order) {
    return res.status(404).json({ message: "Order not found" });
  }

  if (order.cancelRequest?.status !== "pending") {
    return res.status(400).json({ message: "No pending cancellation request found" });
  }

  if (action === "approve") {
    order.status = STATUS.CANCELLED;
    order.cancelRequest.status = "approved";
  } else {
    order.cancelRequest.status = "disapproved";
  }

  await order.save();

  // Send updates
  if (order.user) {
    const statusLabel = action === "approve" ? "Cancellation Approved" : "Cancellation Disapproved";

    console.log(`[CancelRequest] Sending push notification for cancellation ${action} to ${order.user.email}`);
    sendPushNotificationToUser(
      order.user,
      "Order Update",
      `Your cancellation request for order #${String(order.id).slice(-8).toUpperCase()} was ${statusLabel.toLowerCase()}.`,
      { type: "order", orderId: order.id }
    )
    .then(res => console.log(`[CancelRequest] Push result for ${order.user.email}:`, res))
    .catch(err => console.error(`[CancelRequest] Push error for ${order.user.email}:`, err.message));
  } else {
    console.warn(`[CancelRequest] No user found for order ${order.id}, skipping push.`);
  }

  return res.json({ message: `Cancellation request ${action}d`, order });
});

router.post("/:id/cancel", auth, async (req, res) => {
  const order = await Order.findById(req.params.id).populate("user", "name email");
  if (!order) {
    return res.status(404).json({ message: "Order not found" });
  }

  // Only Admin can use this route now, and we should probably restrict it 
  // to be consistent with "Admin cannot cancel directly"
  if (!req.user.isAdmin) {
    return res.status(403).json({ message: "Users must use /request-cancel route" });
  }

  return res.status(400).json({ message: "Admin cannot cancel directly. Use /handle-cancel-request instead." });
});

router.post("/:id/confirm-delivered", auth, async (req, res) => {
  const order = await Order.findById(req.params.id).populate("user", "name email pushTokens");
  if (!order) {
    return res.status(404).json({ message: "Order not found" });
  }

  const isOwner = String(order.user._id) === req.user.userId;
  if (!isOwner) {
    return res.status(403).json({ message: "Forbidden" });
  }

  if (String(order.status) !== STATUS.SHIPPED) {
    return res.status(400).json({ message: "Only shipped orders can be confirmed as delivered" });
  }

  order.status = STATUS.DELIVERED;
  await order.save();

  // Send updates
  if (order.user) {
    console.log(`[ConfirmDelivered] Sending push notification to ${order.user.email}`);
    sendPushNotificationToUser(
      order.user,
      "Order Delivered",
      `Your order #${String(order.id).slice(-8).toUpperCase()} has been successfully delivered.`,
      { type: "order", orderId: order.id }
    )
    .then(res => console.log(`[ConfirmDelivered] Push result for ${order.user.email}:`, res))
    .catch(err => console.error(`[ConfirmDelivered] Push error for ${order.user.email}:`, err.message));
  } else {
    console.warn(`[ConfirmDelivered] No user found for order ${order.id}, skipping push.`);
  }

  return res.json(order);
});

router.delete("/:id", auth, adminOnly, async (req, res) => {
  const archived = await Order.findByIdAndUpdate(
    req.params.id,
    { isArchived: true },
    { new: true }
  );
  if (!archived) {
    return res.status(404).json({ message: "Order not found" });
  }

  return res.json({ message: "Order archived" });
});

router.put("/:id/archive", auth, adminOnly, async (req, res) => {
  const isArchived = typeof req.body?.isArchived === "boolean" ? req.body.isArchived : true;

  const updated = await Order.findByIdAndUpdate(
    req.params.id,
    { isArchived },
    { new: true }
  )
    .populate("user", "name")
    .populate({ path: "orderItems", populate: { path: "product", model: "Product" } });

  if (!updated) {
    return res.status(404).json({ message: "Order not found" });
  }

  return res.json(updated);
});

router.get("/get/totalsales", auth, adminOnly, async (req, res) => {
  const result = await Order.aggregate([
    {
      $group: {
        _id: null,
        totalsales: { $sum: "$totalPrice" },
      },
    },
  ]);

  if (!result.length) {
    return res.json({ totalsales: 0 });
  }

  return res.json({ totalsales: result[0].totalsales });
});

router.get("/get/count", auth, adminOnly, async (req, res) => {
  const count = await Order.countDocuments();
  return res.json({ orderCount: count });
});

router.get("/:id", auth, async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate("user", "name")
    .populate({
      path: "orderItems",
      populate: { path: "product", model: "Product" },
    });

  if (!order) {
    return res.status(404).json({ message: "Order not found" });
  }

  if (!req.user.isAdmin && String(order.user._id) !== req.user.userId) {
    return res.status(403).json({ message: "Forbidden" });
  }

  return res.json(order);
});

module.exports = router;
