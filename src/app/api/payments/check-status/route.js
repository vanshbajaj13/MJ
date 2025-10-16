// api/payments/check-status/route.js - User-triggered recovery
import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { CheckoutSession, Order } from "@/models";
import Razorpay from "razorpay";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

/**
 * Check payment status and create order if payment succeeded
 * but verification failed
 *
 * User sees: "Payment verification failed. Checking status..."
 */
export async function POST(request) {
  try {
    await dbConnect();

    const { razorpay_order_id, sessionId } = await request.json();

    if (!razorpay_order_id) {
      return NextResponse.json(
        { error: "Razorpay order ID is required" },
        { status: 400 }
      );
    }

    // ========================================
    // 1. CHECK IF ORDER ALREADY EXISTS
    // ========================================
    const existingOrder = await Order.findOne({
      "paymentDetails.razorpayOrderId": razorpay_order_id,
    });

    if (existingOrder) {
      return NextResponse.json({
        success: true,
        status: "completed",
        orderExists: true,
        order: {
          orderNumber: existingOrder.orderNumber,
          status: existingOrder.orderStatus,
          total: existingOrder.totals.finalTotal,
        },
      });
    }

    // ========================================
    // 2. GET CHECKOUT SESSION
    // ========================================
    const checkoutSession = await CheckoutSession.findOne({
      razorpayOrderId: razorpay_order_id,
    });

    if (!checkoutSession) {
      console.error("❌ CheckoutSession not found", {
        razorpay_order_id,
      });

      return NextResponse.json({
        success: false,
        status: "session_not_found",
        message: "Session not found. Please contact support.",
        supportInfo: {
          razorpay_order_id,
          timestamp: new Date().toISOString(),
        },
      });
    }

    // ========================================
    // 3. FETCH PAYMENTS FROM RAZORPAY
    // ========================================
    let payments;
    try {
      const orderDetails = await razorpay.orders.fetch(razorpay_order_id);

      // Get all payments for this order
      payments = await razorpay.orders.fetchPayments(razorpay_order_id);
    } catch (razorpayError) {
      console.error("❌ Failed to fetch from Razorpay", razorpayError);

      return NextResponse.json({
        success: false,
        status: "razorpay_error",
        message:
          "Unable to verify payment. Please try again or contact support.",
        supportInfo: {
          razorpay_order_id,
          sessionId: checkoutSession.sessionId,
        },
      });
    }

    // ========================================
    // 4. FIND CAPTURED PAYMENT
    // ========================================
    const capturedPayment = payments.items?.find(
      (p) => p.status === "captured" || p.status === "authorized"
    );

    if (!capturedPayment) {
      return NextResponse.json({
        success: false,
        status: "payment_not_completed",
        message: "Payment not completed. Please try again.",
        canRetry: true,
      });
    }

    // ========================================
    // 5. VALIDATE AMOUNT
    // ========================================
    if (!checkoutSession.lockedTotal) {
      return NextResponse.json({
        success: false,
        status: "session_invalid",
        message: "Session data incomplete. Please contact support.",
      });
    }

    const expectedAmount = Math.round(checkoutSession.lockedTotal * 100);
    if (expectedAmount !== capturedPayment.amount) {
      console.error("❌ Amount mismatch", {
        expected: expectedAmount,
        received: capturedPayment.amount,
      });

      return NextResponse.json({
        success: false,
        status: "amount_mismatch",
        message: "Payment amount mismatch. Please contact support.",
        supportInfo: {
          razorpay_order_id,
          razorpay_payment_id: capturedPayment.id,
          expected: expectedAmount / 100,
          received: capturedPayment.amount / 100,
        },
      });
    }

    // ========================================
    // 6. CREATE ORDER (Recovery)
    // ========================================
    try {
      // Lock session
      const locked = await CheckoutSession.findOneAndUpdate(
        {
          _id: checkoutSession._id,
          status: { $in: ["active", "processing"] },
        },
        { $set: { status: "processing" } },
        { new: true }
      );

      if (!locked) {
        // Session already completed by webhook
        const order = await Order.findOne({
          "paymentDetails.razorpayPaymentId": capturedPayment.id,
        });

        if (order) {
          return NextResponse.json({
            success: true,
            status: "completed",
            orderExists: true,
            recoveredByWebhook: true,
            order: {
              orderNumber: order.orderNumber,
              status: order.orderStatus,
              total: order.totals.finalTotal,
            },
          });
        }
      }

      // Get shipping address
      let shippingAddress = checkoutSession.validatedAddress;
      if (!shippingAddress) {
        shippingAddress = {
          fullName: capturedPayment.notes?.customerName || "Customer",
          email: capturedPayment.email || "noemail@provided.com",
          phoneNumber:
            capturedPayment.contact ||
            checkoutSession.verifiedPhone ||
            "Not provided",
          addressLine1: "Address pending",
          city: "City pending",
          state: "State pending",
          pincode: "000000",
        };
      }

      const order = await Order.create({
        orderNumber: Order.generateOrderNumber(),
        customerPhone: capturedPayment.contact || checkoutSession.verifiedPhone,
        customerEmail: capturedPayment.email || shippingAddress.email,
        customerName: shippingAddress.fullName,
        items: checkoutSession.items,
        shippingAddress,
        paymentDetails: {
          method: "razorpay",
          razorpayOrderId: razorpay_order_id,
          razorpayPaymentId: capturedPayment.id,
          razorpaySignature: "recovered", // No signature available
          status: "completed",
          paidAt: new Date(capturedPayment.created_at * 1000),
          gatewayResponse: {
            amount: capturedPayment.amount,
            currency: capturedPayment.currency,
            status: capturedPayment.status,
            method: capturedPayment.method,
          },
        },
        orderStatus: "confirmed",
        confirmedAt: new Date(),
        totals: checkoutSession.lockedTotals,
        appliedCoupon: checkoutSession.appliedCoupon,
        sessionId: checkoutSession.sessionId,
        orderSource: checkoutSession.type,
        guestTrackingId: checkoutSession.guestTrackingId,

        securityMetadata: {
          createdVia: "status_check", // Important: Mark as recovered
          verifiedPhone: checkoutSession.verifiedPhone,
          ipAddress: checkoutSession.ipAddress,
          recoveredAt: new Date(),
        },
      });

      // Release reservations
      await checkoutSession.releaseReservations("completed");

      // ========================================
      // ✅ SHIPMENT CREATION (Automatic for Recovered Orders)
      // ========================================
      const createShipmentForRecovery = async () => {
        try {
          const shipmentResponse = await fetch(
            `${
              process.env.NODE_ENV === "production"
                ? process.env.NEXT_PUBLIC_API_BASE_URL ||
                  "https://yourdomain.com"
                : "http://localhost:3000"
            }/api/shipping/create-shipment`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ orderNumber: order.orderNumber }),
            }
          );

          if (shipmentResponse.ok) {
            console.log("✅ Shipment created for recovered order");
          }
        } catch (shipmentError) {
          console.warn("⚠️ Shipment creation error during recovery");
        }
      };

      // Create shipment asynchronously
      createShipmentForRecovery().catch((err) => {
        console.error("🔴 Shipment creation error during recovery:", err);
      });

      // Update session
      checkoutSession.status = "completed";
      checkoutSession.completedAt = new Date();
      checkoutSession.orderId = order._id;
      await checkoutSession.save();

      return NextResponse.json({
        success: true,
        status: "completed",
        recovered: true,
        message: "Payment verified successfully! Your order has been created.",
        order: {
          orderNumber: order.orderNumber,
          status: order.orderStatus,
          total: checkoutSession.lockedTotal,
          items: order.items,
        },
      });
    } catch (orderError) {
      console.error("❌ Failed to create order during recovery", orderError);

      return NextResponse.json({
        success: false,
        status: "recovery_failed",
        message:
          "Payment confirmed but order creation failed. Our team will resolve this shortly.",
        supportInfo: {
          razorpay_order_id,
          razorpay_payment_id: capturedPayment.id,
          sessionId: checkoutSession.sessionId,
          timestamp: new Date().toISOString(),
        },
      });
    }
  } catch (error) {
    console.error("❌ Status check error", error);

    return NextResponse.json(
      {
        success: false,
        status: "error",
        message: "Unable to check payment status. Please contact support.",
      },
      { status: 500 }
    );
  }
}
