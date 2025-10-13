// models/StockReservation.js - Stock reservation system
import mongoose from "mongoose";

const stockReservationSchema = new mongoose.Schema(
  {
    // Reservation identification
    reservationId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    // Link to checkout session
    sessionId: {
      type: String,
      required: true,
      index: true,
    },

    sessionType: {
      type: String,
      enum: ["buy_now", "cart_checkout"],
      required: true,
    },

    // Product and size details
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },

    size: {
      type: String,
      required: true,
    },

    // Reserved quantity
    reservedQty: {
      type: Number,
      required: true,
      min: 1,
    },

    // User context (for tracking and cleanup)
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      default: null,
    },

    guestTrackingId: {
      type: String,
      default: null,
    },

    // Status tracking
    status: {
      type: String,
      enum: ["active", "completed", "expired", "cancelled"],
      default: "active",
      index: true,
    },

    // Auto-expiry after 5 minutes
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
      index: { expireAfterSeconds: 0 },
    },

    // Metadata
    ipAddress: String,
    userAgent: String,
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient queries
stockReservationSchema.index({ productId: 1, size: 1, status: 1 });
stockReservationSchema.index({ sessionId: 1, status: 1 });
stockReservationSchema.index({ expiresAt: 1, status: 1 });

// Generate reservation ID
stockReservationSchema.statics.generateReservationId = function () {
  return `res_${Date.now()}_${Math.random().toString(36).substr(2, 10)}`;
};

// Create reservation for a single item
stockReservationSchema.statics.createReservation = async function (data) {
  const {
    sessionId,
    sessionType,
    productId,
    size,
    quantity,
    userId = null,
    guestTrackingId = null,
    ipAddress = null,
    userAgent = null,
  } = data;

  const reservationId = this.generateReservationId();

  const reservation = await this.create({
    reservationId,
    sessionId,
    sessionType,
    productId,
    size,
    reservedQty: quantity,
    userId,
    guestTrackingId,
    ipAddress,
    userAgent,
  });

  return reservation;
};

// Create multiple reservations for cart checkout
stockReservationSchema.statics.createMultipleReservations = async function (data) {
  const {
    sessionId,
    sessionType,
    items, // Array of {productId, size, quantity}
    userId = null,
    guestTrackingId = null,
    ipAddress = null,
    userAgent = null,
  } = data;

  const reservations = [];

  for (const item of items) {
    const reservationId = this.generateReservationId();
    
    reservations.push({
      reservationId,
      sessionId,
      sessionType,
      productId: item.productId,
      size: item.size,
      reservedQty: item.quantity,
      userId,
      guestTrackingId,
      ipAddress,
      userAgent,
    });
  }

  const createdReservations = await this.insertMany(reservations);
  return createdReservations;
};

// Get total reserved quantity for a product-size combination
stockReservationSchema.statics.getTotalReservedQty = async function (productId, size) {
  const result = await this.aggregate([
    {
      $match: {
        productId: new mongoose.Types.ObjectId(productId),
        size: size,
        status: "active",
        expiresAt: { $gt: new Date() },
      },
    },
    {
      $group: {
        _id: null,
        totalReserved: { $sum: "$reservedQty" },
      },
    },
  ]); 
  return result[0]?.totalReserved || 0;
};

// Release reservations for a session (when order is completed or cancelled)
stockReservationSchema.statics.releaseSessionReservations = async function (
  sessionId,
  newStatus = "completed"
) {
  const result = await this.updateMany(
    {
      sessionId: sessionId,
      status: "active",
    },
    {
      $set: {
        status: newStatus,
      },
    }
  );

  return result;
};

// Clean expired reservations (manual cleanup if needed)
stockReservationSchema.statics.cleanExpiredReservations = async function () {
  const result = await this.updateMany(
    {
      status: "active",
      expiresAt: { $lt: new Date() },
    },
    {
      $set: {
        status: "expired",
      },
    }
  );

  // Optional: Delete old expired records to keep collection clean
  await this.deleteMany({
    status: "expired",
    updatedAt: { $lt: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // Older than 24 hours
  });

  return result;
};

// Get available quantity considering reservations
stockReservationSchema.statics.getAvailableQty = async function (productId, size, totalQty, soldQty) {
  const reservedQty = await this.getTotalReservedQty(productId, size);
  const availableQty = totalQty - soldQty - reservedQty;
  return Math.max(0, availableQty);
};

// Instance method to check if reservation is still valid
stockReservationSchema.methods.isValid = function () {
  return this.status === "active" && this.expiresAt > new Date();
};

// Instance method to extend reservation (if needed)
stockReservationSchema.methods.extend = async function (additionalMinutes = 5) {
  if (this.status !== "active") {
    throw new Error("Cannot extend inactive reservation");
  }

  const newExpiryTime = new Date(this.expiresAt.getTime() + additionalMinutes * 60 * 1000);
  
  this.expiresAt = newExpiryTime;
  await this.save();
  
  return this;
};


/**
 * Extend all reservations for a session
 * Called when payment is initiated
 */
stockReservationSchema.statics.extendSessionReservations = async function (
  sessionId,
  additionalMinutes = 30
) {
  const newExpiryTime = new Date(Date.now() + additionalMinutes * 60 * 1000);
  
  const result = await this.updateMany(
    {
      sessionId: sessionId,
      status: "active",
    },
    {
      $set: {
        expiresAt: newExpiryTime,
      },
    }
  );
  
  return result;
};

const StockReservation =
  mongoose.models.StockReservation ||
  mongoose.model("StockReservation", stockReservationSchema);

export default StockReservation;