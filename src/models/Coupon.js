// models/Coupon.js
import mongoose from "mongoose";

const couponSchema = new mongoose.Schema({
  code: { 
    type: String, 
    required: true, 
    unique: true, 
    uppercase: true,
    trim: true
  },
  type: { 
    type: String, 
    enum: ['percentage', 'fixed', 'shipping'], 
    required: true 
  },
  value: { type: Number, required: true },
  
  // Restrictions
  minOrderValue: { type: Number, default: 0 },
  maxDiscount: { type: Number },
  
  // Product restrictions
  applicableProducts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  excludedProducts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  applicableCategories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
  excludedCategories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
  
  // Discount stacking rules
  stackable: { type: Boolean, default: false },
  excludeDiscountedItems: { type: Boolean, default: false },
  
  // Usage limits
  usageLimit: { type: Number },
  usageCount: { type: Number, default: 0 },
  userUsageLimit: { type: Number, default: 1 },
  
  // Validity
  validFrom: { type: Date, required: true },
  validUntil: { type: Date, required: true },
  isActive: { type: Boolean, default: true },
  isPublic: { type: Boolean, default: false }, // NEW: Controls public visibility
  
  // Metadata
  description: String,
  createdBy: String,
  createdAt: { type: Date, default: Date.now }
});

const Coupon = mongoose.models.Coupon || mongoose.model("Coupon", couponSchema);

export default Coupon;