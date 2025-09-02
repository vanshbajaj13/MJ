import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import dbConnect from "@/lib/dbConnect";
import Cart from "@/models/Cart";

// Update multiple items in cart
export async function PUT(req) {
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
    const invalidItems = items.filter(item => 
      !item.productId || 
      !item.size || 
      !item.quantity || 
      item.quantity < 0 || 
      !Number.isInteger(item.quantity)
    );
    
    if (invalidItems.length > 0) {
      return NextResponse.json(
        { success: false, message: "All items must have productId, size, and valid quantity (positive integer)" },
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

    // Track updates for response
    const updatedItems = [];
    const itemsNotFound = [];
    const itemsToRemove = [];

    // Update items in cart
    items.forEach(updateItem => {
      const cartItemIndex = cart.items.findIndex(cartItem => 
        cartItem.productId.toString() === updateItem.productId && 
        cartItem.size === updateItem.size
      );

      if (cartItemIndex !== -1) {
        if (updateItem.quantity === 0) {
          // Mark for removal if quantity is 0
          itemsToRemove.push(cartItemIndex);
        } else {
          // Update quantity
          const oldQuantity = cart.items[cartItemIndex].quantity;
          cart.items[cartItemIndex].quantity = updateItem.quantity;
          
          updatedItems.push({
            productId: updateItem.productId,
            size: updateItem.size,
            oldQuantity,
            newQuantity: updateItem.quantity,
            name: cart.items[cartItemIndex].name
          });
        }
      } else {
        itemsNotFound.push({
          productId: updateItem.productId,
          size: updateItem.size,
          quantity: updateItem.quantity
        });
      }
    });

    // Remove items with quantity 0 (in reverse order to maintain indices)
    itemsToRemove.sort((a, b) => b - a).forEach(index => {
      const removedItem = cart.items[index];
      updatedItems.push({
        productId: removedItem.productId.toString(),
        size: removedItem.size,
        oldQuantity: removedItem.quantity,
        newQuantity: 0,
        name: removedItem.name,
        removed: true
      });
      cart.items.splice(index, 1);
    });

    // Save cart
    await cart.save();

    return NextResponse.json(
      { 
        success: true, 
        message: `${updatedItems.length} item(s) updated in cart`,
        updatedItems,
        itemsNotFound,
        cart: {
          items: cart.items,
          totalItems: cart.totalItems,
          totalPrice: cart.totalPrice
        }
      },
      { status: 200 }
    );

  } catch (error) {
    console.error("Batch update cart error:", error);
    
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