import mongoose from "mongoose";

const cartItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  image: {
    type: String,
    default: "",
  },
  size: {
    type: String,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
    default: 1,
  },
  slug: {
    type: String,
    required: true,
  },
  addedAt: {
    type: Date,
    default: Date.now,
  },
});

const cartSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer", // Keeping your Customer model reference
      required: true,
      unique: true,
    },
    items: [cartItemSchema],
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save middleware to clean up items and update timestamp
cartSchema.pre("save", function (next) {
  // Remove items with zero or negative quantity
  this.items = this.items.filter(item => item.quantity > 0);
  this.updatedAt = Date.now();
  next();
});

// Calculate total items and price virtuals
cartSchema.virtual("totalItems").get(function () {
  return this.items.reduce((total, item) => total + item.quantity, 0);
});

cartSchema.virtual("totalPrice").get(function () {
  return this.items.reduce((total, item) => total + item.price * item.quantity, 0);
});

// Ensure virtuals are included in JSON output
cartSchema.set("toJSON", { virtuals: true });
cartSchema.set("toObject", { virtuals: true });

// Index for faster queries
cartSchema.index({ updatedAt: 1 });

const Cart = mongoose.models.Cart || mongoose.model("Cart", cartSchema);

export default Cart;