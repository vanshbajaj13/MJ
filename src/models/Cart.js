// models/Cart.js - Updated with proper coupon schema
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

// Updated coupon schema with proper structure
const appliedCouponSchema = new mongoose.Schema(
  {
    couponId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Coupon",
      required: true,
    },
    code: {
      type: String,
      required: true,
      uppercase: true,
    },
    type: {
      type: String,
      enum: ['percentage', 'fixed', 'shipping'],
      required: true,
    },
    value: {
      type: Number,
      required: true,
    },
    description: {
      type: String,
      default: '',
    },
    // Total discount amount applied
    discountAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    // Shipping-specific discount (for shipping type coupons)
    shippingDiscount: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Per-item discount breakdown: { "productId-size": discountAmount }
    itemDiscounts: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    // Items that were eligible for this coupon
    eligibleItems: [{
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true,
      },
      size: String,
      quantity: Number,
      originalPrice: Number,
      discount: Number,
    }],
    appliedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false } // Don't create separate _id for subdocument
);

const cartSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      unique: true,
    },
    items: [cartItemSchema],
    appliedCoupon: {
      type: appliedCouponSchema,
      default: null,
    },
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
  this.items = this.items.filter((item) => item.quantity > 0);
  
  // If no items left, remove applied coupon
  if (this.items.length === 0) {
    this.appliedCoupon = null;
  }
  
  this.updatedAt = Date.now();
  next();
});

// Calculate totals with coupon consideration
cartSchema.methods.calculateTotals = function() {
  const subtotal = this.items.reduce((total, item) => 
    total + (item.price * item.quantity), 0
  );

  const totalItems = this.items.reduce((total, item) => 
    total + item.quantity, 0
  );

  let totalDiscount = 0;
  let shippingDiscount = 0;
  let itemDiscounts = {};

  if (this.appliedCoupon) {
    totalDiscount = this.appliedCoupon.discountAmount || 0;
    shippingDiscount = this.appliedCoupon.shippingDiscount || 0;
    itemDiscounts = this.appliedCoupon.itemDiscounts || {};
  }

  const finalTotal = Math.max(0, subtotal - totalDiscount);

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    totalItems,
    totalDiscount: Math.round(totalDiscount * 100) / 100,
    shippingDiscount: Math.round(shippingDiscount * 100) / 100,
    finalTotal: Math.round(finalTotal * 100) / 100,
    itemDiscounts,
    savings: Math.round(totalDiscount * 100) / 100
  };
};

// Virtual properties for backward compatibility
cartSchema.virtual("totalItems").get(function () {
  return this.items.reduce((total, item) => total + item.quantity, 0);
});

cartSchema.virtual("totalPrice").get(function () {
  return this.items.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );
});

cartSchema.virtual("totalPriceAfterDiscount").get(function () {
  const totals = this.calculateTotals();
  return totals.finalTotal;
});

// Ensure virtuals are included in JSON output
cartSchema.set("toJSON", { virtuals: true });
cartSchema.set("toObject", { virtuals: true });

// Index for faster queries
// cartSchema.index({ userId: 1 });
cartSchema.index({ updatedAt: 1 });

const Cart = mongoose.models.Cart || mongoose.model("Cart", cartSchema);

export default Cart;