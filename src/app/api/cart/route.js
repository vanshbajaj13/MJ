import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import dbConnect from "@/lib/dbConnect";
import { Cart } from "@/models";

// Get user's cart
export async function GET(req) {
  try {
    await dbConnect();

    // Get token from cookies
    const token = req.cookies.get("auth-token")?.value;
    
    if (!token) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;

    // Find user's cart
    let cart = await Cart.findOne({ userId });
    
    if (!cart) {
      // Create empty cart if doesn't exist
      cart = new Cart({ userId, items: [] });
      await cart.save();
    }

    return NextResponse.json(
      { 
        success: true, 
        cart: {
          items: cart.items || [],
          totalItems: cart.totalItems,
          totalPrice: cart.totalPrice,
          appliedCoupon: cart.appliedCoupon || null,
        }
      },
      { status: 200 }
    );

  } catch (error) {
    console.error("Get cart error:", error);
    
    if (error.name === 'JsonWebTokenError') {
      return NextResponse.json(
        { success: false, message: "Invalid token" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}