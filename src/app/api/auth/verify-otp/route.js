import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Otp from '@/models/Otp';
import { SignJWT } from 'jose';

export async function POST(request) {
  try {
    const { phoneNumber, otp } = await request.json();
    
    // Validate input
    if (!phoneNumber || !otp) {
      return NextResponse.json(
        { error: 'Phone number and OTP are required' },
        { status: 400 }
      );
    }
    
    // Validate phone number format
    if (!/^\+91[6-9]\d{9}$/.test(phoneNumber)) {
      return NextResponse.json(
        { error: 'Invalid phone number format' },
        { status: 400 }
      );
    }
    
    // Validate OTP format
    if (!/^\d{6}$/.test(otp)) {
      return NextResponse.json(
        { error: 'Invalid OTP format' },
        { status: 400 }
      );
    }
    
    // Connect to database
    await dbConnect();
    
    // Find valid OTP record
    const otpRecord = await Otp.findValidOTP(phoneNumber);
    
    if (!otpRecord) {
      return NextResponse.json(
        { error: 'OTP expired or not found. Please request a new OTP.' },
        { status: 400 }
      );
    }
    
    // Check if max attempts reached
    if (otpRecord.attempts >= 3) {
      return NextResponse.json(
        { error: 'Maximum verification attempts exceeded. Please request a new OTP.' },
        { status: 400 }
      );
    }
    
    // Verify OTP
    const isValid = otpRecord.verifyOTP(otp);
    
    // Save the updated record (attempts incremented, verified status updated)
    await otpRecord.save();
    
    if (!isValid) {
      const remainingAttempts = 3 - otpRecord.attempts;
      return NextResponse.json(
        { 
          error: `Invalid OTP. ${remainingAttempts} attempt${remainingAttempts !== 1 ? 's' : ''} remaining.` 
        },
        { status: 400 }
      );
    }
    
    // OTP verified successfully - Create secure session
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key');
    const sessionId = crypto.randomUUID(); // Generate unique session ID
    
    const token = await new SignJWT({ 
      phoneNumber, 
      verified: true,
      timestamp: Date.now(), // Current timestamp for session age calculation
      sessionId // Add session ID for better session management
    })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('48h') // Changed from '2d' to '48h' for consistency
    .sign(secret);

    // Create the response
    const response = NextResponse.json({
      message: 'Phone number verified successfully',
      phoneNumber: phoneNumber,
      verified: true,
      sessionId // Optional: include in response for debugging
    });

    // Set secure HTTP-only cookie - FIXED: Now matches token expiry
    response.cookies.set('checkout-session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 48 * 60 * 60, // 48 hours (matches JWT expiry and verification logic)
      path: '/'
    });

    return response;
    
  } catch (error) {
    console.error('Verify OTP error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}