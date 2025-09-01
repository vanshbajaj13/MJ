import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

export async function verifyCheckoutSession(request) {
  try {
    const token = request.cookies.get('checkout-session')?.value;
    
    if (!token) {
      return { verified: false, error: 'No checkout session found' };
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key');
    
    try {
      const { payload } = await jwtVerify(token, secret);
      
      // Check if verification is still valid (not older than 1 hour)
      const now = Date.now();
      const tokenAge = now - payload.timestamp;
      const oneHour = 60 * 60 * 1000;
      
      if (tokenAge > oneHour) {
        return { verified: false, error: 'Session expired' };
      }

      return {
        verified: true,
        phoneNumber: payload.phoneNumber,
        timestamp: payload.timestamp
      };
      
    } catch (jwtError) {
      return { verified: false, error: 'Invalid session' };
    }

  } catch (error) {
    return { verified: false, error: 'Session verification failed' };
  }
}

// Middleware function to protect routes that require phone verification
export function requirePhoneVerification(handler) {
  return async (request) => {
    const verification = await verifyCheckoutSession(request);
    
    if (!verification.verified) {
      return NextResponse.json(
        { error: 'Phone verification required', redirectTo: '/checkout' },
        { status: 401 }
      );
    }

    // Add verification info to request for use in handler
    request.verification = verification;
    return handler(request);
  };
}