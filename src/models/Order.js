// src/models/Order.js
import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema({
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
  },
  slug: {
    type: String,
    required: true,
  },
});

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    // Customer Information
    customerPhone: {
      type: String,
      required: true,
      index: true,
    },
    customerEmail: {
      type: String,
      required: true,
    },
    customerName: {
      type: String,
      required: true,
    },

    // Order Items
    items: [orderItemSchema],

    // Shipping Address
    shippingAddress: {
      fullName: String,
      email: String,
      addressLine1: String,
      addressLine2: String,
      city: String,
      state: String,
      pincode: String,
      landmark: String,
      addressType: {
        type: String,
        enum: ["home", "office", "other"],
        default: "home",
      },
    },

    // Payment Information
    paymentDetails: {
      method: {
        type: String,
        enum: ["razorpay", "cod"],
        required: true,
      },
      status: {
        type: String,
        enum: ["pending", "completed", "failed", "refunded"],
        default: "pending",
      },
      // Razorpay specific fields
      razorpayOrderId: String,
      razorpayPaymentId: String,
      razorpaySignature: String,
      // COD specific fields
      codAmount: Number,
    },

    // Order Status
    orderStatus: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "processing",
        "shipped",
        "out_for_delivery",
        "delivered",
        "cancelled",
        "returned",
      ],
      default: "pending",
    },

    // Shipment Information
    shipmentDetails: {
      shipmentId: String,
      awbCode: String,
      courierName: String,
      trackingUrl: String,
      estimatedDelivery: Date,
      actualDelivery: Date,
    },

    // Pricing
    totals: {
      subtotal: { type: Number, required: true },
      totalItems: { type: Number, required: true },
      totalDiscount: { type: Number, default: 0 },
      shippingDiscount: { type: Number, default: 0 },
      finalTotal: { type: Number, required: true },
      itemDiscounts: { type: mongoose.Schema.Types.Mixed, default: {} },
      savings: { type: Number, default: 0 },
    },

    // Applied Coupon
    appliedCoupon: {
      couponId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Coupon",
        default: null,
      },
      code: String,
      type: String,
      value: Number,
      description: String,
      discountAmount: { type: Number, default: 0 },
      shippingDiscount: { type: Number, default: 0 },
      itemDiscounts: { type: mongoose.Schema.Types.Mixed, default: {} },
    },

    // Order Notes
    notes: {
      customerNotes: String,
      adminNotes: String,
      internalNotes: String,
    },
    sessionId: {
      type: String,
      index: true,
    },
    orderSource: {
      type: String,
      enum: ["buy_now", "cart_checkout"],
      required: true,
    },
    guestTrackingId: {
      type: String,
      default: null,
    },
    securityMetadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    paymentDetails: {
      method: {
        type: String,
        enum: ["razorpay"], // Only Razorpay now
        required: true,
      },
      razorpayOrderId: String,
      razorpayPaymentId: String,
      razorpaySignature: String,
      status: {
        type: String,
        enum: ["completed", "failed", "pending"],
        default: "pending",
      },
      paidAt: Date,
    },
    // Timestamps for order lifecycle
    orderDate: { type: Date, default: Date.now },
    confirmedAt: Date,
    shippedAt: Date,
    deliveredAt: Date,
    cancelledAt: Date,
  },
  {
    timestamps: true,
  }
);

// Generate order number
orderSchema.statics.generateOrderNumber = function () {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 8).toUpperCase();
  return `ORD-${timestamp}-${random}`;
};

// Update order status with timestamp
orderSchema.methods.updateStatus = function (newStatus, additionalData = {}) {
  this.orderStatus = newStatus;

  switch (newStatus) {
    case "confirmed":
      this.confirmedAt = new Date();
      break;
    case "shipped":
      this.shippedAt = new Date();
      if (additionalData.shipmentDetails) {
        this.shipmentDetails = {
          ...this.shipmentDetails,
          ...additionalData.shipmentDetails,
        };
      }
      break;
    case "delivered":
      this.deliveredAt = new Date();
      if (additionalData.actualDelivery) {
        this.shipmentDetails.actualDelivery = additionalData.actualDelivery;
      }
      break;
    case "cancelled":
      this.cancelledAt = new Date();
      break;
  }

  return this.save();
};

const Order = mongoose.models.Order || mongoose.model("Order", orderSchema);

export default Order;
