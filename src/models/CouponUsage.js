// models/CouponUsage.js - Enhanced with guest tracking support
import mongoose from "mongoose";

const couponUsageSchema = new mongoose.Schema({
  // User ID for authenticated users (null for guests)
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Customer',
    default: null
  },
  
  // Tracking ID for guests (cartId, sessionId, or generated ID)
  guestTrackingId: {
    type: String,
    default: null
  },
  
  couponId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Coupon', 
    required: true 
  },
  
  couponCode: { 
    type: String, 
    required: true,
    uppercase: true
  },
  
  // Order ID when the coupon was actually used (null for just applied)
  orderId: { 
    type: String,
    default: null
  },
  
  discountAmount: { 
    type: Number, 
    required: true,
    min: 0
  },
  
  // Breakdown of discount per item
  itemDiscounts: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  // Shipping discount (for shipping type coupons)
  shippingDiscount: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Status: 'applied', 'used', 'expired', 'cancelled'
  status: {
    type: String,
    enum: ['applied', 'used', 'expired', 'cancelled'],
    default: 'applied'
  },
  
  // Cart value when coupon was applied
  cartValue: {
    type: Number,
    required: true,
    min: 0
  },
  
  // Items that were in cart when coupon was applied
  cartItems: [{
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true
    },
    quantity: Number,
    price: Number,
    size: String
  }],
  
  // IP address for additional fraud prevention
  ipAddress: {
    type: String,
    default: null
  },
  
  // Browser fingerprint or session data
  fingerprint: {
    type: String,
    default: null
  },
  
  appliedAt: { 
    type: Date, 
    default: Date.now 
  },
  
  usedAt: { 
    type: Date,
    default: null
  },
  
  expiresAt: {
    type: Date,
    // Default: applied coupons expire after 24 hours if not used
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000)
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
couponUsageSchema.index({ userId: 1, couponId: 1 });
couponUsageSchema.index({ guestTrackingId: 1, couponId: 1 });
couponUsageSchema.index({ couponCode: 1 });
couponUsageSchema.index({ status: 1 });
couponUsageSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // Auto-cleanup expired records

// Compound index for usage limit checks
couponUsageSchema.index({ 
  couponId: 1, 
  status: 1, 
  userId: 1, 
  guestTrackingId: 1 
});

// Static methods for usage tracking
couponUsageSchema.statics.recordApplication = async function(data) {
  const {
    userId,
    guestTrackingId, 
    couponId,
    couponCode,
    discountAmount,
    itemDiscounts,
    shippingDiscount,
    cartValue,
    cartItems,
    ipAddress,
    fingerprint
  } = data;

  return await this.create({
    userId: userId || null,
    guestTrackingId: guestTrackingId || null,
    couponId,
    couponCode,
    discountAmount,
    itemDiscounts: itemDiscounts || {},
    shippingDiscount: shippingDiscount || 0,
    cartValue,
    cartItems: cartItems || [],
    ipAddress,
    fingerprint,
    status: 'applied'
  });
};

couponUsageSchema.statics.checkUsageLimit = async function(couponId, userId, guestTrackingId, userLimit = 1) {
  const query = {
    couponId,
    status: { $in: ['used'] },
    $or: []
  };

  if (userId) {
    query.$or.push({ userId });
  }
  
  if (guestTrackingId) {
    query.$or.push({ guestTrackingId });
  }

  if (query.$or.length === 0) {
    return { canUse: false, reason: 'Invalid tracking parameters' };
  }

  const usageCount = await this.countDocuments(query);
  
  return {
    canUse: usageCount < userLimit,
    currentUsage: usageCount,
    maxUsage: userLimit,
    reason: usageCount >= userLimit ? 'Usage limit exceeded' : null
  };
};

couponUsageSchema.statics.markAsUsed = async function(couponId, identifier, orderId) {
  const query = {
    couponId,
    status: 'applied',
    $or: []
  };

  if (mongoose.Types.ObjectId.isValid(identifier)) {
    query.$or.push({ userId: identifier });
  } else {
    query.$or.push({ guestTrackingId: identifier });
  }

  return await this.updateMany(query, {
    status: 'used',
    orderId,
    usedAt: new Date()
  });
};

couponUsageSchema.statics.cleanupExpired = async function() {
  const result = await this.updateMany(
    { 
      expiresAt: { $lt: new Date() },
      status: 'applied'
    },
    { 
      status: 'expired' 
    }
  );
  
  return result;
};

// Instance methods
couponUsageSchema.methods.markAsUsed = function(orderId) {
  this.status = 'used';
  this.orderId = orderId;
  this.usedAt = new Date();
  return this.save();
};

couponUsageSchema.methods.cancel = function(reason = 'cancelled') {
  this.status = 'cancelled';
  return this.save();
};

// Pre-save middleware
couponUsageSchema.pre('save', function(next) {
  // Ensure either userId or guestTrackingId is present
  if (!this.userId && !this.guestTrackingId) {
    return next(new Error('Either userId or guestTrackingId must be provided'));
  }
  
  // Set expiry for applied coupons
  if (this.status === 'applied' && !this.expiresAt) {
    this.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  }
  
  next();
});

const CouponUsage = mongoose.models.CouponUsage || mongoose.model("CouponUsage", couponUsageSchema);

export default CouponUsage;