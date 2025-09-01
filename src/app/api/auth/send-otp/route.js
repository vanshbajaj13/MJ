import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Otp from '@/models/Otp';

// Rate limiting storage (in production, use Redis)
const rateLimitStore = new Map();

// Clean up rate limit store every hour
setInterval(() => {
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.timestamp < oneHourAgo) {
      rateLimitStore.delete(key);
    }
  }
}, 60 * 60 * 1000);

// Rate limiting function
function checkRateLimit(phoneNumber) {
  const key = `otp_${phoneNumber}`;
  const now = Date.now();
  const oneMinute = 60 * 1000;
  const oneHour = 60 * 60 * 1000;
  
  const record = rateLimitStore.get(key) || { count: 0, timestamp: now };
  
  // Reset if more than an hour has passed
  if (now - record.timestamp > oneHour) {
    record.count = 0;
    record.timestamp = now;
  }
  
  // Check if within rate limit (5 OTPs per hour, 1 per minute)
  if (record.count >= 5) {
    return { allowed: false, retryAfter: oneHour - (now - record.timestamp) };
  }
  
  // Check if last request was within a minute
  if (record.count > 0 && now - record.timestamp < oneMinute) {
    return { allowed: false, retryAfter: oneMinute - (now - record.timestamp) };
  }
  
  // Update record
  record.count += 1;
  record.timestamp = now;
  rateLimitStore.set(key, record);
  
  return { allowed: true };
}

// Gupshup WhatsApp API function
async function sendWhatsAppOTP(phoneNumber, otp) {
  const gupshupApiKey = process.env.GUPSHUP_API_KEY;
  const gupshupAppName = process.env.GUPSHUP_APP_NAME;
  
  if (!gupshupApiKey || !gupshupAppName) {
    throw new Error('Gupshup configuration missing');
  }
  
  const message = `Your jewelry store verification code is: *${otp}*\n\nThis code will expire in 5 minutes.\n\nDo not share this code with anyone.`;
  
  const url = 'https://api.gupshup.io/sm/api/v1/msg';
  
  const formData = new URLSearchParams();
  formData.append('channel', 'whatsapp');
  formData.append('source', gupshupAppName);
  formData.append('destination', phoneNumber);
  formData.append('message', message);
  formData.append('src.name', gupshupAppName);
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'apikey': gupshupApiKey,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    });
    console.log(otp);
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error('Gupshup API error:', data);
      throw new Error(data.message || 'Failed to send WhatsApp message');
    }
    
    return data;
  } catch (error) {
    console.error('WhatsApp send error:', error);
    throw error;
  }
}

export async function POST(request) {
  try {
    const { phoneNumber } = await request.json();
    
    // Validate phone number
    if (!phoneNumber || !/^\+91[6-9]\d{9}$/.test(phoneNumber)) {
      return NextResponse.json(
        { error: 'Invalid phone number format' },
        { status: 400 }
      );
    }
    
    // Check rate limiting
    const rateLimitCheck = checkRateLimit(phoneNumber);
    if (!rateLimitCheck.allowed) {
      const retryAfterSeconds = Math.ceil(rateLimitCheck.retryAfter / 1000);
      return NextResponse.json(
        { 
          error: `Too many requests. Please try again after ${retryAfterSeconds} seconds.`,
          retryAfter: retryAfterSeconds
        },
        { status: 429 }
      );
    }
    
    // Connect to database
    await dbConnect();
    
    // Check if there's already a recent unverified OTP
    const existingOtp = await Otp.findValidOTP(phoneNumber);
    if (existingOtp) {
      // If OTP was sent less than 1 minute ago, reject
      const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
      if (existingOtp.createdAt > oneMinuteAgo) {
        return NextResponse.json(
          { error: 'Please wait 1 minute before requesting a new OTP' },
          { status: 429 }
        );
      }
      
      // Delete existing OTP
      await Otp.deleteOne({ _id: existingOtp._id });
    }
    
    // Generate new OTP
    const otp = Otp.generateOTP();
    
    // Save OTP to database
    const newOtpRecord = new Otp({
      phoneNumber,
      otp,
    });
    
    await newOtpRecord.save();
    
    // Send OTP via WhatsApp
    try {
      await sendWhatsAppOTP(phoneNumber, otp);
    } catch (whatsappError) {
      // If WhatsApp fails, delete the OTP record
      await Otp.deleteOne({ _id: newOtpRecord._id });
      
      console.error('Failed to send WhatsApp OTP:', whatsappError);
      return NextResponse.json(
        { error: 'Failed to send OTP via WhatsApp. Please try again.' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      message: 'OTP sent successfully',
      phoneNumber: phoneNumber,
    });
    
  } catch (error) {
    console.error('Send OTP error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}