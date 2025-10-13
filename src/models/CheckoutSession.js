// models/CheckoutSession.js - Updated with stock reservation system
import mongoose from "mongoose";
import StockReservation from "./StockReservation.js";
import Product from "./Product.js";

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
      enum: ["buy_now", "cart_checkout"],
      default: "buy_now",
    },

    // Items in this checkout session
    items: [checkoutItemSchema],

    // Track if stock reservations are active
    hasActiveReservations: {
      type: Boolean,
      default: false,
    },

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
        enum: ["percentage", "fixed", "shipping"],
        default: null,
      },
      value: {
        type: Number,
        default: null,
      },
      description: {
        type: String,
        default: "",
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
      eligibleItems: [
        {
          productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
            required: true,
          },
          size: String,
          quantity: Number,
          originalPrice: Number,
          discount: Number,
        },
      ],
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
      enum: ["active", "completed", "expired", "cancelled","processing"],
      default: "active",
    },

    // Expiry - sessions expire after 30 minutes
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 5 * 60 * 1000), // 5 minutes because of reservations
      index: { expireAfterSeconds: 0 },
    },
    razorpayOrderId: {
      type: String,
      default: null,
      index: true, // Important for verification lookup
    },
    lockedTotal: {
      type: Number,
      default: null,
      comment: "Total amount locked at payment initiation (in rupees)"
    },
    lockedTotals: {
      subtotal: Number,
      totalItems: Number,
      totalDiscount: Number,
      shippingDiscount: Number,
      finalTotal: Number,
      itemDiscounts: mongoose.Schema.Types.Mixed,
      savings: Number,
      lockedAt: Date
    },
    validatedAt: {
      type: Date,
      default: null,
    },
    validatedAddress: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    paymentInitiatedAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Generate session ID
checkoutSessionSchema.statics.generateSessionId = function () {
  return `cs_${Date.now()}_${Math.random().toString(36).substr(2, 12)}`;
};

// Validate stock availability considering reservations
checkoutSessionSchema.statics.validateStockAvailability = async function (
  items
) {
  const stockValidationErrors = [];

  // Get all unique product IDs
  const productIds = [
    ...new Set(items.map((item) => item.productId || item.product?._id)),
  ];

  // Fetch all products in one query
  const products = await Product.find({
    _id: { $in: productIds },
  }).populate("sizes.size");

  for (const item of items) {
    const productId = item.productId || item.product?._id;
    const product = products.find(
      (p) => p._id.toString() === productId.toString()
    );

    if (!product) {
      stockValidationErrors.push(`Product not found: ${productId}`);
      continue;
    }

    const sizeInfo = product.sizes?.find(
      (s) =>
        s.size.name === item.size ||
        s.size._id.toString() === item.size.toString()
    );

    if (!sizeInfo) {
      stockValidationErrors.push(
        `${product.name} - size ${item.size} is no longer available`
      );
      continue;
    }

    // Get available quantity considering current reservations
    const availableQty = await StockReservation.getAvailableQty(
      productId,
      item.size,
      sizeInfo.qtyBuy,
      sizeInfo.soldQty
    );

    if (availableQty < item.quantity) {
      stockValidationErrors.push(
        `${product.name} (${item.size}) - Only ${availableQty} available, but ${item.quantity} requested`
      );
    }
  }

  return stockValidationErrors;
};

// Create Buy Now session with stock reservation
checkoutSessionSchema.statics.createBuyNowSession = async function (data) {
  const {
    productId,
    productData,
    size,
    quantity = 1,
    userId = null,
    guestTrackingId = null,
    ipAddress = null,
    userAgent = null,
  } = data;

  // Validate stock availability first
  const stockErrors = await this.validateStockAvailability([
    { productId, size, quantity },
  ]);

  if (stockErrors.length > 0) {
    throw new Error(`Stock validation failed: ${stockErrors.join(", ")}`);
  }

  const sessionId = this.generateSessionId();

  // Start transaction for atomic operation
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Create checkout session
    const [checkoutSession] = await this.create(
      [
        {
          sessionId,
          userId,
          guestTrackingId,
          type: "buy_now",
          items: [
            {
              productId,
              name: productData.name,
              price: productData.discountedPrice || productData.price,
              image: productData.images?.[0]?.url || "",
              size,
              quantity,
              slug: productData.slug,
            },
          ],
          hasActiveReservations: true,
          ipAddress,
          userAgent,
        },
      ],
      { session }
    );

    // Create stock reservation
    await StockReservation.createReservation({
      sessionId,
      sessionType: "buy_now",
      productId,
      size,
      quantity,
      userId,
      guestTrackingId,
      ipAddress,
      userAgent,
    });

    await session.commitTransaction();
    return checkoutSession;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

// Create Cart Checkout session with stock reservations
checkoutSessionSchema.statics.createCartCheckoutSession = async function (
  data
) {
  const {
    cartItems,
    userId = null,
    guestTrackingId = null,
    ipAddress = null,
    userAgent = null,
  } = data;

  if (!cartItems || cartItems.length === 0) {
    throw new Error("Cart items are required for checkout session");
  }

  // Validate stock availability for all items
  const stockErrors = await this.validateStockAvailability(cartItems);

  if (stockErrors.length > 0) {
    throw new Error(`Stock validation failed: ${stockErrors.join(", ")}`);
  }

  const sessionId = this.generateSessionId();

  // Transform cart items to checkout items format
  const checkoutItems = cartItems.map((item) => ({
    productId: item.productId || item.product?._id,
    name: item.name || item.product?.name,
    price: item.discountedPrice || item.price || item.product?.price,
    image: item.image || item.product?.images?.[0]?.url || "",
    size: item.size,
    quantity: item.quantity,
    slug: item.slug || item.product?.slug,
  }));

  // Start transaction for atomic operation
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Create checkout session
    const [checkoutSession] = await this.create(
      [
        {
          sessionId,
          userId,
          guestTrackingId,
          type: "cart_checkout",
          items: checkoutItems,
          hasActiveReservations: true,
          ipAddress,
          userAgent,
        },
      ],
      { session }
    );

    // Create stock reservations for all items
    const reservationItems = cartItems.map((item) => ({
      productId: item.productId || item.product?._id,
      size: item.size,
      quantity: item.quantity,
    }));

    await StockReservation.createMultipleReservations({
      sessionId,
      sessionType: "cart_checkout",
      items: reservationItems,
      userId,
      guestTrackingId,
      ipAddress,
      userAgent,
    });

    await session.commitTransaction();
    return checkoutSession;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

// Calculate session totals (existing logic)
checkoutSessionSchema.methods.calculateTotals = function () {
  const subtotal = this.items.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );

  const totalItems = this.items.reduce(
    (total, item) => total + item.quantity,
    0
  );

  let totalDiscount = 0;
  let shippingDiscount = 0;
  let itemDiscounts = {};

  if (this.appliedCoupon) {
    totalDiscount = this.appliedCoupon.discountAmount || 0;
    shippingDiscount = this.appliedCoupon.shippingDiscount || 0;
    itemDiscounts = this.appliedCoupon.itemDiscounts || {};
  }

  const shippingCost = 50;
  const freeShippingThreshold = 500;

  let finalShippingCost;
  if (subtotal > freeShippingThreshold) {
    finalShippingCost = 0;
  } else {
    finalShippingCost = shippingCost - shippingDiscount;
  }

  const finalTotal = Math.max(0, subtotal - totalDiscount + finalShippingCost);

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    totalItems,
    totalDiscount: Math.round(totalDiscount * 100) / 100,
    shippingDiscount: Math.round(shippingDiscount * 100) / 100,
    finalTotal: Math.round(finalTotal * 100) / 100,
    itemDiscounts,
    savings: Math.round(totalDiscount * 100) / 100,
  };
};

// Release stock reservations when session is completed/cancelled
checkoutSessionSchema.methods.releaseReservations = async function (
  newStatus = "completed"
) {
  if (this.hasActiveReservations) {
    await StockReservation.releaseSessionReservations(
      this.sessionId,
      newStatus
    );
    this.hasActiveReservations = false;
    await this.save();
  }
};

// Clean expired sessions and their reservations
checkoutSessionSchema.statics.cleanExpiredSessions = async function () {
  // Find expired sessions
  const expiredSessions = await this.find({
    expiresAt: { $lt: new Date() },
    status: "active",
  });

  // Release reservations for expired sessions
  for (const session of expiredSessions) {
    await session.releaseReservations("expired");
  }

  // Update expired sessions
  const result = await this.updateMany(
    {
      expiresAt: { $lt: new Date() },
      status: "active",
    },
    {
      $set: {
        status: "expired",
        hasActiveReservations: false,
      },
    }
  );

  // Clean up expired reservations
  await StockReservation.cleanExpiredReservations();

  return result;
};

checkoutSessionSchema.methods.lockTotals = function () {
  const totals = this.calculateTotals();
  
  this.lockedTotal = totals.finalTotal;
  this.lockedTotals = {
    ...totals,
    lockedAt: new Date()
  };
  
  return totals;
};

checkoutSessionSchema.methods.getTotals = function (useLocked = false) {
  if (useLocked && this.lockedTotals) {
    return this.lockedTotals;
  }
  return this.calculateTotals();
};

/**
 * Extend session and reservations for payment window
 * Called when user initiates payment
 * Gives 30 minutes to complete payment
 */
checkoutSessionSchema.methods.extendForPayment = async function () {
  const extensionMinutes = 30;
  const newExpiryTime = new Date(Date.now() + extensionMinutes * 60 * 1000);
  
  // Update session expiry
  this.expiresAt = newExpiryTime;
  await this.save();
  
  // Extend all active stock reservations for this session
  if (this.hasActiveReservations) {
    await StockReservation.extendSessionReservations(
      this.sessionId,
      extensionMinutes
    );
  }
  
  return this;
};

/**
 * Check if session needs extension
 * Returns true if < 2 minutes remaining
 */
checkoutSessionSchema.methods.needsExtension = function () {
  const now = Date.now();
  const expiryTime = new Date(this.expiresAt).getTime();
  const timeRemaining = expiryTime - now;
  const twoMinutes = 2 * 60 * 1000;
  
  return timeRemaining < twoMinutes && timeRemaining > 0;
};

/**
 * Get time remaining in milliseconds
 */
checkoutSessionSchema.methods.getTimeRemaining = function () {
  const now = Date.now();
  const expiryTime = new Date(this.expiresAt).getTime();
  return Math.max(0, expiryTime - now);
};

const CheckoutSession =
  mongoose.models.CheckoutSession ||
  mongoose.model("CheckoutSession", checkoutSessionSchema);

export default CheckoutSession;
