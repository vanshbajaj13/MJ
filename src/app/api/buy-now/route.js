// api/buy-now/route.js - Updated with stock reservation system
import dbConnect from "@/lib/dbConnect";
import { getCurrentUser } from "@/lib/auth";
import { Product, CheckoutSession, StockReservation  } from "@/models";
import crypto from "crypto";

export async function POST(request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { productId, size, quantity = 1 } = body;

    if (!productId || !size) {
      return Response.json({ 
        message: "Product ID and size are required" 
      }, { status: 400 });
    }

    if (quantity < 1 || quantity > 10) {
      return Response.json({ 
        message: "Quantity must be between 1 and 10" 
      }, { status: 400 });
    }

    // Get product data with populated sizes
    const product = await Product.findById(productId)
      .populate('category')
      .populate('sizes.size');

    if (!product) {
      return Response.json({ 
        message: "Product not found or unavailable" 
      }, { status: 404 });
    }

    // Find the specific size information
    const sizeInfo = product.sizes?.find(s => 
      s.size.name === size || s.size._id.toString() === size.toString()
    );
    
    if (!sizeInfo) {
      return Response.json({ 
        message: "Selected size is not available for this product" 
      }, { status: 400 });
    }

    // Check available quantity considering current reservations
    const availableQty = await StockReservation.getAvailableQty(
      productId,
      size,
      sizeInfo.qtyBuy,
      sizeInfo.soldQty
    );

    if (availableQty < quantity) {
      if (availableQty === 0) {
        return Response.json({ 
          message: `Size ${size} is currently out of stock` 
        }, { status: 400 });
      }
      return Response.json({ 
        message: `Only ${availableQty} items available for size ${size}` 
      }, { status: 400 });
    }

    const user = await getCurrentUser();
    
    // Generate guest tracking ID if no user
    let guestTrackingId = null;
    if (!user) {
      guestTrackingId = `buy_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
    }

    // Get client info
    const clientInfo = {
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    };

    try {
      // Create checkout session with stock reservation (atomic operation)
      const session = await CheckoutSession.createBuyNowSession({
        productId: product._id,
        productData: {
          name: product.name,
          price: product.price,
          discountedPrice: product.price,
          images: product.images,
          slug: product.slug
        },
        size,
        quantity,
        userId: user?._id,
        guestTrackingId,
        ...clientInfo
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
            message: "Stock reserved for 5 minutes",
            reservedQty: quantity,
            productName: product.name,
            size: size
          }
        },
        message: "Buy now checkout session created successfully with stock reservation"
      });

    } catch (sessionError) {
      console.error("Session creation error:", sessionError);
      
      // Check if it's a stock validation error
      if (sessionError.message.includes("Stock validation failed")) {
        return Response.json({ 
          success: false,
          type: "STOCK_VALIDATION_ERROR",
          message: "The requested quantity is no longer available. Please try again with a lower quantity.",
          errors: [{
            productId: product._id,
            productName: product.name,
            size: size,
            requested: quantity,
            available: 0, // We don't have exact availability here
            error: "Stock validation failed during session creation"
          }]
        }, { status: 400 });
      }

      throw sessionError; // Re-throw other errors
    }

  } catch (error) {
    console.error("Buy now error:", error);
    return Response.json({ 
      message: "Unable to create checkout session. Please try again." 
    }, { status: 500 });
  }
}

