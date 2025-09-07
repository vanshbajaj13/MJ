// models/CheckoutSession.js - Temporary checkout sessions for Buy Now
import mongoose from "mongoose";

const checkoutItemSchema = new mongoose.Schema({
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
});

const checkoutSessionSchema = new mongoose.Schema(
  {
    // Session identification
    sessionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    
    // User context
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      default: null, // null for guests
    },
    
    // Guest tracking
    guestTrackingId: {
      type: String,
      default: null,
    },
    
    // Session type: 'buy_now' or 'cart_checkout'
    type: {
      type: String,
      enum: ['buy_now', 'cart_checkout'],
      default: 'buy_now',
    },
    
    // Items in this checkout session
    items: [checkoutItemSchema],
    
    // Applied coupon (reuse existing structure)
    appliedCoupon: {
      couponId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Coupon",
        default: null,
      },
      code: {
        type: String,
        default: null,
        uppercase: true,
      },
      type: {
        type: String,
        enum: ['percentage', 'fixed', 'shipping'],
        default: null,
      },
      value: {
        type: Number,
        default: null,
      },
      description: {
        type: String,
        default: '',
      },
      discountAmount: {
        type: Number,
        default: 0,
        min: 0,
      },
      shippingDiscount: {
        type: Number,
        default: 0,
        min: 0,
      },
      itemDiscounts: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
      },
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
    
    // Session metadata
    ipAddress: String,
    userAgent: String,
    
    // Status
    status: {
      type: String,
      enum: ['active', 'completed', 'expired', 'cancelled'],
      default: 'active',
    },
    
    // Expiry - sessions expire after 30 minutes
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
      index: { expireAfterSeconds: 0 },
    },
  },
  {
    timestamps: true,
  }
);

// Generate session ID
checkoutSessionSchema.statics.generateSessionId = function() {
  return `cs_${Date.now()}_${Math.random().toString(36).substr(2, 12)}`;
};

// Create Buy Now session
checkoutSessionSchema.statics.createBuyNowSession = async function(data) {
  const {
    productId,
    productData,
    size,
    quantity = 1,
    userId = null,
    guestTrackingId = null,
    ipAddress = null,
    userAgent = null
  } = data;

  const sessionId = this.generateSessionId();
  
  const session = await this.create({
    sessionId,
    userId,
    guestTrackingId,
    type: 'buy_now',
    items: [{
      productId,
      name: productData.name,
      price: productData.discountedPrice || productData.price,
      image: productData.images?.[0]?.url || "",
      size,
      quantity,
      slug: productData.slug,
    }],
    ipAddress,
    userAgent,
  });

  return session;
};

// Calculate session totals (reuse cart logic)
checkoutSessionSchema.methods.calculateTotals = function() {
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

// Clean expired sessions
checkoutSessionSchema.statics.cleanExpiredSessions = async function() {
  return await this.deleteMany({
    expiresAt: { $lt: new Date() },
    status: 'active'
  });
};

const CheckoutSession = mongoose.models.CheckoutSession || 
  mongoose.model("CheckoutSession", checkoutSessionSchema);

export default CheckoutSession;