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
      
      // Check if verification is still valid (not older than 1 hour)
      const now = Date.now();
      const tokenAge = now - payload.timestamp;
      const oneHour = 60 * 60 * 1000;
      
      if (tokenAge > oneHour) {
        return NextResponse.json(
          { verified: false, error: 'Session expired' },
          { status: 401 }
        );
      }

      return NextResponse.json({
        verified: true,
        phoneNumber: payload.phoneNumber,
        timestamp: payload.timestamp
      });
      
    } catch (jwtError) {
      console.error('JWT verification failed:', jwtError);
      return NextResponse.json(
        { verified: false, error: 'Invalid session' },
        { status: 401 }
      );
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
      maxAge: 0, // Expire immediately
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