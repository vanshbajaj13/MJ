// api/payments/create-razorpay-order/route.js
import Razorpay from "razorpay";
import dbConnect from "@/lib/dbConnect";
import { verifyCheckoutSession } from "@/lib/middleware/checkoutAuth";
import CheckoutSession from "@/models/CheckoutSession";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

export async function POST(request) {
  try {
    await dbConnect();

    const { sessionId, shippingAddress } = await request.json();

    if (!sessionId || !shippingAddress) {
      return Response.json(
        { error: "Session ID and shipping address are required" },
        { status: 400 }
      );
    }

    // Verify WhatsApp authentication
    const verification = await verifyCheckoutSession(request);
    if (!verification.verified) {
      return Response.json(
        { error: "Session verification required" },
        { status: 401 }
      );
    }

    // Get and validate checkout session
    const session = await CheckoutSession.findOne({
      sessionId,
      status: "active",
      expiresAt: { $gt: new Date() },
    });

    if (!session) {
      return Response.json(
        { error: "Checkout session not found or expired" },
        { status: 404 }
      );
    }

    // Check if session was validated (by validate-for-payment endpoint)
    if (!session.validatedAt || 
        (Date.now() - new Date(session.validatedAt).getTime()) > 5 * 60 * 1000) {
      return Response.json(
        { 
          error: "Session validation expired. Please validate again.",
          requiresValidation: true 
        },
        { status: 400 }
      );
    }

    // Calculate final totals from backend
    const totals = session.calculateTotals();

    // Create Razorpay order
    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(totals.finalTotal * 100), // Amount in paise
      currency: "INR",
      receipt: `${sessionId}_${Date.now()}`,
      notes: {
        sessionId: sessionId,
        sessionType: session.type,
        customerPhone: verification.phoneNumber,
        customerEmail: shippingAddress.email,
        customerName: shippingAddress.fullName,
        itemCount: session.items.length,
      },
    });

    // Store Razorpay order ID in session for verification
    session.razorpayOrderId = razorpayOrder.id;
    session.paymentInitiatedAt = new Date();
    await session.save();

    return Response.json({
      success: true,
      orderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      key: process.env.RAZORPAY_KEY_ID,
      sessionId: session.sessionId,
      totals: {
        subtotal: totals.subtotal,
        discount: totals.totalDiscount,
        shipping: 0,
        total: totals.finalTotal,
      },
      customerDetails: {
        name: shippingAddress.fullName,
        email: shippingAddress.email,
        contact: verification.phoneNumber,
      },
    });
  } catch (error) {
    console.error("Create Razorpay order error:", error);
    return Response.json(
      { error: "Failed to create payment order" },
      { status: 500 }
    );
  }
}