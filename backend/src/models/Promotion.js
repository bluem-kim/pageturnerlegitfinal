const mongoose = require("mongoose");

const promotionSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    couponCode: { type: String, trim: true, unique: true, sparse: true },
    discountPercentage: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    applyToShipping: { type: Boolean, default: false },
    startDate: { type: Date, default: Date.now },
    endDate: { type: Date },
    isActive: { type: Boolean, default: true },
    image: { type: String, default: "" },
    isArchived: { type: Boolean, default: false },
    usedBy: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        usedAt: { type: Date, default: Date.now },
      },
    ],
    products: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
    ],
  },
  { timestamps: true }
);

promotionSchema.virtual("id").get(function getId() {
  return this._id.toHexString();
});

promotionSchema.set("toJSON", { virtuals: true });

module.exports = mongoose.model("Promotion", promotionSchema);
