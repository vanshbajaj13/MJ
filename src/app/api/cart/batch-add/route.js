import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import dbConnect from "@/lib/dbConnect";
import Cart from "@/models/Cart";

// Add multiple items to cart
export async function POST(req) {
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
      !item.name || 
      !item.size || 
      !item.quantity || 
      !item.price ||
      item.quantity < 1 || 
      item.price < 0 ||
      !Number.isInteger(item.quantity) ||
      typeof item.price !== 'number'
    );
    
    if (invalidItems.length > 0) {
      return NextResponse.json(
        { success: false, message: "All items must have productId, name, size, valid quantity (positive integer), and valid price" },
        { status: 400 }
      );
    }

    // Find or create cart
    let cart = await Cart.findOne({ userId });
    
    if (!cart) {
      cart = new Cart({
        userId,
        items: []
      });
    }

    // Track operations for response
    const addedItems = [];
    const updatedItems = [];

    // Process each item
    items.forEach(newItem => {
      const existingItemIndex = cart.items.findIndex(cartItem => 
        cartItem.productId.toString() === newItem.productId && 
        cartItem.size === newItem.size
      );

      if (existingItemIndex !== -1) {
        // Update existing item quantity
        const oldQuantity = cart.items[existingItemIndex].quantity;
        cart.items[existingItemIndex].quantity += newItem.quantity;
        
        updatedItems.push({
          productId: newItem.productId,
          size: newItem.size,
          name: newItem.name,
          oldQuantity,
          newQuantity: cart.items[existingItemIndex].quantity,
          addedQuantity: newItem.quantity
        });
      } else {
        // Add new item
        const cartItem = {
          productId: newItem.productId,
          name: newItem.name,
          price: newItem.price,
          image: newItem.image || "",
          size: newItem.size,
          quantity: newItem.quantity,
          slug: newItem.slug || ""
        };
        
        cart.items.push(cartItem);
        addedItems.push({
          productId: newItem.productId,
          size: newItem.size,
          name: newItem.name,
          quantity: newItem.quantity,
          price: newItem.price
        });
      }
    });

    // Save cart
    await cart.save();

    return NextResponse.json(
      { 
        success: true, 
        message: `${addedItems.length} new item(s) added, ${updatedItems.length} item(s) updated in cart`,
        addedItems,
        updatedItems,
        cart: {
          items: cart.items,
          totalItems: cart.totalItems,
          totalPrice: cart.totalPrice
        }
      },
      { status: 200 }
    );

  } catch (error) {
    console.error("Batch add to cart error:", error);
    
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