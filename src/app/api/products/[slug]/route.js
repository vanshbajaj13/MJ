import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { Product, Size,StockReservation } from "@/models";

export async function GET(req, { params }) {
  const { slug } = await params;

  await dbConnect();

  try {
    const product = await Product.findOne({ slug })
      .populate("category")
      .populate("sizes.size")
      .lean(); // ✅ now it's plain JSON, not Mongoose doc

    if (!product) {
      return NextResponse.json(
        { success: false, error: "Product not found" },
        { status: 404 }
      );
    }

    // ✅ Transform sizes array to include availableQty considering reservations
    const sizesWithAvailability = await Promise.all(
      product.sizes.map(async (s) => {

        
        // Get reserved quantity for this product-size combination
        const reservedQty = await StockReservation.getTotalReservedQty(
          product._id,
          s.size.name // Handle both populated and unpopulated references
        );
        
        // Calculate available quantity: total - sold - reserved
        const availableQty = Math.max(0, s.qtyBuy - (s.soldQty || 0) - reservedQty);

        return {
          ...s,
          availableQty,
          qtyBuy: undefined, // hide
          soldQty: undefined, // hide
        };
      })
    );

    product.sizes = sizesWithAvailability;

    return NextResponse.json({ success: true, data: product });
  } catch (error) {
    console.error("Error fetching product:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch product" },
      { status: 500 }
    );
  }
}