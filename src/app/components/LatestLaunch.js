"use client";

import ProductCard from "./Cards/ProductCard";
import Link from "next/link";
import { permanentMarker } from "../fonts";
import useSWR from "swr";

const fetcher = (url) => fetch(url).then((res) => res.json());

export default function LatestLaunch() {
  const { data, error, isLoading } = useSWR("/api/products/latest", fetcher, {
    revalidateOnFocus: false,
    refreshInterval: 1000 * 60 * 5,
  });

  const products = data?.data || [];

  return (
    <div className="w-full max-w-7xl mx-auto px-0 py-16 sm:px-6 lg:px-8">
      <div className="text-center mb-12">
        <h2
          className={`text-4xl md:text-6xl font-bold text-gray-900 mb-4 permanentMarker ${permanentMarker.className}`}
        >
          Latest Launches
        </h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Discover our newest jewelry arrivals, meticulously crafted with
          exceptional quality and timeless elegance.
        </p>
      </div>

      {/* Error display */}
      {error && (
        <div className="text-center py-10">
          <div className="inline-flex items-center px-4 py-2 bg-red-100 text-red-700 rounded-lg">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 mr-2"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            {error.message || "Failed to load new arrivals."}
            <button
              className="ml-4 text-sm font-medium text-red-900 hover:text-red-800 underline"
              onClick={() => window.location.reload()}
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Grid of Products or Skeletons */}
      <div className="px-1 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-1 gap-y-6 md:gap-6 sm:gap-4">
        {isLoading
          ? Array.from({ length: 5 }).map((_, index) => (
              <ProductCard key={`skeleton-${index}`} loading />
            ))
          : products.map((product) => {
              return <ProductCard key={product._id} product={product} />;
            })}
      </div>

      {/* View More Button */}
      {!isLoading && !error && products.length > 0 && (
        <div className="text-center mt-12">
          <Link href="/products">
            <button className="inline-flex items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all">
              View All New Arrivals
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 ml-2"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </Link>
        </div>
      )}
    </div>
  );
}
