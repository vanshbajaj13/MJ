// api/checkout/validate-coupon/route.js - Fixed version with proper ObjectId handling
import dbConnect from "@/lib/dbConnect";
import Coupon from "@/models/Coupon";
import CouponUsage from "@/models/CouponUsage";
import Product from "@/models/Product";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import mongoose from "mongoose";

export async function POST(request) {
  try {
    await dbConnect();
    
    const session = await getServerSession(authOptions);
    const { couponCode, items, isDirect = false } = await request.json();

    if (!couponCode) {
      return Response.json({ success: true, discount: null });
    }

    // Validate coupon exists and is active
    const coupon = await Coupon.findOne({
      code: couponCode.toUpperCase(),
      isActive: true,
      validFrom: { $lte: new Date() },
      validUntil: { $gte: new Date() }
    }).populate(['applicableProducts', 'excludedProducts', 'applicableCategories', 'excludedCategories']);

    if (!coupon) {
      return Response.json({ message: "Invalid or expired coupon" }, { status: 400 });
    }

    // Check coupon usage limit
    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
      return Response.json({ message: "Coupon usage limit exceeded" }, { status: 400 });
    }

    // For logged in users, verify they haven't exceeded usage limits
    if (session?.user?.id) {
      const userUsageCount = await CouponUsage.countDocuments({
        userId: new mongoose.Types.ObjectId(session.user.id), // Fixed ObjectId usage
        couponId: coupon._id
      });

      if (userUsageCount >= coupon.userUsageLimit) {
        return Response.json({ 
          message: "You have exceeded the usage limit for this coupon" 
        }, { status: 400 });
      }
    }

    // Validate and calculate totals for each item
    let totalAmount = 0;
    let eligibleAmount = 0;
    
    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product) continue;

      const itemTotal = product.price * item.quantity;
      totalAmount += itemTotal;

      // Check if item is eligible for this coupon
      const isEligible = await isItemEligibleForCoupon(product, coupon);
      if (isEligible) {
        eligibleAmount += itemTotal;
      }
    }

    // Check minimum order value
    if (totalAmount < coupon.minOrderValue) {
      return Response.json({
        message: `Minimum order value of ₹${coupon.minOrderValue} required`
      }, { status: 400 });
    }

    // Check if any items are eligible
    if (eligibleAmount === 0) {
      return Response.json({
        message: "This coupon is not applicable to items in your order"
      }, { status: 400 });
    }

    // Calculate discount
    let discountAmount = 0;
    if (coupon.type === 'percentage') {
      discountAmount = (eligibleAmount * coupon.value) / 100;
      if (coupon.maxDiscount && discountAmount > coupon.maxDiscount) {
        discountAmount = coupon.maxDiscount;
      }
    } else if (coupon.type === 'fixed') {
      discountAmount = Math.min(coupon.value, eligibleAmount);
    } else if (coupon.type === 'shipping') {
      discountAmount = coupon.value;
    }

    return Response.json({
      success: true,
      discount: {
        coupon: {
          code: coupon.code,
          type: coupon.type,
          value: coupon.value,
          description: coupon.description
        },
        discountAmount: Math.round(discountAmount * 100) / 100,
        finalTotal: totalAmount - discountAmount,
        eligibleAmount
      }
    });

  } catch (error) {
    console.error("Validate coupon error:", error);
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