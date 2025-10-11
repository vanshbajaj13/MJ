// middleware/checkoutAuth.js - Improved authentication middleware
import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

export async function verifyCheckoutSession(request) {
  try {
    const token = request.cookies.get('checkout-session')?.value;
    
    if (!token) {
      return { 
        verified: false, 
        error: 'No checkout session found',
        redirectUrl: '/checkout'
      };
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key');
    
    try {
      const { payload } = await jwtVerify(token, secret);
      console.log(payload);
      
      
      // Check if verification is still valid (48 hours instead of 1 hour)
      const now = Date.now();
      const tokenAge = now - payload.timestamp;
      const fortyEightHours = 48 * 60 * 60 * 1000;
      
      if (tokenAge > fortyEightHours) {
        return { 
          verified: false, 
          error: 'Session expired',
          expired: true,
          redirectUrl: '/checkout'
        };
      }

      return {
        verified: true,
        phoneNumber: payload.phoneNumber,
        timestamp: payload.timestamp,
        sessionAge: Math.floor(tokenAge / (60 * 60 * 1000)),
        sessionId: payload.sessionId
      };
      
    } catch (jwtError) {
      console.error('JWT verification failed:', jwtError);
      return { 
        verified: false, 
        error: 'Invalid session',
        redirectUrl: '/checkout'
      };
    }

  } catch (error) {
    console.error('Session verification error:', error);
    return { 
      verified: false, 
      error: 'Session verification failed',
      redirectUrl: '/checkout'
    };
  }
}

// Enhanced middleware function to protect routes that require phone verification
export function requirePhoneVerification(handler) {
  return async (request) => {
    const verification = await verifyCheckoutSession(request);
    
    if (!verification.verified) {
      const response = NextResponse.json(
        { 
          error: 'Phone verification required', 
          redirectTo: verification.redirectUrl || '/checkout',
          expired: verification.expired || false
        },
        { status: 401 }
      );

      // Clear expired or invalid session cookie
      if (verification.expired || verification.error === 'Invalid session') {
        response.cookies.set('checkout-session', '', {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 0,
          path: '/'
        });
      }

      return response;
    }

    // Add verification info to request for use in handler
    request.verification = verification;
    
    // Optionally auto-extend session if user is active and session is more than 24 hours old
    if (verification.sessionAge >= 24) {
      // You could call session extension logic here if needed
      console.log(`Session is ${verification.sessionAge} hours old, consider extending`);
    }
    
    return handler(request);
  };
}

// Optional: Middleware to auto-extend sessions for active users
export function withSessionExtension(handler) {
  return async (request) => {
    const verification = await verifyCheckoutSession(request);
    
    if (verification.verified && verification.sessionAge >= 24) {
      try {
        // Auto-extend session for active users
        const { SignJWT } = await import('jose');
        const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key');
        
        const newToken = await new SignJWT({
          phoneNumber: verification.phoneNumber,
          timestamp: Date.now(),
          sessionId: verification.sessionId || crypto.randomUUID()
        })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('48h')
        .sign(secret);

        const response = await handler(request);
        
        // Set the new extended token
        response.cookies.set('checkout-session', newToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 48 * 60 * 60,
          path: '/'
        });

        return response;
        
      } catch (error) {
        console.error('Session extension failed:', error);
        // Continue with original handler if extension fails
        return handler(request);
      }
    }
    
    return handler(request);
  };
}

// Usage examples:

// For routes that require phone verification
export const protectedHandler = requirePhoneVerification(async (request) => {
  // Your protected route logic here
  // request.verification contains user info
  return NextResponse.json({
    message: 'Access granted',
    user: request.verification.phoneNumber
  });
});

// For routes that should auto-extend sessions
export const extendedHandler = withSessionExtension(
  requirePhoneVerification(async (request) => {
    // Your route logic here
    return NextResponse.json({ success: true });
  })
);