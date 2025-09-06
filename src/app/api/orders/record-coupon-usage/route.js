// api/orders/record-coupon-usage/route.js - Record coupon usage when order is completed
import dbConnect from "@/lib/dbConnect";
import { getCurrentUser } from "@/lib/auth";
import Coupon from "@/models/Coupon";
import CouponUsage from "@/models/CouponUsage";
import Cart from "@/models/Cart";

export async function POST(request) {
  try {
    await dbConnect();

    const body = await request.json();
    const { orderId, couponCode, guestTrackingId } = body;

    if (!orderId || !couponCode) {
      return Response.json({ 
        message: "Order ID and coupon code are required" 
      }, { status: 400 });
    }

    const user = await getCurrentUser();
    const trackingId = user ? user._id.toString() : guestTrackingId;

    if (!trackingId) {
      return Response.json({ 
        message: "User identification required" 
      }, { status: 400 });
    }

    // Find the coupon
    const coupon = await Coupon.findOne({ code: couponCode.toUpperCase() });
    if (!coupon) {
      return Response.json({ 
        message: "Coupon not found" 
      }, { status: 404 });
    }

    // Mark applied coupon usage as used
    const updateResult = await CouponUsage.markAsUsed(
      coupon._id, 
      trackingId, 
      orderId
    );

    if (updateResult.modifiedCount === 0) {
      console.warn(`No applied coupon usage found to mark as used for ${trackingId}`);
    }

    // Increment global usage count
    await Coupon.findByIdAndUpdate(
      coupon._id,
      { $inc: { usageCount: 1 } }
    );

    // Clear coupon from authenticated user's cart
    if (user) {
      try {
        await Cart.updateOne(
          { userId: user._id },
          { $unset: { appliedCoupon: 1 } }
        );
      } catch (error) {
        console.error("Error clearing coupon from cart:", error);
        // Non-critical error, continue
      }
    }

    return Response.json({
      success: true,
      message: "Coupon usage recorded successfully",
      couponCode: coupon.code,
      orderId
    });

  } catch (error) {
    console.error("Record coupon usage error:", error);
    return Response.json({ 
      message: "Failed to record coupon usage" 
    }, { status: 500 });
  }
}

// Utility function to be called from your order completion logic
export async function recordCouponUsageForOrder(orderId, appliedCoupon, userId = null, guestTrackingId = null) {
  if (!appliedCoupon || !orderId) return;

  try {
    await dbConnect();

    const trackingId = userId ? userId.toString() : guestTrackingId;
    
    // Mark as used
    await CouponUsage.markAsUsed(appliedCoupon.couponId, trackingId, orderId);
    
    // Increment global count
    await Coupon.findByIdAndUpdate(
      appliedCoupon.couponId,
      { $inc: { usageCount: 1 } }
    );

    console.log(`Coupon ${appliedCoupon.code} usage recorded for order ${orderId}`);
  } catch (error) {
    console.error("Error recording coupon usage:", error);
  }
}