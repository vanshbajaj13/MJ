import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { Category } from "@/models";

let cachedCategories = null;
let lastFetched = 0;
const TTL = 1000 * 60 * 5; // cache for 5 minutes

export async function GET() {
  // Return from cache if within TTL
  if (cachedCategories && Date.now() - lastFetched < TTL) {
    return NextResponse.json(
      { success: true, data: cachedCategories },
      { status: 200 }
    );
  }

  await dbConnect();

  try {
    const categories = await Category.find().sort({ createdAt: -1 });

    cachedCategories = categories;
    lastFetched = Date.now();

    return NextResponse.json(
      { success: true, data: categories },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching categories:", error);
    return NextResponse.json(
      { success: false, error: "Failed to retrieve categories." },
      { status: 500 }
    );
  }
}
