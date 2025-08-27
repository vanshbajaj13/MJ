"use client";

import Image from "next/image";
import Link from "next/link";

export default function ProductCard({ product, loading }) {
  const isLoading = loading || !product;

  const primaryImage =
    product?.images?.find((img) => img.position === 0) || product?.images?.[0];

  const CardContent = (
    <div className="rounded-xl sm:shadow-md sm:hover:shadow-xl transition duration-300 bg-white border-0 sm:border overflow-hidden h-full flex flex-col">
      {/* Image Section */}
      <div className="relative w-full h-56 overflow-hidden">
        {isLoading ? (
          <div className="skeleton-shimmer border-2 border-dashed w-full h-full " />
        ) : (
          <Image
            loading="lazy"
            src={primaryImage?.url}
            alt={product?.name || "Product Image"}
            fill
            placeholder="blur"
            blurDataURL={primaryImage?.blurDataURL}
            className="object-cover transition-transform duration-700 hover:scale-110"
            sizes="(max-width: 768px) 100vw, 33vw"
          />
        )}
      </div>

      {/* Content Section */}
      <div className="p-4 pb-2 flex-grow flex flex-col sm:text-lg">
        {isLoading ? (
          <>
            <div className="skeleton-shimmer h-5 rounded-full w-3/4 mb-2" />
            <div className="skeleton-shimmer h-6 rounded-full w-1/4 mt-auto" />
          </>
        ) : (
          <>
            <h3 className="text-sm font-semibold text-gray-800 mb-1">
              {product.name}
            </h3>
            <div className="m-0 p-0 flex justify-between items-center">
              <span className="text-sm font-bold text-gray-900">
                ₹{product.price?.toFixed(2) || "99.99"}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );

  // Only wrap with Link if product exists and is not loading
  return !isLoading ? (
    <Link href={`/product/${product.slug}`} prefetch={false}>
      {CardContent}
    </Link>
  ) : (
    CardContent
  );
}
