// api/checkout-session/apply-coupon/route.js - Apply coupon to checkout session
import dbConnect from "@/lib/dbConnect";
import { getCurrentUser } from "@/lib/auth";
import { CheckoutSession, Product } from "@/models";
import { CouponValidator } from "@/lib/CouponUtils";

export async function POST(request) {
  try {
    await dbConnect();

    const body = await request.json();
    const { sessionId, couponCode } = body;

    if (!sessionId || !couponCode?.trim()) {
      return Response.json({ 
        message: "Session ID and coupon code are required" 
      }, { status: 400 });
    }

    // Get checkout session
    const session = await CheckoutSession.findOne({ 
      sessionId,
      status: 'active',
      expiresAt: { $gt: new Date() }
    });

    if (!session) {
      return Response.json({ 
        message: "Checkout session not found or expired" 
      }, { status: 404 });
    }

    const user = await getCurrentUser();
    const normalizedCode = couponCode.trim().toUpperCase();

    // Prepare cart items for validation (same structure as cart)
    const cartItems = [];
    for (const item of session.items) {
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

    if (cartItems.length === 0) {
      return Response.json({ 
        message: "No valid items found in checkout session" 
      }, { status: 400 });
    }

    // Use existing coupon validation logic
    const validationResult = await CouponValidator.validateAndCalculate(
      normalizedCode,
      user?._id?.toString(),
      cartItems
    );

    if (!validationResult.isValid) {
      return Response.json({ 
        message: validationResult.error 
      }, { status: 400 });
    }

    // Apply coupon to session
    const couponData = {
      couponId: validationResult.coupon.id,
      code: validationResult.coupon.code,
      type: validationResult.coupon.type,
      value: validationResult.coupon.value,
      description: validationResult.coupon.description,
      discountAmount: validationResult.discount.discountAmount,
      shippingDiscount: validationResult.discount.shippingDiscount || 0,
      itemDiscounts: validationResult.discount.itemDiscounts,
      eligibleItems: validationResult.discount.eligibleItems,
      appliedAt: new Date()
    };

    session.appliedCoupon = couponData;
    await session.save();

    // Calculate updated totals
    const totals = session.calculateTotals();

    return Response.json({
      success: true,
      message: `Coupon ${validationResult.coupon.code} applied successfully!`,
      coupon: {
        code: validationResult.coupon.code,
        type: validationResult.coupon.type,
        value: validationResult.coupon.value,
        description: validationResult.coupon.description
      },
      discount: {
        totalDiscount: validationResult.discount.discountAmount,
        shippingDiscount: validationResult.discount.shippingDiscount || 0,
        itemDiscounts: validationResult.discount.itemDiscounts,
        eligibleItems: validationResult.discount.eligibleItems
      },
      totals
    });

  } catch (error) {
    console.error("Apply coupon to session error:", error);
    return Response.json({ 
      message: "Unable to apply coupon. Please try again." 
    }, { status: 500 });
  }
}

// Remove coupon from checkout session
export async function DELETE(request) {
  try {
    await dbConnect();

    const body = await request.json();
    const { sessionId } = body;

    if (!sessionId) {
      return Response.json({ 
        message: "Session ID is required" 
      }, { status: 400 });
    }

    // Get checkout session
    const session = await CheckoutSession.findOne({ 
      sessionId,
      status: 'active',
      expiresAt: { $gt: new Date() }
    });

    if (!session) {
      return Response.json({ 
        message: "Checkout session not found or expired" 
      }, { status: 404 });
    }

    if (!session.appliedCoupon) {
      return Response.json({ 
        message: "No coupon is currently applied" 
      }, { status: 400 });
    }

    const removedCoupon = {
      code: session.appliedCoupon.code,
      discountAmount: session.appliedCoupon.discountAmount
    };

    // Remove coupon
    session.appliedCoupon = null;
    await session.save();

    // Calculate updated totals
    const totals = session.calculateTotals();

    return Response.json({
      success: true,
      message: "Coupon removed successfully",
      removedCoupon,
      totals
    });

  } catch (error) {
    console.error("Remove coupon from session error:", error);
    return Response.json({ 
      message: "Unable to remove coupon. Please try again." 
    }, { status: 500 });
  }
}