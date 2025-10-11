// api/cart/remove-coupon/route.js - Secure remove coupon with guest support
import dbConnect from "@/lib/dbConnect";
import { getCurrentUser } from "@/lib/auth";
import { Cart, CouponUsage } from "@/models";

export async function DELETE(request) {
  try {
    await dbConnect();
    
    const body = await request.json();
    const { cartId } = body;

    const user = await getCurrentUser();

    if (user) {
      // Authenticated user - remove from database cart
      const userCart = await Cart.findOne({ userId: user._id });
      
      if (!userCart) {
        return Response.json({ 
          message: "Cart not found" 
        }, { status: 404 });
      }

      if (!userCart.appliedCoupon) {
        return Response.json({ 
          message: "No coupon is currently applied" 
        }, { status: 400 });
      }

      const removedCoupon = {
        code: userCart.appliedCoupon.code,
        discountAmount: userCart.appliedCoupon.discountAmount
      };

      // Mark coupon usage as cancelled
      if (userCart.appliedCoupon.couponId) {
        try {
          await CouponUsage.updateMany(
            { 
              userId: user._id,
              couponId: userCart.appliedCoupon.couponId,
              status: 'applied'
            },
            { 
              status: 'cancelled',
              cancelledAt: new Date()
            }
          );
        } catch (error) {
          console.error("Error updating coupon usage:", error);
          // Continue with removal even if usage update fails
        }
      }

      // Remove coupon from cart
      userCart.appliedCoupon = null;
      await userCart.save();

      return Response.json({
        success: true,
        message: "Coupon removed successfully",
        removedCoupon
      });

    } else {
      // Guest user - just return success since coupon state is client-side
      // But we should still update any tracking records
      if (cartId) {
        try {
          await CouponUsage.updateMany(
            { 
              guestTrackingId: cartId,
              status: 'applied'
            },
            { 
              status: 'cancelled',
              cancelledAt: new Date()
            }
          );
        } catch (error) {
          console.error("Error updating guest coupon usage:", error);
          // Continue with success response
        }
      }

      return Response.json({
        success: true,
        message: "Coupon removed successfully",
        isGuest: true
      });
    }

  } catch (error) {
    console.error("Remove coupon error:", error);
    return Response.json({ 
      message: "Unable to remove coupon. Please try again." 
    }, { status: 500 });
  }
}

// Alternative POST method for flexibility
export async function POST(request) {
  try {
    const body = await request.json();
    const { action } = body;
    
    if (action !== 'remove') {
      return Response.json({ 
        message: "Invalid action specified" 
      }, { status: 400 });
    }

    // Delegate to DELETE handler
    return await DELETE(request);

  } catch (error) {
    console.error("Remove coupon POST error:", error);
    return Response.json({ 
      message: "Unable to process request" 
    }, { status: 500 });
  }
}