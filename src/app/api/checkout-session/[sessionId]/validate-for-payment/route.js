// api/checkout-session/[sessionId]/validate-for-payment/route.js - UPDATED
import dbConnect from "@/lib/dbConnect";
import { verifyCheckoutSession } from "@/lib/middleware/checkoutAuth";
import CheckoutSession from "@/models/CheckoutSession";
import Product from "@/models/Product";
import { CouponValidator } from "@/lib/CouponUtils";

export async function POST(request, { params }) {
  try {
    await dbConnect();

    const { sessionId } = await params;
    const { shippingAddress } = await request.json();

    if (!sessionId || !shippingAddress) {
      return Response.json(
        {
          success: false,
          hasErrors: true,
          errors: [
            {
              type: "system",
              message: "Session ID and shipping address are required",
            },
          ],
        },
        { status: 400 }
      );
    }

    // ✅ Verify authentication
    const verification = await verifyCheckoutSession(request);
    if (!verification.verified) {
      return Response.json(
        {
          success: false,
          hasErrors: true,
          errors: [
            { type: "system", message: "Session verification required" },
          ],
        },
        { status: 401 }
      );
    }

    // ✅ Fetch checkout session
    const session = await CheckoutSession.findOne({
      sessionId,
      status: "active",
      expiresAt: { $gt: new Date() },
    });

    if (!session) {
      return Response.json(
        {
          success: false,
          hasErrors: true,
          errors: [
            {
              type: "system",
              message: "Checkout session not found or expired",
            },
          ],
        },
        { status: 404 }
      );
    }

    const errors = [];
    const priceChanges = [];
    let sessionChanged = false;

    // ✅ 1. Validate product prices
    for (const item of session.items) {
      const product = await Product.findById(item.productId)
        .populate("sizes.size")
        .populate("category");

      if (!product) {
        errors.push({
          type: "system",
          message: `Product ${item.name} is no longer available`,
          details: [
            {
              itemName: item.name,
              size: item.size,
              issue: "Product not found",
            },
          ],
        });
        continue;
      }

      const currentPrice = product.price;

      if (Math.abs(item.price - currentPrice) > 0.01) {
        priceChanges.push({
          itemName: item.name,
          size: item.size,
          oldPrice: item.price,
          newPrice: currentPrice,
          issue: `Price updated from ₹${item.price} to ₹${currentPrice}`,
        });

        item.price = currentPrice;
        sessionChanged = true;
      }
    }

    // ✅ 2. Validate coupon (if applied)
    if (session.appliedCoupon && session.appliedCoupon.code) {
      try {
        const cartItems = [];

        for (const item of session.items) {
          const product = await Product.findById(item.productId).populate(
            "category"
          );
          if (product) {
            cartItems.push({
              _id: item._id,
              productId: product._id,
              product,
              size: item.size,
              quantity: item.quantity,
              price: item.price,
              name: item.name,
              image: item.image,
              slug: item.slug,
            });
          }
        }

        const couponValidation = await CouponValidator.validateAndCalculate(
          session.appliedCoupon.code,
          session.userId?.toString(),
          cartItems
        );

        if (!couponValidation.isValid) {
          errors.push({
            type: "coupon",
            message: "Your coupon is no longer valid",
            details: [{ issue: couponValidation.error }],
          });

          session.appliedCoupon = null;
          sessionChanged = true;
        } else {
          const oldDiscount = session.appliedCoupon.discountAmount;
          const newDiscount = couponValidation.discount.discountAmount;

          if (Math.abs(oldDiscount - newDiscount) > 0.01) {
            session.appliedCoupon.discountAmount = newDiscount;
            session.appliedCoupon.shippingDiscount =
              couponValidation.discount.shippingDiscount || 0;
            session.appliedCoupon.itemDiscounts =
              couponValidation.discount.itemDiscounts;
            session.appliedCoupon.eligibleItems =
              couponValidation.discount.eligibleItems;
            session.appliedCoupon.value = couponValidation.coupon.value;

            priceChanges.push({
              itemName: "Coupon Discount",
              oldPrice: oldDiscount,
              newPrice: newDiscount,
              issue: `Discount updated from ₹${oldDiscount} to ₹${newDiscount}`,
            });

            sessionChanged = true;
          }
        }
      } catch (error) {
        console.error("Coupon validation error:", error);

        session.appliedCoupon = null;
        sessionChanged = true;

        errors.push({
          type: "coupon",
          message: "Your coupon could not be validated and has been removed",
          details: [{ issue: error.message || "Coupon validation failed" }],
        });
      }
    }

    // ✅ 3. If price/coupon changes exist, note them
    if (priceChanges.length > 0) {
      errors.push({
        type: "price",
        message: "Some prices have been updated",
        details: priceChanges,
      });
    }

    // ✅ 4. Save only once at the end (if anything changed)
    if (sessionChanged) {
      try {
        await session.save();
      } catch (error) {
        if (
          process.env.NODE_ENV === "development" &&
          error.name === "VersionError"
        ) {
          console.warn(
            "⚠️ Ignoring VersionError in dev (caused by double invocation)"
          );
        } else {
          throw error;
        }
      }
    }

    // ✅ 5. If there are errors (including price changes), return them but still allow payment
    //    The frontend will update prices silently using updateSessionPrices
    if (errors.length > 0) {
      const totals = session.calculateTotals();
      return Response.json({
        success: true, // Still success because we can proceed
        hasErrors: true, // But there are price changes
        errors, // Return the errors/changes
        session: {
          sessionId: session.sessionId,
          type: session.type,
          items: session.items,
          appliedCoupon: session.appliedCoupon,
          expiresAt: session.expiresAt,
          isGuest: !session.userId,
          guestTrackingId: session.guestTrackingId,
        },
        totals: {
          subtotal: totals.subtotal,
          totalItems: totals.totalItems,
          discount: totals.totalDiscount,
          shippingDiscount: totals.shippingDiscount,
          total: totals.finalTotal,
          itemDiscounts: totals.itemDiscounts,
          savings: totals.savings,
        },
        customerDetails: {
          name: shippingAddress.fullName,
          email: shippingAddress.email,
          phone: verification.phoneNumber,
        },
        shippingAddress,
      });
    }

    // ✅ 6. Calculate totals and finalize (no errors/changes)
    const totals = session.calculateTotals();

    session.validatedAt = new Date();
    session.validatedAddress = shippingAddress;
    try {
      await session.save();
    } catch (error) {
      if (
        process.env.NODE_ENV === "development" &&
        error.name === "VersionError"
      ) {
        console.warn(
          "⚠️ Ignoring VersionError in dev (caused by double invocation)"
        );
      } else {
        throw error;
      }
    }

    return Response.json({
      success: true,
      hasErrors: false,
      errors: [],
      session: {
        sessionId: session.sessionId,
        type: session.type,
        items: session.items,
        appliedCoupon: session.appliedCoupon,
        expiresAt: session.expiresAt,
        isGuest: !session.userId,
        guestTrackingId: session.guestTrackingId,
      },
      totals: {
        subtotal: totals.subtotal,
        totalItems: totals.totalItems,
        discount: totals.totalDiscount,
        shippingDiscount: totals.shippingDiscount,
        total: totals.finalTotal,
        itemDiscounts: totals.itemDiscounts,
        savings: totals.savings,
      },
      customerDetails: {
        name: shippingAddress.fullName,
        email: shippingAddress.email,
        phone: verification.phoneNumber,
      },
      shippingAddress,
    });
  } catch (error) {
    console.error("Payment validation error:", error);
    return Response.json(
      {
        success: false,
        hasErrors: true,
        errors: [
          {
            type: "system",
            message: "Unable to validate order. Please try again.",
          },
        ],
      },
      { status: 500 }
    );
  }
}
