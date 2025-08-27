// lib/auth.js - Authentication utility functions
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import Customer from "@/models/Customer";
import dbConnect from "@/lib/dbConnect";

export async function verifyToken(token) {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-fallback-secret-key");
    return decoded;
  } catch (error) {
    return null;
  }
}

export async function getCurrentUser() {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("auth-token");

    if (!token) {
      return null;
    }

    const decoded = await verifyToken(token.value);
    if (!decoded) {
      return null;
    }

    await dbConnect();
    const user = await Customer.findById(decoded.userId).select("-password");
    
    return user;
  } catch (error) {
    console.error("Get current user error:", error);
    return null;
  }
}

// Middleware function to protect routes
export async function requireAuth(req) {
  const token = req.cookies.get("auth-token");
  
  if (!token) {
    return { error: "Authentication required", status: 401 };
  }

  const decoded = await verifyToken(token.value);
  if (!decoded) {
    return { error: "Invalid token", status: 401 };
  }

  return { userId: decoded.userId, email: decoded.email };
}