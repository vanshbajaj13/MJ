import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Customer from "@/models/Customer";
import nodemailer from "nodemailer";

export async function POST(req) {
  try {
    await dbConnect();
    const { email } = await req.json();

    // Validation
    if (!email) {
      return NextResponse.json(
        { success: false, message: "Email is required" },
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

    // Find user
    const user = await Customer.findOne({ email: email.toLowerCase() });
    if (!user) {
      return NextResponse.json(
        { success: false, message: "No account found with this email address" },
        { status: 404 }
      );
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Save OTP to user
    user.otp = { code: otp, expiresAt: expiry };
    await user.save();

    // Configure email transporter
    const transporter = nodemailer.createTransport({
      service: "Gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Send OTP email
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Your Login OTP - Jewelry Store",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Your Login OTP</h2>
          <p>Hello ${user.name},</p>
          <p>You requested to login to your account. Please use the following OTP:</p>
          <div style="background: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0;">
            <h1 style="color: #000; font-size: 36px; margin: 0; letter-spacing: 8px;">${otp}</h1>
          </div>
          <p><strong>This OTP will expire in 5 minutes.</strong></p>
          <p>If you didn't request this, please ignore this email.</p>
          <p>Best regards,<br>Your Jewelry Store Team</p>
        </div>
      `,
      text: `Your OTP is ${otp}. It will expire in 5 minutes.`,
    });

    return NextResponse.json(
      {
        success: true,
        message: "OTP sent successfully to your email",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Send OTP error:", error);

    // Handle specific email errors
    if (error.code === "EAUTH" || error.code === "ENOTFOUND") {
      return NextResponse.json(
        {
          success: false,
          message:
            "Email service temporarily unavailable. Please try again later.",
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Failed to send OTP. Please try again." },
      { status: 500 }
    );
  }
}
