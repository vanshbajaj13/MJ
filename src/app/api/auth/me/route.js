import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import dbConnect from "@/lib/dbConnect";
import Customer from "@/models/Customer";

export async function GET(req) {
  try {
    await dbConnect();

    // Get token from cookies
    const token = req.cookies.get("auth-token")?.value;

    // If no token, return success with null user (for guests)
    if (!token) {
      return NextResponse.json(
        { 
          success: true, 
          user: null,
          message: "No authentication token found"
        },
        { status: 200 }
      );
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || "your-fallback-secret-key");
    } catch (jwtError) {
      // Invalid token - treat as guest
      return NextResponse.json(
        { 
          success: true, 
          user: null,
          message: "Invalid token"
        },
        { status: 200 }
      );
    }

    // Find customer in database
    const customer = await Customer.findById(decoded.userId).select("-password");

    if (!customer) {
      // Customer not found - treat as guest
      return NextResponse.json(
        { 
          success: true, 
          user: null,
          message: "Customer not found"
        },
        { status: 200 }
      );
    }

    // Return customer data
    return NextResponse.json(
      { 
        success: true, 
        user: {
          id: customer._id,
          name: customer.name,
          email: customer.email,
          mobile: customer.mobile,
          address: customer.address
        }
      },
      { status: 200 }
    );

  } catch (error) {
    console.error("Get user error:", error);
    return NextResponse.json(
      { 
        success: false, 
        user: null,
        message: "Internal server error" 
      },
      { status: 500 }
    );
  }
}