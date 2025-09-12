// api/cart/apply-coupon/route.js - Secure implementation with proper guest handling
import dbConnect from "@/lib/dbConnect";
import { getCurrentUser } from "@/lib/auth";
import Cart from "@/models/Cart";
import Product from "@/models/Product";
import mongoose from "mongoose";
import { CouponValidator } from "@/lib/CouponUtils";

export async function POST(request) {
  try {
    await dbConnect();

    const body = await request.json();
    const { couponCode, cartId } = body;

    if (!couponCode?.trim()) {
      return Response.json(
        {
          message: "Coupon code is required",
        },
        { status: 400 }
      );
    }

    const user = await getCurrentUser();
    const normalizedCode = couponCode.trim().toUpperCase();

    // For guests, cartId is required for tracking
    if (!user && !cartId) {
      return Response.json(
        {
          message: "Cart identification required",
        },
        { status: 400 }
      );
    }

    let cart;
    let cartItems = [];
    let trackingId = user ? user._id.toString() : cartId;

    if (user) {
      // Authenticated user - get cart from database
      cart = await Cart.findOne({ userId: user._id });
      if (!cart?.items?.length) {
        return Response.json(
          {
            message: "Your cart is empty. Add items to apply a coupon.",
          },
          { status: 400 }
        );
      }

      // Get cart items with product data
      for (const item of cart.items) {
        const product = await Product.findById(item.productId).populate(
          "category"
        );
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
            slug: item.slug,
          });
        }
      }
    } else {
      // Guest user - get cart from session/cookie or create temp tracking
      // For guests, we'll validate against the cart data they send but track usage
      const { guestCartItems } = body;

      if (!guestCartItems?.length) {
        return Response.json(
          {
            message: "Your cart is empty. Add items to apply a coupon.",
          },
          { status: 400 }
        );
      }

      // Validate guest cart items against database to prevent tampering
      for (const item of guestCartItems) {
        const product = await Product.findById(item.productId).populate(
          "category"
        );
        if (product && item.quantity > 0) {
          // Use actual product price from database, not client price
          cartItems.push({
            _id: item._id || new mongoose.Types.ObjectId(),
            productId: product._id,
            product: product,
            size: item.size,
            quantity: item.quantity,
            price: product.discountedPrice || product.price, // Use server price
            name: product.name,
            image: product.images?.[0]?.url || "",
            slug: product.slug,
          });
        }
      }
    }

    if (cartItems.length === 0) {
      return Response.json(
        {
          message: "No valid items found in cart",
        },
        { status: 400 }
      );
    }

    // Use existing coupon validation logic
    const validationResult = await CouponValidator.validateAndCalculate(
      normalizedCode,
      user ? user._id.toString() : null, // userId
      cartItems,
      !user ? trackingId : null // guestId
    );

    if (!validationResult.isValid) {
      return Response.json(
        {
          message: validationResult.error,
        },
        { status: 400 }
      );
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
      appliedAt: new Date(),
    };

    // Save to authenticated user's cart or return for guest
    if (user && cart) {
      cart.appliedCoupon = couponData;
      cart.markModified("appliedCoupon");
      await cart.save();
    }

    // Return secure response with server-calculated values
    return Response.json({
      success: true,
      message: `Coupon ${validationResult.coupon.code} applied successfully!`,
      coupon: {
        code: validationResult.coupon.code,
        type: validationResult.coupon.type,
        value: validationResult.coupon.value,
        description: validationResult.coupon.description,
      },
      discount: {
        totalDiscount: validationResult.discount.discountAmount,
        shippingDiscount: validationResult.discount.shippingDiscount || 0,
        itemDiscounts: validationResult.discount.itemDiscounts,
        eligibleItems: validationResult.discount.eligibleItems,
      },
      isGuest: !user,
      trackingId: !user ? trackingId : undefined,
    });
  } catch (error) {
    console.error("Apply coupon error:", error);
    return Response.json(
      {
        message: "Unable to apply coupon at this time. Please try again.",
      },
      { status: 500 }
    );
  }
}