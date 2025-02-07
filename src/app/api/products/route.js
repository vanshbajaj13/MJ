// src/app/api/products/route.js
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Product from '@/models/Product';

// Handles GET requests to /api/products
export async function GET() {
  await dbConnect();
  const products = await Product.find({});
  return NextResponse.json({ success: true, data: products });
}

// Handles POST requests to /api/products
export async function POST(req) {
  await dbConnect();
  const body = await req.json();
  try {
    const newProduct = await Product.create(body);
    return NextResponse.json({ success: true, data: newProduct }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
