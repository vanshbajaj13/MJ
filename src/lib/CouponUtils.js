// lib/couponValidation.js - Comprehensive coupon validation utilities
import dbConnect from "@/lib/dbConnect";
import Coupon from "@/models/Coupon";
import CouponUsage from "@/models/CouponUsage";
import Product from "@/models/Product";
import mongoose from "mongoose";

export class CouponValidator {
  /**
   * Validate if a coupon can be applied to a user's cart
   * @param {string} couponCode - The coupon code to validate
   * @param {string|null} userId - User ID (null for guests)
   * @param {Array} cartItems - Array of cart items with populated product data
   * @returns {Object} Validation result with coupon data and discount calculation
   */
  static async validateAndCalculate(couponCode, userId = null, cartItems = [],guestId = null) {
    try {
      await dbConnect();

      // Step 1: Find and validate coupon
      const coupon = await this.findValidCoupon(couponCode);
      
      // Step 2: Check usage limits
      await this.checkUsageLimits(coupon, userId, guestId);
      
      // Step 3: Validate cart and calculate discount
      const discountResult = await this.calculateDiscount(coupon, cartItems);
      
      return {
        isValid: true,
        coupon: {
          id: coupon._id,
          code: coupon.code,
          type: coupon.type,
          value: coupon.value,
          description: coupon.description,
          minOrderValue: coupon.minOrderValue,
          maxDiscount: coupon.maxDiscount
        },
        discount: discountResult
      };
    } catch (error) {
      return {
        isValid: false,
        error: error.message,
        coupon: null,
        discount: null
      };
    }
  }

  /**
   * Find a valid coupon by code
   * @param {string} couponCode - The coupon code
   * @returns {Object} Coupon document
   */
  static async findValidCoupon(couponCode) {
    if (!couponCode || typeof couponCode !== 'string') {
      throw new Error("Invalid coupon code provided");
    }

    const normalizedCode = couponCode.trim().toUpperCase();
    
    const coupon = await Coupon.findOne({
      code: normalizedCode,
      isActive: true,
      validFrom: { $lte: new Date() },
      validUntil: { $gte: new Date() }
    }).populate([
      'applicableProducts',
      'excludedProducts', 
      'applicableCategories',
      'excludedCategories'
    ]);

    if (!coupon) {
      throw new Error("Coupon code is invalid or has expired");
    }

    return coupon;
  }

  /**
   * Check if coupon usage limits are exceeded
   * @param {Object} coupon - Coupon document
   * @param {string|null} userId - User ID
   */
  static async checkUsageLimits(coupon, userId) {
    // Check global usage limit
    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
      throw new Error("This coupon has reached its maximum usage limit");
    }

    // Check user-specific usage limit (only for authenticated users)
    if (userId && coupon.userUsageLimit) {
      const userUsageCount = await CouponUsage.countDocuments({
        userId: new mongoose.Types.ObjectId(userId),
        couponId: coupon._id
      });

      if (userUsageCount >= coupon.userUsageLimit) {
        throw new Error(`You can only use this coupon ${coupon.userUsageLimit} time${coupon.userUsageLimit > 1 ? 's' : ''}`);
      }
    }
  }

  /**
   * Calculate discount for a given coupon and cart items
   * @param {Object} coupon - Coupon document  
   * @param {Array} cartItems - Cart items with product data
   * @returns {Object} Discount calculation result
   */
  static async calculateDiscount(coupon, cartItems) {
    if (!Array.isArray(cartItems) || cartItems.length === 0) {
      throw new Error("Cart is empty");
    }

    // Filter eligible items and calculate totals
    const eligibleItems = [];
    let cartTotal = 0;
    let eligibleTotal = 0;

    for (const item of cartItems) {
      const product = item.productId || item.product;
      if (!product) continue;

      const itemPrice = this.getItemPrice(product, item);
      const itemTotal = itemPrice * item.quantity;
      cartTotal += itemTotal;

      // Check if item is eligible for this coupon
      if (await this.isItemEligible(product, coupon)) {
        eligibleItems.push({
          ...item,
          product,
          itemPrice,
          itemTotal
        });
        eligibleTotal += itemTotal;
      }
    }

    // Validate minimum requirements
    if (cartTotal < coupon.minOrderValue) {
      throw new Error(`Minimum order value of ₹${coupon.minOrderValue.toFixed(2)} required`);
    }

    if (eligibleTotal === 0) {
      throw new Error("No items in your cart are eligible for this coupon");
    }

    // Calculate discount based on coupon type
    let discountAmount = 0;
    let shippingDiscount = 0;
    
    switch (coupon.type) {
      case 'percentage':
        discountAmount = (eligibleTotal * coupon.value) / 100;
        if (coupon.maxDiscount && discountAmount > coupon.maxDiscount) {
          discountAmount = coupon.maxDiscount;
        }
        break;
        
      case 'fixed':
        discountAmount = Math.min(coupon.value, eligibleTotal);
        break;
        
      case 'shipping':
        // For shipping discounts, apply as flat reduction up to eligible total
        shippingDiscount = coupon.value;
        break;
        
      default:
        throw new Error("Invalid coupon type");
    }

    // Ensure discount doesn't exceed eligible total
    discountAmount = Math.min(discountAmount, eligibleTotal);

    // Distribute discount among eligible items
    const itemDiscounts = this.distributeDiscount(eligibleItems, discountAmount);

    return {
      discountAmount: Math.round(discountAmount * 100) / 100,
      cartTotal: Math.round(cartTotal * 100) / 100,
      eligibleTotal: Math.round(eligibleTotal * 100) / 100,
      finalTotal: Math.round((cartTotal - discountAmount) * 100) / 100,
      itemDiscounts,
      shippingDiscount:shippingDiscount,
      eligibleItems: eligibleItems.map(item => ({
        productId: item.product._id,
        size: item.size,
        quantity: item.quantity,
        originalPrice: item.itemPrice,
        totalPrice: item.itemTotal
      })),
      savings: Math.round(discountAmount * 100) / 100
    };
  }

  /**
   * Get the effective price for an item
   * @param {Object} product - Product document
   * @param {Object} item - Cart item
   * @returns {number} Item price
   */
  static getItemPrice(product, item) {
    // Use discounted price if available, otherwise regular price
    // Fallback to item price if product prices are missing
    return product.discountedPrice || product.price || item.price || 0;
  }

  /**
   * Check if an item is eligible for a coupon
   * @param {Object} product - Product document
   * @param {Object} coupon - Coupon document
   * @returns {boolean} Whether item is eligible
   */
  static async isItemEligible(product, coupon) {
    try {
      // Check if discounted items are excluded
      if (coupon.excludeDiscountedItems) {
        const hasDiscount = product.discountedPrice && 
                           product.discountedPrice < product.price;
        if (hasDiscount) return false;
      }

      // Check excluded products
      if (coupon.excludedProducts?.length > 0) {
        const isExcluded = coupon.excludedProducts.some(excludedProduct => 
          excludedProduct._id?.toString() === product._id?.toString()
        );
        if (isExcluded) return false;
      }

      // Check excluded categories
      if (coupon.excludedCategories?.length > 0 && product.category) {
        const isExcludedCategory = coupon.excludedCategories.some(excludedCategory => 
          excludedCategory._id?.toString() === product.category?.toString()
        );
        if (isExcludedCategory) return false;
      }

      // Check specific product inclusions
      if (coupon.applicableProducts?.length > 0) {
        return coupon.applicableProducts.some(applicableProduct => 
          applicableProduct._id?.toString() === product._id?.toString()
        );
      }

      // Check specific category inclusions
      if (coupon.applicableCategories?.length > 0 && product.category) {
        return coupon.applicableCategories.some(applicableCategory => 
          applicableCategory._id?.toString() === product.category?.toString()
        );
      }

      // If no specific restrictions, item is eligible
      return true;
    } catch (error) {
      console.error("Error checking item eligibility:", error);
      return false;
    }
  }

  /**
   * Distribute discount proportionally among eligible items
   * @param {Array} eligibleItems - Items eligible for discount
   * @param {number} totalDiscount - Total discount amount to distribute
   * @returns {Object} Item discounts mapping
   */
  static distributeDiscount(eligibleItems, totalDiscount) {
    const itemDiscounts = {};
    
    if (eligibleItems.length === 0 || totalDiscount <= 0) {
      return itemDiscounts;
    }

    const totalValue = eligibleItems.reduce((sum, item) => sum + item.itemTotal, 0);
    let remainingDiscount = totalDiscount;

    eligibleItems.forEach((item, index) => {
      const itemKey = `${item.product._id}-${item.size}`;
      
      if (index === eligibleItems.length - 1) {
        // Last item gets remaining discount to handle rounding
        itemDiscounts[itemKey] = Math.round(remainingDiscount * 100) / 100;
      } else {
        const itemProportion = item.itemTotal / totalValue;
        const itemDiscount = Math.round((totalDiscount * itemProportion) * 100) / 100;
        itemDiscounts[itemKey] = itemDiscount;
        remainingDiscount -= itemDiscount;
      }
    });

    return itemDiscounts;
  }

  /**
   * Record coupon usage for analytics and limit tracking
   * @param {string} userId - User ID
   * @param {Object} coupon - Coupon document
   * @param {string} orderId - Order ID
   * @param {number} discountAmount - Applied discount amount
   */
  static async recordUsage(userId, coupon, orderId, discountAmount) {
    try {
      await dbConnect();

      // Record individual usage
      const couponUsage = new CouponUsage({
        userId: new mongoose.Types.ObjectId(userId),
        couponId: coupon._id,
        couponCode: coupon.code,
        orderId: orderId,
        discountAmount: discountAmount,
        usedAt: new Date()
      });

      await couponUsage.save();

      // Increment global usage count
      await Coupon.findByIdAndUpdate(
        coupon._id,
        { $inc: { usageCount: 1 } }
      );

    } catch (error) {
      console.error("Error recording coupon usage:", error);
      // Don't throw error as this shouldn't break the order process
    }
  }

  /**
   * Get available public coupons (for marketing/display purposes)
   * @param {number} limit - Maximum number of coupons to return
   * @returns {Array} Array of public coupon data
   */
  static async getPublicCoupons(limit = 5) {
    try {
      await dbConnect();

      const coupons = await Coupon.find({
        isActive: true,
        isPublic: true,
        validFrom: { $lte: new Date() },
        validUntil: { $gte: new Date() },
        $or: [
          { usageLimit: { $exists: false } },
          { $expr: { $lt: ["$usageCount", "$usageLimit"] } }
        ]
      })
      .select('code type value description minOrderValue maxDiscount validUntil')
      .sort({ createdAt: -1 })
      .limit(limit);

      return coupons.map(coupon => ({
        code: coupon.code,
        type: coupon.type,
        value: coupon.value,
        description: coupon.description,
        minOrderValue: coupon.minOrderValue,
        maxDiscount: coupon.maxDiscount,
        expiresAt: coupon.validUntil
      }));
    } catch (error) {
      console.error("Error fetching public coupons:", error);
      return [];
    }
  }

  /**
   * Validate coupon format (client-side validation)
   * @param {string} couponCode - Coupon code to validate
   * @returns {Object} Validation result
   */
  static validateFormat(couponCode) {
    if (!couponCode || typeof couponCode !== 'string') {
      return { isValid: false, error: "Coupon code is required" };
    }

    const trimmedCode = couponCode.trim();
    
    if (trimmedCode.length < 3) {
      return { isValid: false, error: "Coupon code too short" };
    }

    if (trimmedCode.length > 20) {
      return { isValid: false, error: "Coupon code too long" };
    }

    // Allow only alphanumeric characters
    if (!/^[A-Z0-9]+$/i.test(trimmedCode)) {
      return { isValid: false, error: "Coupon code can only contain letters and numbers" };
    }

    return { 
      isValid: true, 
      normalizedCode: trimmedCode.toUpperCase() 
    };
  }
}

// Export utility functions for use in API routes
export const couponUtils = {
  validateAndCalculate: CouponValidator.validateAndCalculate,
  findValidCoupon: CouponValidator.findValidCoupon,
  recordUsage: CouponValidator.recordUsage,
  getPublicCoupons: CouponValidator.getPublicCoupons,
  validateFormat: CouponValidator.validateFormat
};