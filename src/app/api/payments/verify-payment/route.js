// src/app/api/payments/verify-payment/route.js
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { verifyCheckoutSession } from '@/lib/middleware/checkoutAuth';
import CheckoutSession from '@/models/CheckoutSession';
import Order from '@/models/Order';
import dbConnect from '@/lib/dbConnect';

function verifyRazorpaySignature(orderID, paymentID, signature, secret) {
  const body = orderID + '|' + paymentID;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(body.toString())
    .digest('hex');
  
  return expectedSignature === signature;
}

export async function POST(request) {
  try {
    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature,
      shippingAddress 
    } = await request.json();

    // Verify signature
    const isValidSignature = verifyRazorpaySignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      process.env.RAZORPAY_KEY_SECRET
    );

    if (!isValidSignature) {
      return NextResponse.json(
        { error: 'Invalid payment signature' },
        { status: 400 }
      );
    }

    // Verify checkout session
    const verification = await verifyCheckoutSession(request);
    if (!verification.verified) {
      return NextResponse.json(
        { error: 'Session verification required' },
        { status: 401 }
      );
    }

    await dbConnect();

    // Get checkout session
    const checkoutSession = await CheckoutSession.findOne({
      sessionId: verification.sessionId,
      status: 'active',
    });

    if (!checkoutSession) {
      return NextResponse.json(
        { error: 'Checkout session not found or expired' },
        { status: 404 }
      );
    }

    // Create order from checkout session
    const totals = checkoutSession.calculateTotals();
    
    const order = await Order.create({
      orderNumber: `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 8).toUpperCase()}`,
      customerPhone: verification.phoneNumber,
      customerEmail: shippingAddress.email,
      customerName: shippingAddress.fullName,
      items: checkoutSession.items,
      shippingAddress,
      paymentDetails: {
        method: 'razorpay',
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
        status: 'completed',
      },
      orderStatus: 'confirmed',
      totals,
      appliedCoupon: checkoutSession.appliedCoupon,
    });

    // Complete checkout session and release reservations
    await checkoutSession.releaseReservations('completed');
    checkoutSession.status = 'completed';
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
    console.error('Payment verification error:', error);
    return NextResponse.json(
      { error: 'Payment verification failed' },
      { status: 500 }
    );
  }
}