import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { Product } from "@/models";


let cachedProducts = null;
let lastFetched = 0;
const TTL = 1000 * 60 * 5; // 5 minutes

export async function GET() {
  if (cachedProducts && Date.now() - lastFetched < TTL) {
    return NextResponse.json(
      { success: true, data: cachedProducts },
      { status: 200 }
    );
  }

  await dbConnect();

  try {
    const products = await Product.find().sort({ createdAt: -1 });

    cachedProducts = products;
    lastFetched = Date.now();

    return NextResponse.json(
      { success: true, data: products },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json(
      { success: false, error: "Failed to retrieve products." },
      { status: 500 }
    );
  }
}
