import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Product from "@/models/Product";
import Size from "@/models/Size";


export async function GET(req, { params }) {
  const { slug } = await params;

  await dbConnect();

  try {
    const product = await Product.findOne({ slug }).populate("category").populate("sizes.size").lean(); // ✅ now it's plain JSON, not Mongoose doc;

    if (!product) {
      return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 });
    }

     // ✅ Transform sizes array to include only availableQty
    product.sizes = product.sizes.map((s) => ({
      ...s,
      availableQty: s.qtyBuy - (s.soldQty || 0),
      qtyBuy: undefined, // hide
      soldQty: undefined, // hide
    }));
    
    return NextResponse.json({ success: true, data: product });
  } catch (error) {
    console.error("Error fetching product:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch product" }, { status: 500 });
  }
}
