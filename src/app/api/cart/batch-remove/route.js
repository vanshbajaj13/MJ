import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import dbConnect from "@/lib/dbConnect";
import Cart from "@/models/Cart";

// Remove multiple items from cart
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

    // Get request body
    const { items } = await req.json();

    // Validation
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, message: "Items array is required and cannot be empty" },
        { status: 400 }
      );
    }

    // Validate each item
    const invalidItems = items.filter(item => !item.productId || !item.size);
    if (invalidItems.length > 0) {
      return NextResponse.json(
        { success: false, message: "All items must have productId and size" },
        { status: 400 }
      );
    }

    // Find cart
    const cart = await Cart.findOne({ userId });
    
    if (!cart) {
      return NextResponse.json(
        { success: false, message: "Cart not found" },
        { status: 404 }
      );
    }

    // Track removed items for response
    const initialLength = cart.items.length;
    const removedItems = [];

    // Remove items from cart
    cart.items = cart.items.filter(cartItem => {
      const shouldRemove = items.some(removeItem => 
        cartItem.productId.toString() === removeItem.productId && 
        cartItem.size === removeItem.size
      );
      
      if (shouldRemove) {
        removedItems.push({
          productId: cartItem.productId.toString(),
          size: cartItem.size,
          name: cartItem.name
        });
      }
      
      return !shouldRemove;
    });

    // Save cart
    await cart.save();

    return NextResponse.json(
      { 
        success: true, 
        message: `${removedItems.length} item(s) removed from cart`,
        removedItems,
        itemsNotFound: items.length - removedItems.length,
        cart: {
          items: cart.items,
          totalItems: cart.totalItems,
          totalPrice: cart.totalPrice
        }
      },
      { status: 200 }
    );

  } catch (error) {
    console.error("Batch remove from cart error:", error);
    
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