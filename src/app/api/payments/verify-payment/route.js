// api/payments/verify-payment/route.js
import { NextResponse } from "next/server";
import crypto from "crypto";
import { verifyCheckoutSession } from "@/lib/middleware/checkoutAuth";
import { CheckoutSession, Order } from "@/models";
import dbConnect from "@/lib/dbConnect";

function verifyRazorpaySignature(orderID, paymentID, signature, secret) {
  const body = orderID + "|" + paymentID;
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(body.toString())
    .digest("hex");

  return expectedSignature === signature;
}

export async function POST(request) {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      shippingAddress,
    } = await request.json();

    // Verify signature first
    const isValidSignature = verifyRazorpaySignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      process.env.RAZORPAY_KEY_SECRET
    );

    if (!isValidSignature) {
      return NextResponse.json(
        { error: "Invalid payment signature" },
        { status: 400 }
      );
    }

    // Verify checkout session using your existing middleware
    const verification = await verifyCheckoutSession(request);
    if (!verification.verified) {
      return NextResponse.json(
        {
          error: verification.error || "Session verification required",
          redirectTo: verification.redirectUrl,
        },
        { status: 401 }
      );
    }

    await dbConnect();

    // Get checkout session by Razorpay order ID
    const checkoutSession = await CheckoutSession.findOne({
      razorpayOrderId: razorpay_order_id,
      status: "active",
    });

    if (!checkoutSession) {
      return NextResponse.json(
        { error: "Checkout session not found or already processed" },
        { status: 404 }
      );
    }
    console.log("verification.sessionId:", verification.sessionId);
    console.log("checkoutSession.sessionId:", checkoutSession.sessionId);

    // Verify this payment belongs to the authenticated user's session
    if (checkoutSession.sessionId !== verification.sessionId) {
      return NextResponse.json(
        { error: "Session mismatch - unauthorized payment" },
        { status: 403 }
      );
    }

    // Create order from checkout session
    const totals = checkoutSession.calculateTotals();

    const order = await Order.create({
      orderNumber: Order.generateOrderNumber(),
      customerPhone: verification.phoneNumber,
      customerEmail: shippingAddress.email,
      customerName: shippingAddress.fullName,
      items: checkoutSession.items,
      shippingAddress,
      paymentDetails: {
        method: "razorpay",
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
        status: "completed",
        paidAt: new Date(),
      },
      orderStatus: "confirmed",
      confirmedAt: new Date(),
      totals,
      appliedCoupon: checkoutSession.appliedCoupon,
      sessionId: checkoutSession.sessionId,
      orderSource: checkoutSession.type,
      guestTrackingId: checkoutSession.guestTrackingId,
    });

    // Complete checkout session and release reservations
    await checkoutSession.releaseReservations("completed");
    checkoutSession.status = "completed";
    checkoutSession.completedAt = new Date();
    checkoutSession.orderId = order._id;
    await checkoutSession.save();

    return NextResponse.json({
      success: true,
      orderId: order.orderNumber,
      order: {
        orderNumber: order.orderNumber,
        status: order.orderStatus,
        total: totals.finalTotal,
        items: order.items,
        shippingAddress: order.shippingAddress,
      },
    });
  } catch (error) {
    console.error("Payment verification error:", error);
    return NextResponse.json(
      { error: "Payment verification failed" },
      { status: 500 }
    );
  }
}
