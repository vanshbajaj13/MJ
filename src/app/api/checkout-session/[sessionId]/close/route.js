// api/checkout-session/[sessionId]/close/route.js - Close checkout session with stock reservation release
import dbConnect from "@/lib/dbConnect";
import { getCurrentUser } from "@/lib/auth";
import CheckoutSession from "@/models/CheckoutSession";
import StockReservation from "@/models/StockReservation";

export async function POST(request, { params }) {
  try {
    await dbConnect();
    
    const { sessionId } = await params;
    
    if (!sessionId) {
      return Response.json({ 
        message: "Session ID is required" 
      }, { status: 400 });
    }

    // Get checkout session
    const session = await CheckoutSession.findOne({ 
      sessionId,
      status: 'active',
      expiresAt: { $gt: new Date() }
    });

    if (!session) {
      return Response.json({ 
        message: "Checkout session not found or already expired" 
      }, { status: 404 });
    }

    const user = await getCurrentUser();
    
    // Verify session ownership (for logged-in users)
    if (user && session.userId && session.userId.toString() !== user._id.toString()) {
      return Response.json({ 
        message: "Unauthorized access to session" 
      }, { status: 403 });
    }

    // Check for active reservations before closing
    const activeReservations = await StockReservation.find({
      sessionId,
      status: "active"
    });

    const reservationInfo = {
      hasReservations: activeReservations.length > 0,
      reservationCount: activeReservations.length,
      reservedItems: []
    };

    // Collect reservation details for response
    if (activeReservations.length > 0) {
      reservationInfo.reservedItems = activeReservations.map(reservation => ({
        productId: reservation.productId,
        size: reservation.size,
        quantity: reservation.reservedQty,
        reservationId: reservation.reservationId
      }));
    }

    try {
      // Release stock reservations for this session
      await session.releaseReservations("cancelled");

      // Update session status to cancelled
      session.status = 'cancelled';
      session.expiresAt = new Date(); // Expire immediately
      await session.save();

      return Response.json({
        success: true,
        message: "Session closed successfully and stock reservations released",
        data: {
          sessionId,
          sessionType: session.type,
          itemCount: session.items.length,
          reservations: reservationInfo,
          closedAt: new Date().toISOString()
        }
      });

    } catch (reservationError) {
      console.error("Error releasing reservations:", reservationError);
      
      // Still try to close the session even if reservation release fails
      session.status = 'cancelled';
      session.expiresAt = new Date();
      await session.save();

      return Response.json({
        success: true,
        message: "Session closed successfully, but there was an issue releasing stock reservations",
        warning: "Stock reservations will be automatically released when they expire",
        data: {
          sessionId,
          sessionType: session.type,
          itemCount: session.items.length,
          reservations: reservationInfo,
          closedAt: new Date().toISOString()
        }
      });
    }

  } catch (error) {
    console.error("Close session error:", error);
    return Response.json({ 
      message: "Unable to close session. Please try again.",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}