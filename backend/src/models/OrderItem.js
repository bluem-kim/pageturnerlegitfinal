const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema(
  {
    quantity: { type: Number, required: true, min: 1 },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
  },
  { timestamps: true }
);

orderItemSchema.virtual("id").get(function getId() {
  return this._id.toHexString();
});

orderItemSchema.set("toJSON", { virtuals: true });

module.exports = mongoose.model("OrderItem", orderItemSchema);
