// api/checkout-session/[sessionId]/close/route.js - Close checkout session
import dbConnect from "@/lib/dbConnect";
import { getCurrentUser } from "@/lib/auth";
import CheckoutSession from "@/models/CheckoutSession";

export async function POST(request, { params }) {
  try {
    await dbConnect();
    
    const { sessionId } = params;
    
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

    // Update session status to cancelled
    session.status = 'cancelled';
    session.expiresAt = new Date(); // Expire immediately
    await session.save();

    return Response.json({
      success: true,
      message: "Session closed successfully"
    });

  } catch (error) {
    console.error("Close session error:", error);
    return Response.json({ 
      message: "Unable to close session. Please try again." 
    }, { status: 500 });
  }
}