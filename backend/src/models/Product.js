const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    richDescription: { type: String, default: "" },
    image: { type: String, default: "" },
    images: { type: [String], default: [] },
    author: { type: String, default: "" },
    brand: { type: String, default: "" },
    price: { type: Number, default: 0 },
    genre: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    subGenres: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category",
      },
    ],
    countInStock: { type: Number, default: 0, min: 0 },
    lowStockThreshold: { type: Number, default: 5 },
    rating: { type: Number, default: 0 },
    numReviews: { type: Number, default: 0 },
    purchasedCount: { type: Number, default: 0 },
    isArchived: { type: Boolean, default: false },
    reviews: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        name: { type: String, default: "" },
        rating: { type: Number, required: true, min: 1, max: 5 },
        comment: { type: String, default: "" },
        images: { type: [String], default: [] },
        order: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Order",
          required: true,
        },
        isArchived: { type: Boolean, default: false },
        reply: {
          comment: { type: String, default: "" },
          createdAt: { type: Date, default: Date.now },
        },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    isFeatured: { type: Boolean, default: false },
  },
  { timestamps: true }
);

productSchema.virtual("id").get(function getId() {
  return this._id.toHexString();
});

productSchema.set("toJSON", { virtuals: true });

module.exports = mongoose.model("Product", productSchema);
