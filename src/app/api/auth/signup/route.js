import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Customer from "@/models/Customer";
import dbConnect from "@/lib/dbConnect";

export async function POST(req) {
  try {
    await dbConnect();
    const { name, email, password } = await req.json();

    // Validation
    if (!name || !email || !password) {
      return NextResponse.json(
        { success: false, message: "All fields are required" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, message: "Password must be at least 6 characters long" },
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

    // Check if user already exists
    const existingUser = await Customer.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return NextResponse.json(
        { success: false, message: "Email already registered" },
        { status: 400 }
      );
    }

    // Hash password and create user
    const hashedPassword = await bcrypt.hash(password, 12);
    const newUser = new Customer({ 
      name: name.trim(), 
      email: email.toLowerCase(), 
      password: hashedPassword 
    });
    
    const savedUser = await newUser.save();

    // Create JWT token for auto-login
    const token = jwt.sign(
      { 
        userId: savedUser._id, 
        email: savedUser.email 
      },
      process.env.JWT_SECRET || "your-fallback-secret-key", // Make sure to set this in .env.local
      { expiresIn: "7d" }
    );

    // Create response
    const response = NextResponse.json(
      { 
        success: true, 
        message: "Signup successful", 
        user: {
          id: savedUser._id,
          name: savedUser.name,
          email: savedUser.email
        }
      },
      { status: 201 }
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
    console.error("Signup error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}