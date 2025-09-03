// /api/auth/verify-session/route.js - Improved session verification
import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

export async function GET(request) {
  try {
    const cookieHeader = request.headers.get('cookie');
    
    if (!cookieHeader) {
      return NextResponse.json(
        { verified: false, error: 'No session found' },
        { status: 401 }
      );
    }

    // Extract the checkout-session cookie
    const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=');
      acc[key] = value;
      return acc;
    }, {});

    const token = cookies['checkout-session'];
    
    if (!token) {
      return NextResponse.json(
        { verified: false, error: 'No checkout session found' },
        { status: 401 }
      );
    }

    // Verify the JWT token
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key');
    
    try {
      const { payload } = await jwtVerify(token, secret);
      
      // Updated: Check if verification is still valid (48 hours instead of 1 hour)
      const now = Date.now();
      const tokenAge = now - payload.timestamp;
      const fortyEightHours = 48 * 60 * 60 * 1000; // 48 hours in milliseconds
      
      if (tokenAge > fortyEightHours) {
        // Clear expired session
        const response = NextResponse.json(
          { verified: false, error: 'Session expired' },
          { status: 401 }
        );
        
        response.cookies.set('checkout-session', '', {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 0,
          path: '/'
        });
        
        return response;
      }

      // Session is valid - return user info
      return NextResponse.json({
        verified: true,
        phoneNumber: payload.phoneNumber,
        timestamp: payload.timestamp,
        // Add session metadata for better UX
        sessionAge: Math.floor(tokenAge / (60 * 60 * 1000)), // hours
        expiresIn: Math.floor((fortyEightHours - tokenAge) / (60 * 60 * 1000)) // hours remaining
      });
      
    } catch (jwtError) {
      console.error('JWT verification failed:', jwtError);
      
      // Clear invalid session
      const response = NextResponse.json(
        { verified: false, error: 'Invalid session' },
        { status: 401 }
      );
      
      response.cookies.set('checkout-session', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 0,
        path: '/'
      });
      
      return response;
    }

  } catch (error) {
    console.error('Session verification error:', error);
    return NextResponse.json(
      { verified: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Clear session (logout)
export async function DELETE() {
  try {
    const response = NextResponse.json({
      message: 'Session cleared successfully'
    });

    // Clear the checkout session cookie
    response.cookies.set('checkout-session', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/'
    });

    return response;

  } catch (error) {
    console.error('Clear session error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Extend session (optional - call this when user is active)
export async function PUT(request) {
  try {
    const cookieHeader = request.headers.get('cookie');
    
    if (!cookieHeader) {
      return NextResponse.json(
        { error: 'No session found' },
        { status: 401 }
      );
    }

    const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=');
      acc[key] = value;
      return acc;
    }, {});

    const token = cookies['checkout-session'];
    
    if (!token) {
      return NextResponse.json(
        { error: 'No checkout session found' },
        { status: 401 }
      );
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key');
    
    try {
      const { payload } = await jwtVerify(token, secret);
      
      // Create new token with extended expiry
      const { SignJWT } = await import('jose');
      
      const newToken = await new SignJWT({
        phoneNumber: payload.phoneNumber,
        timestamp: Date.now(), // Reset timestamp
        sessionId: payload.sessionId || crypto.randomUUID()
      })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('48h')
      .sign(secret);

      const response = NextResponse.json({
        message: 'Session extended successfully',
        phoneNumber: payload.phoneNumber
      });

      // Set the new token
      response.cookies.set('checkout-session', newToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 48 * 60 * 60, // 48 hours
        path: '/'
      });

      return response;

    } catch (jwtError) {
      return NextResponse.json(
        { error: 'Invalid session' },
        { status: 401 }
      );
    }

  } catch (error) {
    console.error('Extend session error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}