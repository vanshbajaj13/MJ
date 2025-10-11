// api/orders/create/route.js - Secure order creation

// Will look into this after completing the shipping and payment part

import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import dbConnect from "@/lib/dbConnect";
import { Cart, Order, Product } from "@/models";
import { CouponValidator } from "@/lib/couponUtils";
import { CouponUsage } from "@/lib/couponUtils";

export async function POST(req) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    await dbConnect();

    const token = req.cookies.get("auth-token")?.value;
    if (!token) {
      await session.abortTransaction();
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;

    const { shippingAddress, paymentMethod } = await req.json();

    // Validate required fields
    if (!shippingAddress || !paymentMethod) {
      await session.abortTransaction();
      return NextResponse.json(
        { success: false, message: "Missing required fields" },
        { status: 400 }
      );
    }

    // Get and validate cart within transaction
    const cart = await Cart.findOne({ userId }).session(session);
    if (!cart || cart.items.length === 0) {
      await session.abortTransaction();
      return NextResponse.json(
        { success: false, message: "Cart is empty" },
        { status: 400 }
      );
    }

    // Re-validate everything one more time at order creation
    const productIds = cart.items.map(item => item.productId);
    const products = await Product.find({ 
      _id: { $in: productIds },
      isActive: true 
    }).session(session);

    const productMap = new Map(products.map(p => [p._id.toString(), p]));
    const orderItems = [];
    let subtotal = 0;

    // Validate each item and reserve stock
    for (const cartItem of cart.items) {
      const product = productMap.get(cartItem.productId.toString());
      
      if (!product) {
        await session.abortTransaction();
        return NextResponse.json(
          { success: false, message: `Product ${cartItem.name} is no longer available` },
          { status: 400 }
        );
      }

      if (product.stock < cartItem.quantity) {
        await session.abortTransaction();
        return NextResponse.json(
          { success: false, message: `Insufficient stock for ${cartItem.name}` },
          { status: 400 }
        );
      }

      // Reserve stock
      await Product.findByIdAndUpdate(
        product._id,
        { $inc: { stock: -cartItem.quantity } },
        { session }
      );

      const itemTotal = product.price * cartItem.quantity;
      subtotal += itemTotal;

      orderItems.push({
        productId: product._id,
        name: product.name,
        price: product.price,
        quantity: cartItem.quantity,
        size: cartItem.size,
        image: cartItem.image,
        slug: cartItem.slug,
        total: itemTotal
      });
    }

    // Validate and apply coupon
    let discountAmount = 0;
    let couponInfo = null;
    
    if (cart.appliedCoupon) {
      try {
        const coupon = await CouponValidator.validateCoupon(
          cart.appliedCoupon.code,
          userId,
          orderItems
        );

        const couponResult = CouponValidator.calculateDiscount(coupon, orderItems);
        discountAmount = couponResult.discountAmount;
        
        couponInfo = {
          code: coupon.code,
          type: coupon.type,
          value: coupon.value,
          discountAmount,
          itemDiscounts: couponResult.itemDiscounts
        };

        // Update coupon usage
        await Coupon.findByIdAndUpdate(
          coupon._id,
          { $inc: { usageCount: 1 } },
          { session }
        );

      } catch (error) {
        await session.abortTransaction();
        return NextResponse.json(
          { success: false, message: `Coupon error: ${error.message}` },
          { status: 400 }
        );
      }
    }

    const finalTotal = Math.max(0, subtotal - discountAmount);

    // Create order
    const orderId = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    
    const order = new Order({
      orderId,
      userId,
      customerInfo: {
        fullName: shippingAddress.fullName,
        email: shippingAddress.email,
        phoneNumber: decoded.phoneNumber
      },
      shippingAddress,
      items: orderItems,
      pricing: {
        subtotal,
        discountAmount,
        finalTotal,
        coupon: couponInfo
      },
      paymentMethod,
      status: 'pending',
      timeline: [{
        status: 'pending',
        timestamp: new Date(),
        note: 'Order created'
      }]
    });

    await order.save({ session });

    // Record coupon usage
    if (couponInfo) {
      const couponUsage = new CouponUsage({
        userId,
        couponId: coupon._id,
        couponCode: couponInfo.code,
        orderId,
        discountAmount
      });
      await couponUsage.save({ session });
    }

    // Clear user's cart
    await Cart.findOneAndUpdate(
      { userId },
      { 
        items: [],
        appliedCoupon: undefined
      },
      { session }
    );

    await session.commitTransaction();

    return NextResponse.json({
      success: true,
      order: {
        orderId: order.orderId,
        total: finalTotal,
        items: orderItems.length,
        status: 'pending'
      }
    });

  } catch (error) {
    await session.abortTransaction();
    console.error("Order creation error:", error);
    
    return NextResponse.json(
      { success: false, message: "Failed to create order" },
      { status: 500 }
    );
  } finally {
    session.endSession();
  }
}