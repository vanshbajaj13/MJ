import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { Product, Size } from "@/models";
import StockReservation from "@/models/StockReservation";

export async function GET(req) {
  await dbConnect();

  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get("slug");

    if (!slug) {
      return NextResponse.json(
        { success: false, error: "Slug is required" },
        { status: 400 }
      );
    }

    const product = await Product.findOne({ slug })
      .populate("category")
      .populate("sizes.size")
      .lean();

    if (!product) {
      return NextResponse.json(
        { success: false, error: "Product not found" },
        { status: 404 }
      );
    }

    const sizesWithAvailability = await Promise.all(
      product.sizes.map(async (s) => {
        const reservedQty = await StockReservation.getTotalReservedQty(
          product._id,
          s.size.name // works because you populated sizes.size
        );

        const availableQty = Math.max(
          0,
          s.qtyBuy - (s.soldQty || 0) - reservedQty
        );

        return {
          ...s,
          availableQty,
          qtyBuy: undefined,
          soldQty: undefined,
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
