// api/checkout/apply-coupon-direct/route.js - Fixed with proper ObjectId handling
import dbConnect from "@/lib/dbConnect";
import { getCurrentUser } from "@/lib/auth";
import Coupon from "@/models/Coupon";
import CouponUsage from "@/models/CouponUsage";
import Product from "@/models/Product";
import mongoose from "mongoose";

export async function POST(request) {
  try {
    await dbConnect();
    
    const { couponCode, item } = await request.json();
    
    if (!couponCode) {
      return Response.json({ message: "Coupon code is required" }, { status: 400 });
    }

    if (!item || !item.productId || !item.quantity) {
      return Response.json({ message: "Invalid item data" }, { status: 400 });
    }
    
    // Get current user (null if guest)
    const user = await getCurrentUser();

    // Validate coupon
    const coupon = await Coupon.findOne({
      code: couponCode.toUpperCase(),
      isActive: true,
      validFrom: { $lte: new Date() },
      validUntil: { $gte: new Date() }
    }).populate(['applicableProducts', 'excludedProducts', 'applicableCategories', 'excludedCategories']);

    if (!coupon) {
      return Response.json({ message: "Invalid or expired coupon" }, { status: 400 });
    }

    // Check usage limits
    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
      return Response.json({ message: "Coupon usage limit exceeded" }, { status: 400 });
    }

    // Check user usage limit (only for authenticated users)
    if (user && coupon.userUsageLimit) {
      const userUsageCount = await CouponUsage.countDocuments({
        userId: new mongoose.Types.ObjectId(user._id), // Fixed ObjectId usage
        couponId: coupon._id
      });

      if (userUsageCount >= coupon.userUsageLimit) {
        return Response.json({ 
          message: "You have reached the usage limit for this coupon" 
        }, { status: 400 });
      }
    }

    // Get product details to validate
    const product = await Product.findById(item.productId);
    if (!product) {
      return Response.json({ message: "Product not found" }, { status: 400 });
    }

    // Check if item is eligible for this coupon
    const isEligible = await isItemEligibleForCoupon(product, coupon);
    if (!isEligible) {
      return Response.json({ 
        message: "This coupon is not applicable to the selected item" 
      }, { status: 400 });
    }

    const itemPrice = product.discountedPrice || product.price;
    const itemTotal = itemPrice * item.quantity;

    // Check minimum order value
    if (itemTotal < coupon.minOrderValue) {
      return Response.json({
        message: `Minimum order value of ₹${coupon.minOrderValue} required`
      }, { status: 400 });
    }

    // Calculate discount
    const discountCalculation = calculateDirectDiscount(coupon, itemTotal);

    return Response.json({
      success: true,
      message: "Coupon applied successfully",
      discount: {
        coupon: {
          code: coupon.code,
          type: coupon.type,
          value: coupon.value,
          description: coupon.description
        },
        discountAmount: discountCalculation.discountAmount,
        itemDiscounts: [{
          productId: item.productId,
          size: item.size,
          discountAmount: discountCalculation.discountAmount
        }],
        finalTotal: itemTotal - discountCalculation.discountAmount,
        originalTotal: itemTotal
      },
      isGuest: !user
    });

  } catch (error) {
    console.error("Apply direct coupon error:", error);
    return Response.json({ message: "Server error" }, { status: 500 });
  }
}

// Helper function to check item eligibility
async function isItemEligibleForCoupon(product, coupon) {
  // Check if product has discount and coupon excludes discounted items
  if (coupon.excludeDiscountedItems && product.discountedPrice && product.discountedPrice < product.price) {
    return false;
  }

  // Check excluded products
  if (coupon.excludedProducts?.some(excludedProduct => 
    excludedProduct._id?.toString() === product._id.toString()
  )) {
    return false;
  }

  // Check excluded categories  
  if (coupon.excludedCategories?.some(excludedCategory => 
    excludedCategory._id?.toString() === product.category?.toString()
  )) {
    return false;
  }

  // If specific products are defined, check inclusion
  if (coupon.applicableProducts?.length > 0) {
    return coupon.applicableProducts.some(applicableProduct => 
      applicableProduct._id?.toString() === product._id.toString()
    );
  }

  // If specific categories are defined, check inclusion
  if (coupon.applicableCategories?.length > 0) {
    return coupon.applicableCategories.some(applicableCategory => 
      applicableCategory._id?.toString() === product.category?.toString()
    );
  }

  // If no specific restrictions, item is eligible
  return true;
}

// Helper function to calculate direct discount
function calculateDirectDiscount(coupon, itemTotal) {
  let discountAmount = 0;

  if (coupon.type === 'percentage') {
    discountAmount = (itemTotal * coupon.value) / 100;
    
    // Apply max discount limit
    if (coupon.maxDiscount && discountAmount > coupon.maxDiscount) {
      discountAmount = coupon.maxDiscount;
    }

  } else if (coupon.type === 'fixed') {
    discountAmount = Math.min(coupon.value, itemTotal);

  } else if (coupon.type === 'shipping') {
    // Shipping discount - applied as flat amount
    discountAmount = coupon.value;
  }

  return {
    discountAmount: Math.round(discountAmount * 100) / 100 // Round to 2 decimals
  };
}