// lib/cartMiddleware.js - Middleware to handle coupon revalidation during cart operations
import { CouponValidator } from "@/lib/couponValidation";
import Customer from "@/models/Customer";
import dbConnect from "@/lib/dbConnect";

export class CartMiddleware {
  /**
   * Revalidate applied coupon after cart changes
   * @param {string} userId - User ID
   * @param {Array} updatedCartItems - Updated cart items
   * @returns {Object} Updated cart with valid coupon or removed invalid coupon
   */
  static async revalidateCoupon(userId, updatedCartItems) {
    if (!userId || !Array.isArray(updatedCartItems)) {
      return { cart: { items: updatedCartItems, appliedCoupon: null } };
    }

    try {
      await dbConnect();
      
      const user = await Customer.findById(userId).populate({
        path: 'cart.items.productId',
        model: 'Product',
        populate: {
          path: 'category',
          model: 'Category'
        }
      });

      if (!user?.cart?.appliedCoupon) {
        return { cart: { items: updatedCartItems, appliedCoupon: null } };
      }

      const appliedCoupon = user.cart.appliedCoupon;
      
      // Skip revalidation if cart is empty
      if (updatedCartItems.length === 0) {
        // Remove coupon if cart is empty
        user.cart.appliedCoupon = null;
        user.cart.markModified('appliedCoupon');
        await user.save();
        return { cart: { items: [], appliedCoupon: null } };
      }

      // Revalidate the coupon with updated cart
      const validationResult = await CouponValidator.validateAndCalculate(
        appliedCoupon.code,
        userId,
        updatedCartItems
      );

      if (validationResult.isValid) {
        // Update coupon with new discount calculation
        const updatedCoupon = {
          ...appliedCoupon,
          discountAmount: validationResult.discount.discountAmount,
          itemDiscounts: validationResult.discount.itemDiscounts,
          revalidatedAt: new Date()
        };

        userCart.appliedCoupon = updatedCoupon;
        await userCart.save();

        return {
          cart: {
            items: updatedCartItems,
            appliedCoupon: updatedCoupon
          },
          couponStatus: 'valid',
          discountUpdated: appliedCoupon.discountAmount !== validationResult.discount.discountAmount
        };
      } else {
        // Remove invalid coupon
        userCart.appliedCoupon = null;
        await userCart.save();

        return {
          cart: {
            items: updatedCartItems,
            appliedCoupon: null
          },
          couponStatus: 'removed',
          removalReason: validationResult.error
        };
      }
    } catch (error) {
      console.error("Error revalidating coupon:", error);
      
      // In case of error, return cart without coupon to be safe
      return {
        cart: {
          items: updatedCartItems,
          appliedCoupon: null
        },
        couponStatus: 'error',
        error: error.message
      };
    }
  }

  /**
   * Process cart operation with automatic coupon revalidation
   * @param {string} userId - User ID
   * @param {Function} cartOperation - Function that performs the cart operation
   * @param {Object} options - Additional options
   * @returns {Object} Result with updated cart and coupon status
   */
  static async processCartOperation(userId, cartOperation, options = {}) {
    try {
      // Execute the cart operation
      const operationResult = await cartOperation();
      
      // If operation failed, return the error
      if (!operationResult.success) {
        return operationResult;
      }

      // Revalidate coupon with updated cart
      const revalidationResult = await this.revalidateCoupon(
        userId,
        operationResult.updatedCart
      );

      return {
        success: true,
        cart: revalidationResult.cart,
        couponStatus: revalidationResult.couponStatus,
        discountUpdated: revalidationResult.discountUpdated,
        removalReason: revalidationResult.removalReason,
        ...operationResult.additionalData
      };
    } catch (error) {
      console.error("Error processing cart operation:", error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Calculate cart totals with applied coupon
   * @param {Array} cartItems - Cart items
   * @param {Object} appliedCoupon - Applied coupon data
   * @returns {Object} Cart totals
   */
  static calculateCartTotals(cartItems, appliedCoupon = null) {
    const subtotal = cartItems.reduce((total, item) => 
      total + (item.price * item.quantity), 0
    );

    const totalItems = cartItems.reduce((total, item) => 
      total + item.quantity, 0
    );

    const discountAmount = appliedCoupon?.discountAmount || 0;
    const finalTotal = Math.max(0, subtotal - discountAmount);

    return {
      subtotal: Math.round(subtotal * 100) / 100,
      totalItems,
      discountAmount: Math.round(discountAmount * 100) / 100,
      finalTotal: Math.round(finalTotal * 100) / 100,
      tax: 0, // Add tax calculation if needed
      shipping: 0, // Add shipping calculation if needed
      savings: Math.round(discountAmount * 100) / 100
    };
  }
}

// Utility functions for common cart operations
export const cartUtils = {
  revalidateCoupon: CartMiddleware.revalidateCoupon,
  processCartOperation: CartMiddleware.processCartOperation,
  calculateTotals: CartMiddleware.calculateCartTotals
};