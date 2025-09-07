// api/buy-now/route.js - Create Buy Now checkout session
import dbConnect from "@/lib/dbConnect";
import { getCurrentUser } from "@/lib/auth";
import Product from "@/models/Product";
import CheckoutSession from "@/models/CheckoutSession";
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

    // Check stock/size availability
    const sizeInfo = product.sizes?.find(s => s.size.name === size);
    if (!sizeInfo || sizeInfo.qtyBuy < quantity) {
      return Response.json({ 
        message: "Selected size/quantity not available" 
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

    // Calculate discounted price
    const discountedPrice = product.discount > 0 
      ? product.price * (1 - product.discount / 100)
      : product.price;

    // Create checkout session
    const session = await CheckoutSession.createBuyNowSession({
      productId: product._id,
      productData: {
        name: product.name,
        price: product.price,
        discountedPrice: discountedPrice,
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
        guestTrackingId
      }
    });

  } catch (error) {
    console.error("Buy now error:", error);
    return Response.json({ 
      message: "Unable to create checkout session. Please try again." 
    }, { status: 500 });
  }
}
