// api/payments/verify-payment/route.js - USING LOCKED TOTAL
import { NextResponse } from "next/server";
import crypto from "crypto";
import { verifyCheckoutSession } from "@/lib/middleware/checkoutAuth";
import { CheckoutSession, Order } from "@/models";
import dbConnect from "@/lib/dbConnect";
import Razorpay from "razorpay";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

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

    // ========================================
    // 1. SIGNATURE VERIFICATION
    // ========================================
    const isValidSignature = verifyRazorpaySignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      process.env.RAZORPAY_KEY_SECRET
    );

    if (!isValidSignature) {
      console.error("❌ Invalid Razorpay signature", {
        razorpay_order_id,
        razorpay_payment_id,
      });
      return NextResponse.json(
        { error: "Invalid payment signature" },
        { status: 400 }
      );
    }

    // ========================================
    // 2. PHONE AUTHENTICATION VERIFICATION
    // ========================================
    const verification = await verifyCheckoutSession(request);
    if (!verification.verified) {
      console.error("❌ Phone verification failed", {
        razorpay_order_id,
        error: verification.error,
      });
      return NextResponse.json(
        {
          error: verification.error || "Session verification required",
          redirectTo: verification.redirectUrl,
        },
        { status: 401 }
      );
    }

    await dbConnect();

    // ========================================
    // 3. OPTIMISTIC LOCKING
    // ========================================
    const lockedSession = await CheckoutSession.findOneAndUpdate(
      {
        razorpayOrderId: razorpay_order_id,
        status: "active",
      },
      {
        $set: { status: "processing" },
      },
      {
        new: true,
      }
    );

    if (!lockedSession) {
      // Check for replay attack
      const existingOrder = await Order.findOne({
        "paymentDetails.razorpayPaymentId": razorpay_payment_id,
      });

      if (existingOrder) {
        console.warn("⚠️ Duplicate payment verification attempt", {
          razorpay_payment_id,
          existingOrderNumber: existingOrder.orderNumber,
        });
        return NextResponse.json({
          success: true,
          orderId: existingOrder.orderNumber,
          alreadyProcessed: true,
          message: "This payment was already confirmed",
          order: {
            orderNumber: existingOrder.orderNumber,
            status: existingOrder.orderStatus,
            total: existingOrder.totals.finalTotal,
          },
        });
      }

      return NextResponse.json(
        { error: "Checkout session not found or already processed" },
        { status: 404 }
      );
    }

    const checkoutSession = lockedSession;

    try {
      // ========================================
      // 4. OWNERSHIP VALIDATION
      // ========================================
      const currentIP =
        request.headers.get("x-forwarded-for")?.split(",")[0] ||
        request.headers.get("x-real-ip") ||
        "unknown";

      if (
        checkoutSession.ipAddress &&
        checkoutSession.ipAddress !== "unknown" &&
        checkoutSession.ipAddress !== currentIP
      ) {
        console.warn("⚠️ IP address changed during checkout", {
          sessionId: checkoutSession.sessionId,
          originalIP: checkoutSession.ipAddress,
          currentIP,
          phoneNumber: verification.phoneNumber,
        });
      }

      const currentUserAgent = request.headers.get("user-agent") || "unknown";
      if (
        checkoutSession.userAgent &&
        checkoutSession.userAgent !== "unknown" &&
        checkoutSession.userAgent !== currentUserAgent
      ) {
        console.warn("⚠️ User agent changed during checkout", {
          sessionId: checkoutSession.sessionId,
          phoneNumber: verification.phoneNumber,
        });
      }

      // ========================================
      // 5. TIME-BASED SECURITY
      // ========================================
      if (checkoutSession.paymentInitiatedAt) {
        const timeSinceInitiation =
          Date.now() - new Date(checkoutSession.paymentInitiatedAt).getTime();
        const thirtyMinutes = 30 * 60 * 1000;

        if (timeSinceInitiation > thirtyMinutes) {
          checkoutSession.status = "expired";
          await checkoutSession.save();

          return NextResponse.json(
            { error: "Payment session expired. Please restart checkout." },
            { status: 400 }
          );
        }
      }

      // ========================================
      // 6. CROSS-VERIFICATION WITH RAZORPAY
      // ========================================
      let razorpayPayment;
      try {
        razorpayPayment = await razorpay.payments.fetch(razorpay_payment_id);

        if (
          razorpayPayment.status !== "captured" &&
          razorpayPayment.status !== "authorized"
        ) {
          console.error("❌ Payment not captured on Razorpay", {
            razorpay_payment_id,
            status: razorpayPayment.status,
          });

          checkoutSession.status = "active";
          await checkoutSession.save();

          return NextResponse.json(
            {
              error: `Payment not completed. Status: ${razorpayPayment.status}`,
            },
            { status: 400 }
          );
        }

        if (razorpayPayment.order_id !== razorpay_order_id) {
          console.error("❌ Razorpay order ID mismatch", {
            expected: razorpay_order_id,
            received: razorpayPayment.order_id,
          });

          checkoutSession.status = "active";
          await checkoutSession.save();

          return NextResponse.json(
            { error: "Payment order mismatch" },
            { status: 400 }
          );
        }
      } catch (razorpayError) {
        console.error("❌ Razorpay API verification failed", razorpayError);

        checkoutSession.status = "active";
        await checkoutSession.save();

        return NextResponse.json(
          { error: "Unable to verify payment with payment gateway" },
          { status: 500 }
        );
      }

      // ========================================
      // 7. AMOUNT INTEGRITY VALIDATION (USING LOCKED TOTAL)
      // ========================================

      // ✅ USE LOCKED TOTAL - Price frozen at payment initiation
      if (!checkoutSession.lockedTotal || !checkoutSession.lockedTotals) {
        // Fallback: If somehow locked total is missing, reject payment
        console.error(
          "❌ No locked total found - session integrity compromised",
          {
            sessionId: checkoutSession.sessionId,
            razorpay_payment_id,
          }
        );

        checkoutSession.status = "active";
        await checkoutSession.save();

        return NextResponse.json(
          {
            error: "Payment session integrity error. Please restart checkout.",
          },
          { status: 400 }
        );
      }

      const expectedAmount = Math.round(checkoutSession.lockedTotal * 100); // In paise
      const actualAmount = razorpayPayment.amount;

      if (expectedAmount !== actualAmount) {
        console.error("❌ Payment amount mismatch - possible tampering", {
          sessionId: checkoutSession.sessionId,
          expectedAmount,
          actualAmount,
          difference: actualAmount - expectedAmount,
          lockedAt: checkoutSession.lockedTotals.lockedAt,
          coupon: checkoutSession.appliedCoupon?.code || "none",
        });

        // CRITICAL: This indicates tampering attempt
        checkoutSession.status = "active";
        await checkoutSession.save();

        return NextResponse.json(
          {
            error: "Payment amount mismatch. Please contact support.",
            code: "AMOUNT_TAMPERING_DETECTED",
          },
          { status: 400 }
        );
      }

      // ========================================
      // 8. CREATE ORDER (Using LOCKED totals)
      // ========================================
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
          gatewayResponse: {
            amount: razorpayPayment.amount,
            currency: razorpayPayment.currency,
            status: razorpayPayment.status,
            method: razorpayPayment.method,
          },
        },
        orderStatus: "confirmed",
        confirmedAt: new Date(),

        // ✅ USE LOCKED TOTALS - Not recalculated
        totals: checkoutSession.lockedTotals,

        appliedCoupon: checkoutSession.appliedCoupon,
        sessionId: checkoutSession.sessionId,
        orderSource: checkoutSession.type,
        guestTrackingId: checkoutSession.guestTrackingId,

        securityMetadata: {
          verifiedPhone: verification.phoneNumber,
          ipAddress: currentIP,
          userAgent: currentUserAgent,
          sessionCreatedAt: checkoutSession.createdAt,
          paymentInitiatedAt: checkoutSession.paymentInitiatedAt,
          paymentVerifiedAt: new Date(),
          priceLockedAt: checkoutSession.lockedTotals.lockedAt,
          fingerprintMatch: checkoutSession.userAgent === currentUserAgent,
        },
      });

      // ========================================
      // ✅ SHIPMENT CREATION (Automatic)
      // ========================================
      const createShipment = async () => {
        try {
          const shipmentResponse = await fetch(
            `${
              process.env.NODE_ENV === "production"
                ? "https://yourdomain.com"
                : "http://localhost:3000"
            }/api/shipping/create-shipment`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ orderNumber: order.orderNumber }),
            }
          );

          if (shipmentResponse.ok) {
            const shipmentData = await shipmentResponse.json();
            console.log("✅ Shipment created successfully", {
              orderNumber: order.orderNumber,
              shipmentId: shipmentData.shipment.shipmentId,
            });
          } else {
            console.warn(
              "⚠️ Shipment creation failed (order created successfully)"
            );
          }
        } catch (shipmentError) {
          console.warn("⚠️ Shipment creation error (order already created)");
        }
      };

      // Create shipment asynchronously (don't wait)
      createShipment().catch((err) => {
        console.error("🔴 Shipment creation async error:", err);
      });

      // ========================================
      // 9. CLEANUP & FINALIZE
      // ========================================
      await checkoutSession.releaseReservations("completed");

      checkoutSession.status = "completed";
      checkoutSession.completedAt = new Date();
      checkoutSession.orderId = order._id;
      await checkoutSession.save();

      // ========================================
      // 10. SUCCESS RESPONSE
      // ========================================
      return NextResponse.json({
        success: true,
        orderId: order.orderNumber,
        order: {
          orderNumber: order.orderNumber,
          status: order.orderStatus,
          total: checkoutSession.lockedTotal, // Return locked total
          items: order.items,
          shippingAddress: order.shippingAddress,
        },
      });
    } catch (processingError) {
      console.error("❌ Error during payment processing", processingError);

      if (checkoutSession && checkoutSession.status === "processing") {
        checkoutSession.status = "active";
        await checkoutSession.save();
      }

      throw processingError;
    }
  } catch (error) {
    console.error("❌ Payment verification error", error);
    return NextResponse.json(
      {
        error: "Payment verification failed",
        message:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
