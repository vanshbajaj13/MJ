// api/checkout-session/[sessionId]/route.js - Fetch existing checkout session
import dbConnect from "@/lib/dbConnect";
import { getCurrentUser } from "@/lib/auth";
import { CheckoutSession } from "@/models";

export async function GET(request, { params }) {
  try {
    await dbConnect();

    const { sessionId } = await params;

    if (!sessionId) {
      return Response.json(
        {
          message: "Session ID is required",
        },
        { status: 400 }
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
          message: "Checkout session not found or expired",
        },
        { status: 404 }
      );
    }

    const user = await getCurrentUser();

    // Verify session ownership (for logged-in users)
    if (
      user &&
      session.userId &&
      session.userId.toString() !== user._id.toString()
    ) {
      return Response.json(
        {
          message: "Unauthorized access to session",
        },
        { status: 403 }
      );
    }

    // Calculate current totals
    const totals = session.calculateTotals();
    return Response.json({
      success: true,
      session: {
        sessionId: session.sessionId,
        type: session.type,
        items: session.items,
        appliedCoupon: session.appliedCoupon,
        expiresAt: session.expiresAt,
        isGuest: !session.userId,
        guestTrackingId: session.guestTrackingId,
        totals,
      },
    });
  } catch (error) {
    console.error("Get session error:", error);
    return Response.json(
      {
        message: "Unable to fetch session. Please try again.",
      },
      { status: 500 }
    );
  }
}
