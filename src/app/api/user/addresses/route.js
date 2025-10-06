import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Address from '@/models/Address';
import { verifyCheckoutSession } from '@/lib/middleware/checkoutAuth';

// GET - Fetch addresses for a phone number
export async function GET(request) {
  try {
    const verification = await verifyCheckoutSession(request);
    if (!verification.verified) {
      return NextResponse.json(
        { error: 'Phone verification required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const phone = searchParams.get('phone');

    if (!phone || phone !== verification.phoneNumber) {
      return NextResponse.json(
        { error: 'Invalid phone number' },
        { status: 400 }
      );
    }

    await dbConnect();
    const addresses = await Address.getAddressesByPhone(phone);

    return NextResponse.json({ addresses });

  } catch (error) {
    console.error('Get addresses error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Save a new address
export async function POST(request) {
  try {
    const verification = await verifyCheckoutSession(request);
    if (!verification.verified) {
      return NextResponse.json(
        { error: 'Phone verification required' },
        { status: 401 }
      );
    }

    const addressData = await request.json();

    const {
      phoneNumber,
      fullName,
      email,
      addressLine1,
      addressLine2,
      city,
      state,
      pincode,
      landmark,
      addressType = 'home',
    } = addressData;

    if (phoneNumber !== verification.phoneNumber) {
      return NextResponse.json(
        { error: 'Phone number mismatch with verified session' },
        { status: 400 }
      );
    }

    if (!phoneNumber || !fullName || !email || !addressLine1 || !city || !state || !pincode) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!/^\+91[6-9]\d{9}$/.test(phoneNumber)) {
      return NextResponse.json(
        { error: 'Invalid phone number format' },
        { status: 400 }
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    if (!/^\d{6}$/.test(pincode)) {
      return NextResponse.json(
        { error: 'PIN code must be 6 digits' },
        { status: 400 }
      );
    }

    await dbConnect();

    const existingAddresses = await Address.find({ phoneNumber });
    const isDefault = existingAddresses.length === 0;

    const newAddress = new Address({
      phoneNumber,
      fullName,
      email,
      addressLine1,
      addressLine2: addressLine2 || '',
      city,
      state,
      pincode,
      landmark: landmark || '',
      addressType,
      isDefault,
    });

    await newAddress.save();

    return NextResponse.json({
      message: 'Address saved successfully',
      address: newAddress,
    });

  } catch (error) {
    console.error('Save address error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update an existing address
export async function PUT(request) {
  try {
    const verification = await verifyCheckoutSession(request);
    if (!verification.verified) {
      return NextResponse.json(
        { error: 'Phone verification required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const addressId = searchParams.get('id');
    
    if (!addressId) {
      return NextResponse.json(
        { error: 'Address ID is required' },
        { status: 400 }
      );
    }

    const updateData = await request.json();
    
    await dbConnect();

    // Verify the address belongs to the verified phone number
    const existingAddress = await Address.findById(addressId);
    if (!existingAddress) {
      return NextResponse.json(
        { error: 'Address not found' },
        { status: 404 }
      );
    }

    if (existingAddress.phoneNumber !== verification.phoneNumber) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const updatedAddress = await Address.findByIdAndUpdate(
      addressId,
      updateData,
      { new: true, runValidators: true }
    );

    return NextResponse.json({
      message: 'Address updated successfully',
      address: updatedAddress,
    });

  } catch (error) {
    console.error('Update address error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete an address
export async function DELETE(request) {
  try {
    const verification = await verifyCheckoutSession(request);
    if (!verification.verified) {
      return NextResponse.json(
        { error: 'Phone verification required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const addressId = searchParams.get('id');
    
    if (!addressId) {
      return NextResponse.json(
        { error: 'Address ID is required' },
        { status: 400 }
      );
    }

    await dbConnect();

    // Verify the address belongs to the verified phone number
    const existingAddress = await Address.findById(addressId);
    if (!existingAddress) {
      return NextResponse.json(
        { error: 'Address not found' },
        { status: 404 }
      );
    }

    if (existingAddress.phoneNumber !== verification.phoneNumber) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    await Address.findByIdAndDelete(addressId);

    return NextResponse.json({
      message: 'Address deleted successfully',
    });

  } catch (error) {
    console.error('Delete address error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}