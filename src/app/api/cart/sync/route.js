import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import dbConnect from "@/lib/dbConnect";
import { Cart } from "@/models";

// Sync local cart with database cart when user logs in
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

    // Get local cart items from request
    const { items: localItems } = await req.json();

    // Handle empty or invalid local items
    if (!Array.isArray(localItems)) {
      return NextResponse.json(
        { success: false, message: "Invalid items format" },
        { status: 400 }
      );
    }

    // Find existing cart in database
    let cart = await Cart.findOne({ userId });
    
    if (!cart) {
      // Create new cart
      cart = new Cart({ 
        userId, 
        items: []
      });
    }

    // If no local items, just return existing cart
    if (localItems.length === 0) {
      return NextResponse.json(
        { 
          success: true, 
          message: "No items to sync",
          cart: {
            items: cart.items || [],
            totalItems: cart.totalItems,
            totalPrice: cart.totalPrice
          }
        },
        { status: 200 }
      );
    }

    // Merge local items with existing cart items
    const mergedItems = new Map();
    
    // First, add all existing database items
    cart.items.forEach(item => {
      const key = `${item.productId}-${item.size}`;
      mergedItems.set(key, {
        productId: item.productId,
        name: item.name,
        price: item.price,
        image: item.image || "",
        size: item.size,
        quantity: item.quantity,
        slug: item.slug,
      });
    });

    // Then, merge with local items
    localItems.forEach(localItem => {
      const key = `${localItem.productId}-${localItem.size}`;
      const existingItem = mergedItems.get(key);
      
      if (existingItem) {
        // Add quantities if item exists
        existingItem.quantity += localItem.quantity;
      } else {
        // Add new item
        mergedItems.set(key, {
          productId: localItem.productId,
          name: localItem.name,
          price: localItem.price,
          image: localItem.image || "",
          size: localItem.size,
          quantity: localItem.quantity,
          slug: localItem.slug,
        });
      }
    });

    // Convert map back to array and filter valid items
    cart.items = Array.from(mergedItems.values()).filter(item => 
      item.quantity > 0 && 
      item.productId && 
      item.name && 
      item.price !== undefined && 
      item.size && 
      item.slug
    );

    await cart.save();

    return NextResponse.json(
      { 
        success: true, 
        message: "Cart synced successfully",
        cart: {
          items: cart.items,
          totalItems: cart.totalItems,
          totalPrice: cart.totalPrice
        }
      },
      { status: 200 }
    );

  } catch (error) {
    console.error("Sync cart error:", error);
    
    if (error.name === 'JsonWebTokenError') {
      return NextResponse.json(
        { success: false, message: "Invalid token" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Internal server error", error: error.message },
      { status: 500 }
    );
  }
}