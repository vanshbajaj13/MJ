// api/payments/create-razorpay-order/route.js
import Razorpay from "razorpay";
import dbConnect from "@/lib/dbConnect";
import { verifyCheckoutSession } from "@/lib/middleware/checkoutAuth";
import { CheckoutSession } from "@/models";
import { SignJWT } from 'jose';

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

    // Verify phone authentication
    const verification = await verifyCheckoutSession(request);
    if (!verification.verified) {
      return Response.json(
        { 
          error: verification.error || "Session verification required",
          redirectTo: verification.redirectUrl 
        },
        { status: 401 }
      );
    }

    // ========================================
    // 🔄 AUTO-EXTEND WHATSAPP TOKEN IF NEEDED
    // ========================================
    let extendedToken = null;
    const hoursRemaining = verification.sessionAge ? (48 - verification.sessionAge) : 48;
    
    if (hoursRemaining < 1) { // Less than 1 hour remaining
      try {
        const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key');
        
        extendedToken = await new SignJWT({
          phoneNumber: verification.phoneNumber,
          timestamp: Date.now(),
          sessionId: verification.sessionId || crypto.randomUUID(),
          extendedForPayment: true,
          originalTimestamp: verification.timestamp
        })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('30m')
        .sign(secret);
      } catch (extendError) {
        console.error("⚠️ Failed to extend WhatsApp token", extendError);
      }
    }

    // Get checkout session
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

    // Check if session was validated
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

    // ========================================
    // 🔄 EXTEND CHECKOUT SESSION & RESERVATIONS
    // ========================================
    // Critical: Extend session before payment to give user time
    // This prevents session from expiring while user is paying
    
    const timeRemaining = session.getTimeRemaining();
    const fiveMinutes = 5 * 60 * 1000;
    let wasExtended = false;
    
    // If less than 5 minutes remaining, extend the session
    if (timeRemaining < fiveMinutes) {

      try {
        await session.extendForPayment(); // Extends by 30 minutes
        wasExtended = true;
      } catch (extensionError) {
        console.error("❌ Failed to extend session", extensionError);
        // Continue anyway - user might still complete payment quickly
      }
    }

    // ========================================
    // 🔒 LOCK THE PRICE
    // ========================================
    const lockedTotals = session.lockTotals();

    // ========================================
    // 💳 CREATE RAZORPAY ORDER
    // ========================================
    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(lockedTotals.finalTotal * 100),
      currency: "INR",
      receipt: `rcpt_${sessionId.slice(-10)}_${Date.now()}`.substring(0, 40),
      notes: {
        sessionId: sessionId,
        sessionType: session.type,
        customerPhone: verification.phoneNumber,
        customerEmail: shippingAddress.email,
        customerName: shippingAddress.fullName,
        itemCount: session.items.length,
        lockedTotal: lockedTotals.finalTotal,
        couponApplied: session.appliedCoupon?.code || 'none',
        sessionExtended: wasExtended ? 'yes' : 'no'
      },
    });

    // Store Razorpay order ID and payment initiation time
    session.razorpayOrderId = razorpayOrder.id;
    session.paymentInitiatedAt = new Date();
    
    // Store verified phone for fallback verification
    session.verifiedPhone = verification.phoneNumber;
    session.phoneVerifiedAt = new Date();
    
    await session.save();

    // ========================================
    // 📦 BUILD RESPONSE
    // ========================================
    const response = Response.json({
      success: true,
      orderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      key: process.env.RAZORPAY_KEY_ID,
      sessionId: session.sessionId,
      totals: {
        subtotal: lockedTotals.subtotal,
        discount: lockedTotals.totalDiscount,
        shipping: 0,
        total: lockedTotals.finalTotal,
        locked: true,
        lockedAt: session.lockedTotals.lockedAt
      },
      customerDetails: {
        name: shippingAddress.fullName,
        email: shippingAddress.email,
        contact: verification.phoneNumber,
      },
      priceProtection: {
        locked: true,
        expiresAt: session.expiresAt,
        message: "Your price is protected for 30 minutes",
        sessionExtended: wasExtended
      }
    });

    // ========================================
    // 🔄 SET EXTENDED WHATSAPP TOKEN IF GENERATED
    // ========================================
    if (extendedToken) {
      const headers = new Headers(response.headers);
      const cookieString = `checkout-session=${extendedToken}; HttpOnly; ${process.env.NODE_ENV === 'production' ? 'Secure; ' : ''}SameSite=Lax; Max-Age=${30 * 60}; Path=/`;
      headers.append('Set-Cookie', cookieString);
      
      return new Response(response.body, {
        status: response.status,
        headers: headers
      });
    }

    return response;
    
  } catch (error) {
    console.error("❌ Create Razorpay order error:", error);
    return Response.json(
      { error: "Failed to create payment order" },
      { status: 500 }
    );
  }
}