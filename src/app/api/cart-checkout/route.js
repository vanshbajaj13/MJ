// api/cart-checkout/route.js - Updated with proper error handling
import dbConnect from "@/lib/dbConnect";
import { getCurrentUser } from "@/lib/auth";
import Product from "@/models/Product";
import CheckoutSession from "@/models/CheckoutSession";
import StockReservation from "@/models/StockReservation";
import crypto from "crypto";

export async function POST(request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { cartItems } = body;

    if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
      return Response.json(
        {
          message: "Cart items are required and cannot be empty",
        },
        { status: 400 }
      );
    }

    // Validate cart items structure
    const invalidItems = cartItems.filter(
      (item) =>
        (!item.productId && !item.product?._id) ||
        !item.size ||
        !item.quantity ||
        item.quantity < 1 ||
        item.quantity > 10
    );

    if (invalidItems.length > 0) {
      return Response.json(
        {
          message: "Invalid cart items found. Please check product, size and quantity.",
          invalidItems: invalidItems.map(item => ({
            productId: item.productId || item.product?._id,
            size: item.size,
            quantity: item.quantity,
            issue: "Missing required fields or invalid quantity"
          }))
        },
        { status: 400 }
      );
    }

    // Fetch all products from cart in a single query
    const productIds = cartItems.map(
      (item) => item.productId || item.product?._id
    );

    const products = await Product.find({
      _id: { $in: productIds },
    }).populate("sizes.size");

    // Enhanced stock validation with reservation consideration
    const stockValidationErrors = [];
    const reservationInfo = [];

    for (const item of cartItems) {
      const productId = item.productId || item.product?._id;
      const product = products.find(
        (p) => p._id.toString() === productId.toString()
      );

      if (!product) {
        stockValidationErrors.push({
          productId,
          productName: item.name || item.product?.name || "Unknown Product",
          size: item.size,
          requested: item.quantity,
          available: 0,
          error: "Product not found"
        });
        continue;
      }

      const sizeInfo = product.sizes?.find(
        (s) =>
          s.size.name === item.size ||
          s.size._id.toString() === item.size.toString()
      );

      if (!sizeInfo) {
        stockValidationErrors.push({
          productId,
          productName: product.name,
          size: item.size,
          requested: item.quantity,
          available: 0,
          error: "Size not available"
        });
        continue;
      }

      // Get available quantity considering current reservations
      const availableQty = await StockReservation.getAvailableQty(
        productId,
        item.size,
        sizeInfo.qtyBuy,
        sizeInfo.soldQty
      );

      if (availableQty < item.quantity) {
        stockValidationErrors.push({
          productId,
          productName: product.name,
          size: item.size,
          requested: item.quantity,
          available: availableQty,
          error: "Insufficient stock"
        });
      } else {
        reservationInfo.push({
          productId,
          productName: product.name,
          size: item.size,
          quantity: item.quantity
        });
      }
    }
    
    // Return stock validation errors immediately if any
    if (stockValidationErrors.length > 0) {
      return Response.json(
        {
          success: false,
          type: "STOCK_VALIDATION_ERROR",
          message: "Some items are out of stock or unavailable",
          errors: stockValidationErrors,
        },
        { status: 400 }
      );
    }

    const user = await getCurrentUser();

    // Generate guest tracking ID if no user
    let guestTrackingId = null;
    if (!user) {
      guestTrackingId = `cart_${Date.now()}_${crypto
        .randomBytes(6)
        .toString("hex")}`;
    }

    // Get client info
    const clientInfo = {
      ipAddress:
        request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown",
      userAgent: request.headers.get("user-agent") || "unknown",
    };

    // Enhance cart items with product data
    const enhancedCartItems = cartItems.map((item) => {
      const productId = item.productId || item.product?._id;
      const product = products.find(
        (p) => p._id.toString() === productId.toString()
      );

      return {
        productId: productId,
        name: item.name || item.product?.name || product?.name,
        price:
          item.discountedPrice ||
          item.price ||
          item.product?.price ||
          product?.price,
        discountedPrice:
          item.discountedPrice ||
          item.price ||
          item.product?.price ||
          product?.price,
        image:
          item.image ||
          item.product?.images?.[0]?.url ||
          product?.images?.[0]?.url ||
          "",
        slug: item.slug || item.product?.slug || product?.slug,
        size: item.size,
        quantity: item.quantity,
      };
    });

    try {
      // Create checkout session with stock reservations (atomic operation)
      const session = await CheckoutSession.createCartCheckoutSession({
        cartItems: enhancedCartItems,
        userId: user?._id,
        guestTrackingId,
        ...clientInfo,
      });

      // Calculate initial totals
      const totals = session.calculateTotals();

      return Response.json({
        success: true,
        sessionId: session.sessionId,
        session: {
          id: session.sessionId,
          type: session.type,
          items: session.items,
          appliedCoupon: null,
          totals,
          expiresAt: session.expiresAt,
          isGuest: !user,
          guestTrackingId,
          hasActiveReservations: session.hasActiveReservations,
          reservationInfo: {
            message: "Stock reserved for 5 minutes for all items",
            reservedItems: reservationInfo,
            totalReservedItems: reservationInfo.reduce((sum, item) => sum + item.quantity, 0)
          }
        },
        message: "Cart checkout session created successfully with stock reservations",
      });

    } catch (error) {
    console.error("Cart checkout error:", error);
    return Response.json(
      {
        success: false,
        message: "Unable to create checkout session. Please try again.",
      },
      { status: 500 }
    );
  }

  } catch (error) {
    console.error("Cart checkout error:", error);
    return Response.json(
      {
        success: false,
        message: "Unable to create checkout session. Please try again.",
      },
      { status: 500 }
    );
  }
}