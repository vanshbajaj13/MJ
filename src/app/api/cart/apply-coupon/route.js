// api/cart/apply-coupon/route.js - Secure implementation with proper guest handling
import dbConnect from "@/lib/dbConnect";
import { getCurrentUser } from "@/lib/auth";
import Coupon from "@/models/Coupon";
import CouponUsage from "@/models/CouponUsage";
import Cart from "@/models/Cart";
import Product from "@/models/Product";
import mongoose from "mongoose";
import crypto from "crypto";

export async function POST(request) {
  try {
    await dbConnect();

    const body = await request.json();
    const { couponCode, cartId } = body;

    if (!couponCode?.trim()) {
      return Response.json({ 
        message: "Coupon code is required" 
      }, { status: 400 });
    }

    const user = await getCurrentUser();
    const normalizedCode = couponCode.trim().toUpperCase();

    // For guests, cartId is required for tracking
    if (!user && !cartId) {
      return Response.json({ 
        message: "Cart identification required" 
      }, { status: 400 });
    }

    let cart;
    let cartItems = [];
    let trackingId = user ? user._id.toString() : cartId;

    if (user) {
      // Authenticated user - get cart from database
      cart = await Cart.findOne({ userId: user._id });
      if (!cart?.items?.length) {
        return Response.json({ 
          message: "Your cart is empty. Add items to apply a coupon." 
        }, { status: 400 });
      }

      // Get cart items with product data
      for (const item of cart.items) {
        const product = await Product.findById(item.productId).populate('category');
        if (product) {
          cartItems.push({
            _id: item._id,
            productId: product._id,
            product: product,
            size: item.size,
            quantity: item.quantity,
            price: item.price,
            name: item.name,
            image: item.image,
            slug: item.slug
          });
        }
      }
    } else {
      // Guest user - get cart from session/cookie or create temp tracking
      // For guests, we'll validate against the cart data they send but track usage
      const { guestCartItems } = body;
      
      if (!guestCartItems?.length) {
        return Response.json({ 
          message: "Your cart is empty. Add items to apply a coupon." 
        }, { status: 400 });
      }

      // Validate guest cart items against database to prevent tampering
      for (const item of guestCartItems) {
        const product = await Product.findById(item.productId).populate('category');
        if (product && item.quantity > 0) {
          // Use actual product price from database, not client price
          cartItems.push({
            _id: item._id || new mongoose.Types.ObjectId(),
            productId: product._id,
            product: product,
            size: item.size,
            quantity: item.quantity,
            price: product.discountedPrice || product.price, // Use server price
            name: product.name,
            image: product.images?.[0]?.url || '',
            slug: product.slug
          });
        }
      }
    }

    if (cartItems.length === 0) {
      return Response.json({ 
        message: "No valid items found in cart" 
      }, { status: 400 });
    }

    // Find and validate coupon
    const coupon = await Coupon.findOne({
      code: normalizedCode,
      isActive: true,
      validFrom: { $lte: new Date() },
      validUntil: { $gte: new Date() }
    }).populate(['applicableProducts', 'excludedProducts', 'applicableCategories', 'excludedCategories']);

    if (!coupon) {
      return Response.json({ 
        message: "Invalid or expired coupon code" 
      }, { status: 400 });
    }

    // Check global usage limits
    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
      return Response.json({ 
        message: "This coupon has reached its usage limit" 
      }, { status: 400 });
    }

    // Check user/guest usage limits
    const existingUsage = await CouponUsage.countDocuments({
      $or: [
        user ? { userId: user._id, couponId: coupon._id } : null,
        { guestTrackingId: trackingId, couponId: coupon._id }
      ].filter(Boolean)
    });

    if (existingUsage >= (coupon.userUsageLimit || 1)) {
      return Response.json({ 
        message: `You have already used this coupon ${coupon.userUsageLimit || 1} time${coupon.userUsageLimit > 1 ? 's' : ''}` 
      }, { status: 400 });
    }

    // Calculate discount with server-side validation
    const discountResult = calculateCouponDiscount(coupon, cartItems);

    if (!discountResult.success) {
      return Response.json({ 
        message: discountResult.error 
      }, { status: 400 });
    }

    const couponData = {
      couponId: coupon._id,
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
      description: coupon.description,
      discountAmount: discountResult.totalDiscount,
      shippingDiscount: discountResult.shippingDiscount,
      itemDiscounts: discountResult.itemDiscounts,
      eligibleItems: discountResult.eligibleItems,
      appliedAt: new Date()
    };

    // Save to authenticated user's cart or return for guest
    if (user && cart) {
      cart.appliedCoupon = couponData;
      cart.markModified('appliedCoupon');
      await cart.save();
    }

    // Return secure response with server-calculated values
    return Response.json({
      success: true,
      message: `Coupon ${coupon.code} applied successfully!`,
      coupon: {
        code: coupon.code,
        type: coupon.type,
        value: coupon.value,
        description: coupon.description
      },
      discount: {
        totalDiscount: discountResult.totalDiscount,
        shippingDiscount: discountResult.shippingDiscount,
        itemDiscounts: discountResult.itemDiscounts,
        eligibleItems: discountResult.eligibleItems
      },
      cartTotals: {
        subtotal: discountResult.cartSubtotal,
        totalDiscount: discountResult.totalDiscount,
        shippingDiscount: discountResult.shippingDiscount,
        finalTotal: discountResult.finalTotal
      },
      isGuest: !user,
      trackingId: !user ? trackingId : undefined
    });

  } catch (error) {
    console.error("Apply coupon error:", error);
    return Response.json({ 
      message: "Unable to apply coupon at this time. Please try again." 
    }, { status: 500 });
  }
}

// Server-side discount calculation function
function calculateCouponDiscount(coupon, cartItems) {
  try {
    // Filter eligible items
    const eligibleItems = cartItems.filter(item => {
      return isItemEligibleForCoupon(item.product, coupon);
    });

    if (eligibleItems.length === 0) {
      return { 
        success: false, 
        error: "No items in your cart are eligible for this coupon" 
      };
    }

    // Calculate totals
    const cartSubtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const eligibleSubtotal = eligibleItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    // Check minimum order value
    if (cartSubtotal < coupon.minOrderValue) {
      return { 
        success: false, 
        error: `Minimum order value of ₹${coupon.minOrderValue.toFixed(2)} required` 
      };
    }

    let totalDiscount = 0;
    let shippingDiscount = 0;
    let itemDiscounts = {};

    if (coupon.type === 'shipping') {
      // Shipping discount - applied separately, not to items
      shippingDiscount = coupon.value;
      totalDiscount = shippingDiscount;
      
      // No item-level discounts for shipping coupons
      eligibleItems.forEach(item => {
        itemDiscounts[`${item.productId}-${item.size}`] = 0;
      });
    } else {
      // Product discount calculation
      if (coupon.type === 'percentage') {
        totalDiscount = (eligibleSubtotal * coupon.value) / 100;
        
        // Apply max discount cap if specified
        if (coupon.maxDiscount && totalDiscount > coupon.maxDiscount) {
          totalDiscount = coupon.maxDiscount;
        }
      } else if (coupon.type === 'fixed') {
        totalDiscount = Math.min(coupon.value, eligibleSubtotal);
      }

      // Ensure discount doesn't exceed eligible total
      totalDiscount = Math.min(totalDiscount, eligibleSubtotal);

      // Distribute discount proportionally among eligible items
      let remainingDiscount = totalDiscount;
      
      eligibleItems.forEach((item, index) => {
        const itemTotal = item.price * item.quantity;
        const itemKey = `${item.productId}-${item.size}`;
        
        if (index === eligibleItems.length - 1) {
          // Last item gets remaining discount to handle rounding
          itemDiscounts[itemKey] = Math.round(remainingDiscount * 100) / 100;
        } else {
          // Proportional distribution
          const itemProportion = itemTotal / eligibleSubtotal;
          const itemDiscount = Math.round((totalDiscount * itemProportion) * 100) / 100;
          itemDiscounts[itemKey] = itemDiscount;
          remainingDiscount -= itemDiscount;
        }
      });

      // Add zero discounts for non-eligible items
      cartItems.forEach(item => {
        const itemKey = `${item.productId}-${item.size}`;
        if (!(itemKey in itemDiscounts)) {
          itemDiscounts[itemKey] = 0;
        }
      });
    }

    const finalTotal = Math.max(0, cartSubtotal - totalDiscount);

    return {
      success: true,
      totalDiscount: Math.round(totalDiscount * 100) / 100,
      shippingDiscount: Math.round(shippingDiscount * 100) / 100,
      itemDiscounts,
      eligibleItems: eligibleItems.map(item => ({
        productId: item.productId,
        size: item.size,
        quantity: item.quantity,
        originalPrice: item.price,
        discount: itemDiscounts[`${item.productId}-${item.size}`]
      })),
      cartSubtotal: Math.round(cartSubtotal * 100) / 100,
      eligibleSubtotal: Math.round(eligibleSubtotal * 100) / 100,
      finalTotal: Math.round(finalTotal * 100) / 100
    };
  } catch (error) {
    console.error("Discount calculation error:", error);
    return { 
      success: false, 
      error: "Failed to calculate discount" 
    };
  }
}

// Helper function to check item eligibility
function isItemEligibleForCoupon(product, coupon) {
  try {
    // Check if discounted items are excluded
    if (coupon.excludeDiscountedItems && product.discountedPrice && product.discountedPrice < product.price) {
      return false;
    }

    // Check excluded products
    if (coupon.excludedProducts?.length > 0) {
      const isExcluded = coupon.excludedProducts.some(excludedProduct => 
        excludedProduct._id?.toString() === product._id.toString()
      );
      if (isExcluded) return false;
    }

    // Check excluded categories
    if (coupon.excludedCategories?.length > 0 && product.category) {
      const isExcludedCategory = coupon.excludedCategories.some(excludedCategory => 
        excludedCategory._id?.toString() === product.category._id?.toString()
      );
      if (isExcludedCategory) return false;
    }

    // Check specific product inclusions
    if (coupon.applicableProducts?.length > 0) {
      return coupon.applicableProducts.some(applicableProduct => 
        applicableProduct._id?.toString() === product._id.toString()
      );
    }

    // Check specific category inclusions
    if (coupon.applicableCategories?.length > 0 && product.category) {
      return coupon.applicableCategories.some(applicableCategory => 
        applicableCategory._id?.toString() === product.category._id?.toString()
      );
    }

    // If no restrictions, item is eligible
    return true;
  } catch (error) {
    console.error("Error checking item eligibility:", error);
    return false;
  }
}