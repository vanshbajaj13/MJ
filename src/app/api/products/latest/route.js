import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { Product } from "@/models";

let cachedLatestProducts = null;
let lastFetched = 0;
const TTL = 1000 * 60 * 5; // 5 minutes
const LIMIT = 7; // Change to 5 if you want latest 5

export async function GET() {
  if (cachedLatestProducts && Date.now() - lastFetched < TTL) {
    return NextResponse.json(
      { success: true, data: cachedLatestProducts },
      { status: 200 }
    );
  }

  await dbConnect();

  try {
    const products = await Product.find()
      .sort({ createdAt: -1 })
      .limit(LIMIT);

    cachedLatestProducts = products;
    lastFetched = Date.now();

    return NextResponse.json(
      { success: true, data: products },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching latest products:", error);
    return NextResponse.json(
      { success: false, error: "Failed to retrieve latest products." },
      { status: 500 }
    );
  }
}
