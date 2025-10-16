// api/webhooks/razorpay/route.js - CRITICAL SAFETY NET
import { NextResponse } from "next/server";
import crypto from "crypto";
import dbConnect from "@/lib/dbConnect";
import { CheckoutSession, Order } from "@/models";

/**
 * Razorpay Webhook Handler
 * This is called by Razorpay when payment status changes
 * Works even if user's frontend verification fails
 */
export async function POST(request) {
  try {
    // ========================================
    // 1. VERIFY WEBHOOK SIGNATURE
    // ========================================
    const body = await request.text(); // Get raw body for signature verification
    const signature = request.headers.get("x-razorpay-signature");

    if (!signature) {
      console.error("❌ Webhook signature missing");
      return NextResponse.json({ error: "Signature missing" }, { status: 400 });
    }

    // Verify webhook is from Razorpay
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(body)
      .digest("hex");

    if (expectedSignature !== signature) {
      console.error("❌ Invalid webhook signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const event = JSON.parse(body);

    // ========================================
    // 2. HANDLE PAYMENT CAPTURED EVENT
    // ========================================
    if (event.event === "payment.captured") {
      const payment = event.payload.payment.entity;

      await handlePaymentCaptured(payment);

      return NextResponse.json({
        success: true,
        message: "Webhook processed successfully",
      });
    }

    // ========================================
    // 3. HANDLE PAYMENT FAILED EVENT
    // ========================================
    if (event.event === "payment.failed") {
      const payment = event.payload.payment.entity;

      await handlePaymentFailed(payment);

      return NextResponse.json({
        success: true,
        message: "Payment failure recorded",
      });
    }

    // Other events - just acknowledge
    return NextResponse.json({
      success: true,
      message: "Event received",
    });
  } catch (error) {
    console.error("❌ Webhook processing error", error);

    // IMPORTANT: Return 200 even on error to prevent Razorpay from retrying
    // Log error to monitoring system instead
    return NextResponse.json(
      {
        success: false,
        error: "Internal error - logged for review",
      },
      { status: 200 }
    );
  }
}

// ========================================
// HANDLE SUCCESSFUL PAYMENT
// ========================================
async function handlePaymentCaptured(payment) {
  await dbConnect();

  const {
    id: razorpay_payment_id,
    order_id: razorpay_order_id,
    amount,
    method,
    status,
    email,
    contact,
  } = payment;

  // ========================================
  // CHECK IF ORDER ALREADY EXISTS
  // ========================================
  const existingOrder = await Order.findOne({
    "paymentDetails.razorpayPaymentId": razorpay_payment_id,
  });

  if (existingOrder) {
    return;
  }

  // ========================================
  // FIND CHECKOUT SESSION
  // ========================================
  const checkoutSession = await CheckoutSession.findOne({
    razorpayOrderId: razorpay_order_id,
  });

  if (!checkoutSession) {
    console.error("❌ CheckoutSession not found for webhook", {
      razorpay_order_id,
      razorpay_payment_id,
    });

    // Log to admin dashboard for manual resolution
    await logOrphanedPayment({
      razorpay_payment_id,
      razorpay_order_id,
      amount,
      contact,
      email,
      reason: "CheckoutSession not found",
    });

    return;
  }

  // ========================================
  // VALIDATE AMOUNT
  // ========================================
  if (!checkoutSession.lockedTotal) {
    console.error("❌ No locked total in session", {
      sessionId: checkoutSession.sessionId,
    });
    return;
  }

  const expectedAmount = Math.round(checkoutSession.lockedTotal * 100);
  if (expectedAmount !== amount) {
    console.error("❌ Amount mismatch in webhook", {
      expected: expectedAmount,
      received: amount,
      difference: amount - expectedAmount,
    });

    await logOrphanedPayment({
      razorpay_payment_id,
      razorpay_order_id,
      amount,
      contact,
      email,
      reason: "Amount mismatch",
      expectedAmount,
      receivedAmount: amount,
    });

    return;
  }

  // ========================================
  // GET SHIPPING ADDRESS
  // ========================================
  // If we have validatedAddress, use it
  // Otherwise, use customer info from payment
  let shippingAddress = checkoutSession.validatedAddress;

  if (!shippingAddress) {
    console.warn("⚠️ No shipping address in session, using payment data", {
      sessionId: checkoutSession.sessionId,
    });

    // Fallback: Create basic address from payment data
    shippingAddress = {
      fullName: payment.notes?.customerName || "Customer",
      email: email || payment.notes?.customerEmail || "noemail@provided.com",
      phoneNumber: contact || checkoutSession.verifiedPhone || "Not provided",
      addressLine1: "Address pending",
      city: "City pending",
      state: "State pending",
      pincode: "000000",
      note: "Address to be collected from customer",
    };

    // Log for admin follow-up
    await logIncompleteOrder({
      razorpay_payment_id,
      sessionId: checkoutSession.sessionId,
      reason: "Missing shipping address",
    });
  }

  // ========================================
  // CREATE ORDER
  // ========================================
  try {
    // Lock the session first
    const locked = await CheckoutSession.findOneAndUpdate(
      {
        _id: checkoutSession._id,
        status: { $in: ["active", "processing"] },
      },
      { $set: { status: "processing" } },
      { new: true }
    );

    if (!locked) {
      return;
    }

    const order = await Order.create({
      orderNumber: Order.generateOrderNumber(),
      customerPhone: contact || checkoutSession.verifiedPhone || "Not provided",
      customerEmail: email || shippingAddress.email,
      customerName: shippingAddress.fullName,
      items: checkoutSession.items,
      shippingAddress,
      paymentDetails: {
        method: "razorpay",
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: "webhook", // Signature not available in webhook
        status: "completed",
        paidAt: new Date(),
        gatewayResponse: {
          amount,
          currency: "INR",
          status,
          method,
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
        createdVia: "webhook", // Important: Mark as webhook-created
        verifiedPhone: checkoutSession.verifiedPhone,
        ipAddress: checkoutSession.ipAddress,
        userAgent: checkoutSession.userAgent,
        webhookProcessedAt: new Date(),
      },
    });

    // Release stock reservations
    await checkoutSession.releaseReservations("completed");

    // Update session
    checkoutSession.status = "completed";
    checkoutSession.completedAt = new Date();
    checkoutSession.orderId = order._id;
    await checkoutSession.save();

    // ========================================
    // ✅ SHIPMENT CREATION (Automatic from Webhook)
    // ========================================
    const createShipmentFromWebhook = async () => {
      try {
        const shipmentResponse = await fetch(
          `${
            process.env.NODE_ENV === "production"
              ? process.env.NEXT_PUBLIC_API_BASE_URL || "https://yourdomain.com"
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
          console.log("✅ [WEBHOOK] Shipment created successfully", {
            orderNumber: order.orderNumber,
            shipmentId: shipmentData.shipment.shipmentId,
          });
        } else {
          console.warn(
            "⚠️ [WEBHOOK] Shipment creation failed (but order created)"
          );
        }
      } catch (shipmentError) {
        console.warn("⚠️ [WEBHOOK] Shipment creation error");
      }
    };

    // Create shipment asynchronously
    createShipmentFromWebhook().catch((err) => {
      console.error("🔴 [WEBHOOK] Shipment creation async error:", err);
    });

    // TODO: Send confirmation email to customer
    await sendOrderConfirmationEmail(order);
  } catch (orderError) {
    console.error("❌ Failed to create order in webhook", orderError);

    // Log for manual resolution
    await logOrphanedPayment({
      razorpay_payment_id,
      razorpay_order_id,
      amount,
      contact,
      email,
      reason: "Order creation failed",
      error: orderError.message,
    });
  }
}

// ========================================
// HANDLE FAILED PAYMENT
// ========================================
async function handlePaymentFailed(payment) {
  await dbConnect();

  const {
    id: razorpay_payment_id,
    order_id: razorpay_order_id,
    error_code,
    error_description,
  } = payment;

  // Update checkout session status
  const checkoutSession = await CheckoutSession.findOne({
    razorpayOrderId: razorpay_order_id,
  });

  if (checkoutSession && checkoutSession.status !== "completed") {
    // Reset session so user can try again
    checkoutSession.status = "active";
    checkoutSession.razorpayOrderId = null; // Clear failed payment
    await checkoutSession.save();
  }
}

// ========================================
// HELPER FUNCTIONS
// ========================================

async function logOrphanedPayment(data) {
  // Log to your monitoring system (Sentry, DataDog, etc.)
  console.error("🚨 ORPHANED PAYMENT - Manual intervention required", data);

  // TODO: Store in a separate collection for admin dashboard
  // TODO: Send alert to admin via email/Slack
  // TODO: Create support ticket automatically
}

async function logIncompleteOrder(data) {
  console.warn("⚠️ INCOMPLETE ORDER - Follow-up needed", data);

  // TODO: Store for admin follow-up
  // TODO: Send SMS to customer asking for address
}

async function sendOrderConfirmationEmail(order) {
  // TODO: Implement email sending
}
