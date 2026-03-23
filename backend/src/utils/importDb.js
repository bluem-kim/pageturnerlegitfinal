const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });

const connectDB = require("../config/db");
const Category = require("../models/Category");
const Product = require("../models/Product");
const User = require("../models/User");
const Order = require("../models/Order");
const OrderItem = require("../models/OrderItem");

const importData = async () => {
  try {
    await connectDB();
    console.log("Connected to database for importing...");

    const filePath = path.join(__dirname, "db_dump.json");
    if (!fs.existsSync(filePath)) {
      console.error("Error: db_dump.json not found. Run 'npm run export:db' first.");
      process.exit(1);
    }

    const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));

    // Clear existing data
    await Category.deleteMany({});
    await Product.deleteMany({});
    await User.deleteMany({});
    await Order.deleteMany({});
    await OrderItem.deleteMany({});
    console.log("Cleared existing data.");

    // Import data
    if (data.categories && data.categories.length > 0) {
      await Category.insertMany(data.categories);
      console.log(`Imported ${data.categories.length} categories.`);
    }

    if (data.users && data.users.length > 0) {
      await User.insertMany(data.users);
      console.log(`Imported ${data.users.length} users.`);
    }

    if (data.products && data.products.length > 0) {
      await Product.insertMany(data.products);
      console.log(`Imported ${data.products.length} products.`);
    }

    if (data.orderItems && data.orderItems.length > 0) {
      await OrderItem.insertMany(data.orderItems);
      console.log(`Imported ${data.orderItems.length} order items.`);
    }

    if (data.orders && data.orders.length > 0) {
      await Order.insertMany(data.orders);
      console.log(`Imported ${data.orders.length} orders.`);
    }

    console.log("Database import completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Import failed:", error);
    process.exit(1);
  }
};

importData();
