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

const exportData = async () => {
  try {
    await connectDB();
    console.log("Connected to database for exporting...");

    const categories = await Category.find({});
    const products = await Product.find({});
    const users = await User.find({});
    const orders = await Order.find({});
    const orderItems = await OrderItem.find({});

    const data = {
      categories,
      products,
      users,
      orders,
      orderItems,
    };

    const filePath = path.join(__dirname, "db_dump.json");
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

    console.log(`Successfully exported data to ${filePath}`);
    process.exit(0);
  } catch (error) {
    console.error("Export failed:", error);
    process.exit(1);
  }
};

exportData();
