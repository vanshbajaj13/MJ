import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import dbConnect from "@/lib/dbConnect";
import Customer from "@/models/Customer";

export async function POST(req) {
  try {
    await dbConnect();
    const { email, otp } = await req.json();

    // Validation
    if (!email || !otp) {
      return NextResponse.json(
        { success: false, message: "Email and OTP are required" },
        { status: 400 }
      );
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, message: "Please enter a valid email address" },
        { status: 400 }
      );
    }

    // OTP format validation (6 digits)
    if (!/^\d{6}$/.test(otp)) {
      return NextResponse.json(
        { success: false, message: "OTP must be 6 digits" },
        { status: 400 }
      );
    }

    // Find user
    const user = await Customer.findOne({ email: email.toLowerCase() });
    if (!user || !user.otp) {
      return NextResponse.json(
        { success: false, message: "OTP not requested or user not found" },
        { status: 400 }
      );
    }

    // Check if OTP is valid and not expired
    if (user.otp.code !== otp) {
      return NextResponse.json(
        { success: false, message: "Invalid OTP" },
        { status: 400 }
      );
    }

    if (new Date() > user.otp.expiresAt) {
      // Clear expired OTP
      user.otp = undefined;
      await user.save();
      
      return NextResponse.json(
        { success: false, message: "OTP has expired. Please request a new one." },
        { status: 400 }
      );
    }

    // OTP is valid - clear it and login user
    user.otp = undefined;
    await user.save();

    // Create JWT token
    const token = jwt.sign(
      { 
        userId: user._id, 
        email: user.email 
      },
      process.env.JWT_SECRET || "your-fallback-secret-key",
      { expiresIn: "7d" }
    );

    // Create response
    const response = NextResponse.json(
      { 
        success: true, 
        message: "Login successful", 
        user: {
          id: user._id,
          name: user.name,
          email: user.email
        }
      },
      { status: 200 }
    );

    // Set HTTP-only cookie for security
    response.cookies.set("auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/"
    });

    return response;

  } catch (error) {
    console.error("Verify OTP error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}