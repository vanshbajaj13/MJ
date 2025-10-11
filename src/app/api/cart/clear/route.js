import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import dbConnect from "@/lib/dbConnect";
import { Cart } from "@/models";

// Clear entire cart
export async function DELETE(req) {
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
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-fallback-secret-key");
    const userId = decoded.userId;

    // Find and clear cart
    let cart = await Cart.findOne({ userId });
    
    if (!cart) {
      // Create empty cart if doesn't exist
      cart = new Cart({ userId, items: [] });
      await cart.save();
    } else {
      // Clear existing cart
      cart.items = [];
      await cart.save();
    }

    return NextResponse.json(
      { 
        success: true, 
        message: "Cart cleared successfully",
        cart: {
          items: [],
          totalItems: 0,
          totalPrice: 0
        }
      },
      { status: 200 }
    );

  } catch (error) {
    console.error("Clear cart error:", error);
    
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