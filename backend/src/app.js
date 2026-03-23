const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const multer = require("multer");

const categoriesRoutes = require("./routes/categories");
const productsRoutes = require("./routes/products");
const usersRoutes = require("./routes/users");
const ordersRoutes = require("./routes/orders");
const promotionsRoutes = require("./routes/promotions");


const app = express();

// Disable ETag and force no-cache headers for all responses
app.disable('etag');
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.get("/api/v1/health", (req, res) => {
  res.json({ ok: true, message: "API is healthy" });
});

app.use("/api/v1/categories", categoriesRoutes);
app.use("/api/v1/products", productsRoutes);
app.use("/api/v1/users", usersRoutes);
app.use("/api/v1/orders", ordersRoutes);
app.use("/api/v1/promotions", promotionsRoutes);

app.use((err, req, res, next) => {
  if (!err) return next();

  console.error(`[API ERROR] ${req.method} ${req.originalUrl}: ${err.message}`);
  if (err.stack) {
    console.error(err.stack);
  }

  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ message: "Image too large. Max 15MB per image." });
    }
    if (err.code === "LIMIT_UNEXPECTED_FILE") {
      return res.status(400).json({ message: "Too many images uploaded in one request." });
    }
    return res.status(400).json({ message: err.message || "Upload failed" });
  }

  return res.status(500).json({ message: err.message || "Server error" });
});

app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

module.exports = app;
