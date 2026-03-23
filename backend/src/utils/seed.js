const path = require("path");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });

const connectDB = require("../config/db");
const Category = require("../models/Category");
const Product = require("../models/Product");
const User = require("../models/User");
const Order = require("../models/Order");
const OrderItem = require("../models/OrderItem");

const seedData = async () => {
  try {
    await connectDB();
    console.log("Connected to database for seeding...");

    // Clear existing data
    await Category.deleteMany({});
    await Product.deleteMany({});
    await User.deleteMany({});
    await Order.deleteMany({});
    await OrderItem.deleteMany({});
    console.log("Cleared existing data.");

    // 1. Seed Categories
    const categories = await Category.insertMany([
      { name: "Fiction", description: "Creative stories and novels" },
      { name: "Non-Fiction", description: "Fact-based books and biographies" },
      { name: "Science Fiction", description: "Futuristic and scientific themes" },
      { name: "Fantasy", description: "Magical and mythical worlds" },
      { name: "Mystery", description: "Suspense and crime novels" },
    ]);
    console.log(`Seeded ${categories.length} categories.`);

    // 2. Seed Users
    const hashedPassword = await bcrypt.hash("password123", 10);
    const users = await User.insertMany([
      {
        name: "Admin User",
        email: "admin@pageturner.test",
        passwordHash: hashedPassword,
        isAdmin: true,
        phone: "09123456789",
        address: "Admin St, Manila",
      },
      {
        name: "Sample User",
        email: "user@pageturner.test",
        passwordHash: hashedPassword,
        isAdmin: false,
        phone: "09987654321",
        address: "User Ave, Cebu",
      },
    ]);
    console.log(`Seeded ${users.length} users.`);

    // 3. Seed Products
    const products = await Product.insertMany([
      {
        name: "The Great Gatsby",
        description: "A classic novel about the American dream.",
        author: "F. Scott Fitzgerald",
        price: 499,
        category: categories[0]._id,
        countInStock: 50,
        image: "https://res.cloudinary.com/demo/image/upload/v1652345678/gatsby.jpg",
      },
      {
        name: "A Brief History of Time",
        description: "Stephen Hawking's guide to the cosmos.",
        author: "Stephen Hawking",
        price: 750,
        category: categories[1]._id,
        countInStock: 25,
        image: "https://res.cloudinary.com/demo/image/upload/v1652345679/brief_history.jpg",
      },
      {
        name: "Dune",
        description: "The epic science fiction saga.",
        author: "Frank Herbert",
        price: 899,
        category: categories[2]._id,
        countInStock: 15,
        image: "https://res.cloudinary.com/demo/image/upload/v1652345680/dune.jpg",
      },
      {
        name: "The Hobbit",
        description: "An adventure in Middle-earth.",
        author: "J.R.R. Tolkien",
        price: 599,
        category: categories[3]._id,
        countInStock: 30,
        image: "https://res.cloudinary.com/demo/image/upload/v1652345681/hobbit.jpg",
      },
    ]);
    console.log(`Seeded ${products.length} products.`);

    // 4. Seed a Sample Order
    const orderItem = await new OrderItem({
      quantity: 2,
      product: products[0]._id,
    }).save();

    const order = await new Order({
      orderItems: [orderItem._id],
      shippingAddress1: "123 Sample St",
      city: "Quezon City",
      zip: "1100",
      country: "Philippines",
      phone: "09123456789",
      user: users[1]._id,
      totalPrice: products[0].price * 2,
      status: "3", // Assuming "3" is a valid status
    }).save();
    console.log("Seeded sample order.");

    console.log("Seeding completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Seeding failed:", error);
    process.exit(1);
  }
};

seedData();
