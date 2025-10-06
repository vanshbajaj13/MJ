// api/checkout-session/[sessionId]/validate-for-payment/route.js
import dbConnect from "@/lib/dbConnect";
import { verifyCheckoutSession } from "@/lib/middleware/checkoutAuth";
import CheckoutSession from "@/models/CheckoutSession";
import Product from "@/models/Product";
import StockReservation from "@/models/StockReservation";
import { CouponValidator } from "@/lib/CouponUtils";

export async function POST(request, { params }) {
  try {
    await dbConnect();

    const { sessionId } = await params;
    const { shippingAddress } = await request.json();

    // Verify WhatsApp auth session
    const verification = await verifyCheckoutSession(request);
    if (!verification.verified) {
      return Response.json(
        {
          success: false,
          error: "Authentication required",
          requireAuth: true,
        },
        { status: 401 }
      );
    }

    // Get checkout session
    const session = await CheckoutSession.findOne({
      sessionId,
      status: "active",
      expiresAt: { $gt: new Date() },
    });

    if (!session) {
      return Response.json(
        {
          success: false,
          error: "Checkout session not found or expired",
          sessionExpired: true,
        },
        { status: 404 }
      );
    }

    // Validate shipping address
    if (!shippingAddress?.fullName || !shippingAddress?.addressLine1 || 
        !shippingAddress?.city || !shippingAddress?.state || 
        !shippingAddress?.pincode || !shippingAddress?.email) {
      return Response.json(
        {
          success: false,
          error: "Complete shipping address is required",
        },
        { status: 400 }
      );
    }

    const validationErrors = [];
    const priceChanges = [];
    const stockIssues = [];

    // 1. VALIDATE STOCK AVAILABILITY WITH CURRENT RESERVATIONS
    for (const item of session.items) {
      const product = await Product.findById(item.productId).populate("sizes.size");
      
      if (!product) {
        stockIssues.push({
          itemName: item.name,
          issue: "Product no longer available",
        });
        continue;
      }

      const sizeInfo = product.sizes?.find(
        (s) => s.size.name === item.size
      );

      if (!sizeInfo) {
        stockIssues.push({
          itemName: item.name,
          size: item.size,
          issue: "Size no longer available",
        });
        continue;
      }

      // Check available quantity considering all reservations
      const availableQty = await StockReservation.getAvailableQty(
        item.productId,
        item.size,
        sizeInfo.qtyBuy,
        sizeInfo.soldQty
      );

      if (availableQty < item.quantity) {
        stockIssues.push({
          itemName: item.name,
          size: item.size,
          requested: item.quantity,
          available: availableQty,
          issue: `Only ${availableQty} available`,
        });
      }

      // 2. VALIDATE PRICES HAVEN'T CHANGED
      const currentPrice = product.discountedPrice || product.price;
      if (Math.abs(currentPrice - item.price) > 0.01) {
        priceChanges.push({
          itemName: item.name,
          oldPrice: item.price,
          newPrice: currentPrice,
          difference: currentPrice - item.price,
        });
      }
    }

    // 3. REVALIDATE COUPON IF APPLIED
    let couponValid = true;
    let couponError = null;
    let updatedCoupon = null;

    if (session.appliedCoupon) {
      try {
        // Prepare cart items for validation
        const cartItems = [];
        for (const item of session.items) {
          const product = await Product.findById(item.productId).populate("category");
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

        const validationResult = await CouponValidator.validateAndCalculate(
          session.appliedCoupon.code,
          verification.userId,
          cartItems
        );

        if (!validationResult.isValid) {
          couponValid = false;
          couponError = validationResult.error;
        } else {
          // Update coupon discount if calculations changed
          updatedCoupon = {
            code: validationResult.coupon.code,
            discountAmount: validationResult.discount.discountAmount,
            shippingDiscount: validationResult.discount.shippingDiscount,
            itemDiscounts: validationResult.discount.itemDiscounts,
          };
        }
      } catch (error) {
        couponValid = false;
        couponError = "Coupon validation failed";
      }
    }

    // Compile all validation errors
    if (stockIssues.length > 0) {
      validationErrors.push({
        type: "stock",
        message: "Some items are no longer available in requested quantities",
        details: stockIssues,
      });
    }

    if (priceChanges.length > 0) {
      validationErrors.push({
        type: "price",
        message: "Prices have changed for some items",
        details: priceChanges,
      });
    }

    if (!couponValid && session.appliedCoupon) {
      validationErrors.push({
        type: "coupon",
        message: couponError || "Applied coupon is no longer valid",
        details: { code: session.appliedCoupon.code },
      });
    }

    // If there are validation errors, return them
    if (validationErrors.length > 0) {
      return Response.json(
        {
          success: false,
          hasErrors: true,
          errors: validationErrors,
          stockIssues,
          priceChanges,
          couponValid,
          message: "Please review the issues before proceeding with payment",
        },
        { status: 400 }
      );
    }

    // 4. UPDATE SESSION WITH VALIDATED DATA
    if (updatedCoupon) {
      session.appliedCoupon.discountAmount = updatedCoupon.discountAmount;
      session.appliedCoupon.shippingDiscount = updatedCoupon.shippingDiscount;
      session.appliedCoupon.itemDiscounts = updatedCoupon.itemDiscounts;
    }

    await session.save();

    // 5. CALCULATE FINAL VALIDATED TOTALS
    const totals = session.calculateTotals();

    // 6. STORE VALIDATED ADDRESS IN SESSION (for order creation)
    session.validatedAddress = shippingAddress;
    session.validatedAt = new Date();
    await session.save();

    return Response.json({
      success: true,
      validated: true,
      message: "All validations passed. Ready for payment.",
      session: {
        sessionId: session.sessionId,
        items: session.items,
        appliedCoupon: session.appliedCoupon,
        totals,
      },
      customerDetails: {
        phone: verification.phoneNumber,
        name: shippingAddress.fullName,
        email: shippingAddress.email,
      },
      shippingAddress,
    });
  } catch (error) {
    console.error("Payment validation error:", error);
    return Response.json(
      {
        success: false,
        error: "Validation failed. Please try again.",
      },
      { status: 500 }
    );
  }
}