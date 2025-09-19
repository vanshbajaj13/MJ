"use client";

import { useEffect, useState } from "react";
import { useCart } from "@/context/CartContext";
import { useRouter } from "next/navigation";
import { useBuyNow } from "@/context/BuyNowContext";
import { AnimatePresence, motion } from "framer-motion";
import CartDrawerPortal from "@/components/Cart/CartDrawerPortal";

export default function AddToBag({ product }) {
  const [isAdding, setIsAdding] = useState(false);
  const [isAdded, setIsAdded] = useState(false);
  const [selectedSize, setSelectedSize] = useState("");
  const [sizeError, setSizeError] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [stockData, setStockData] = useState(null);
  const [stockLoading, setStockLoading] = useState(true);
  const [stockError, setStockError] = useState(null);

  const router = useRouter();
  const { createBuyNowSession, loading: buyNowLoading } = useBuyNow();
  const { addToCart } = useCart();
  const [buyNowError, setBuyNowError] = useState("");

  const handleSizeSelect = (size) => {
    setSelectedSize(size);
    setSizeError(false);
    setBuyNowError("");
  };

  const handleSizeRequired = () => {
    setSizeError(true);
    // Scroll to size section
    document.getElementById("size-selector")?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  };

  const fetchProductData = async (slug) => {
    try {
      const res = await fetch(`/api/products/stock-check?slug=${slug}`, {
        cache: "no-store", // ✅ always fresh stock data
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        throw new Error("Failed to fetch product data");
      }

      const data = await res.json();
      return data;
    } catch (err) {
      console.error("Error fetching product data:", err);
      return { success: false, error: err.message };
    }
  };

  const loadFreshStockData = async () => {
    if (!product?.slug) return;

    setStockLoading(true);
    setStockError(null);

    try {
      const result = await fetchProductData(product.slug);

      if (result.success && result.data) {
        setStockData(result.data);
      } else {
        setStockError(result.error || "Failed to load stock data");
      }
    } catch (error) {
      console.error("Error loading fresh stock data:", error);
      setStockError("Failed to load stock data");
    } finally {
      setStockLoading(false);
    }
  };

  // Load fresh stock data on component mount
  useEffect(() => {
    loadFreshStockData();
  }, [product?.slug]);

  // Get the current product data (fresh stock data if available, fallback to cached)
  const currentProduct = stockData || product;
  const isStockDataFresh = stockData !== null;

  const handleBuyNow = async () => {
    if (!selectedSize) {
      setBuyNowError("Please select a size");
      setTimeout(() => setBuyNowError(""), 3000);
      handleSizeRequired();
      return;
    }

    try {
      // Create buy now session
      const result = await createBuyNowSession(product._id, selectedSize, 1);

      if (result.success) {
        // Navigate to checkout with buy now mode
        router.push(`/checkout?mode=buy_now&session=${result.sessionId}`);
      }
    } catch (error) {
      console.error("Buy now error:", error);
      setBuyNowError(error.message || "Unable to proceed. Please try again.");
      setTimeout(() => setBuyNowError(""), 5000);

      // Refresh stock data when buy now fails
      loadFreshStockData();
      setSelectedSize("");
    }
  };

  const handleAddToBag = async () => {
    // Require size
    if (!selectedSize) {
      handleSizeRequired();
      return;
    }

    if (isAdding || isAdded) return;

    setIsAdding(true);
    try {
      // Add product to cart
      await addToCart(product, selectedSize, 1);

      // Show success animation
      setIsAdding(false);
      setIsAdded(true);

      // Open cart drawer immediately after successful add
      setIsDrawerOpen(true);

      // Reset "Added!" state after 2 seconds
      setTimeout(() => {
        setIsAdded(false);
      }, 2000);
    } catch (error) {
      console.error("Error adding to bag:", error);
      setIsAdding(false);
    }
  };

  return (
    <>
      <div className="space-y-6">
        {/* Stock Error */}
        {/* {stockError && !stockLoading && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center justify-between">
              <p className="text-yellow-800 text-sm">
                Could not load latest stock data. Showing cached information.
              </p>
              <button
                onClick={loadFreshStockData}
                className="text-yellow-600 hover:text-yellow-800 underline text-sm"
              >
                Retry
              </button>
            </div>
          </div>
        )} */}

        {/* Size Selector */}
        <div id="size-selector">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-medium text-gray-900">
              Size{" "}
              {selectedSize && (
                <span className="font-normal text-gray-600">
                  ({selectedSize})
                </span>
              )}
            </h3>
            <div className="flex items-center gap-3">
              <button className="text-sm text-gray-500 underline hover:text-gray-700 transition-colors">
                Size Guide
              </button>
            </div>
          </div>

          {/* Stock Loading Indicator */}
          <AnimatePresence>
            {stockLoading && (
              <motion.div
                key="loading-indicator"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                  <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
                  Checking latest stock...
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Rest of your size selector content goes here */}

          {/* General Stock Alert - Updated to use fresh data */}
          <AnimatePresence>
            {!stockLoading &&
              currentProduct.sizes.some(
                (s) => (s.availableQty || 0) > 0 && (s.availableQty || 0) < 5
              ) && (
                <motion.div
                  key="low-stock-alert"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="flex items-center gap-2">
                    <p className="text-red-500 text-sm font-medium">
                      Hurry, only few left!
                    </p>
                  </div>
                </motion.div>
              )}
          </AnimatePresence>

          {(sizeError || buyNowError) && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg animate-shake">
              <p className="text-red-600 text-sm font-medium">
                {buyNowError || "Please select a size"}
              </p>
            </div>
          )}

          {/* Size Selector with Fresh Stock Data */}
          <div className="flex flex-wrap gap-2 mb-4">
            {currentProduct.sizes.map((s) => {
              const stock = s.availableQty || 0;
              const isOutOfStock = stock === 0;
              const isLowStock = stock > 0 && stock < 5;

              return (
                <div className="relative" key={s.size._id}>
                  <button
                    onClick={() =>
                      !isOutOfStock && handleSizeSelect(s.size.name)
                    }
                    disabled={isOutOfStock || stockLoading}
                    className={`
                      px-4 py-3 text-sm font-medium rounded-lg border-2 transition-all duration-200
                      relative
                      ${
                        selectedSize === s.size.name
                          ? "border-gray-900 bg-gray-900 text-white shadow-md transform scale-95"
                          : isOutOfStock
                          ? "border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed opacity-60"
                          : sizeError || buyNowError
                          ? "border-red-300 hover:border-red-400 focus:ring-red-500 text-gray-700 animate-pulse"
                          : stockLoading
                          ? "border-gray-200 bg-gray-50 text-gray-500 cursor-wait"
                          : "border-gray-200 hover:border-gray-300 text-gray-700 hover:bg-gray-50"
                      }
                      focus:outline-none focus:ring-0
                      min-w-[3rem] text-center
                      ${isOutOfStock ? "line-through" : ""}
                    `}
                  >
                    {s.size.name}
                    {/* Low stock indicator on button */}
                    {isLowStock && !stockLoading && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-400 rounded-full animate-pulse"></span>
                    )}
                  </button>

                  {/* Stock indicators below buttons */}
                  {isOutOfStock && !stockLoading && (
                    <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                      <span className="text-xs text-red-500 px-2 py-1 rounded-full">
                        Out
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Add to Cart Button */}
        <div className="space-y-6">
          <button
            onClick={handleAddToBag}
            disabled={isAdding || isAdded || stockLoading}
            className={`
              w-full py-4 px-6 bg-gray-100 rounded-md font-semibold text-base transition-all duration-300
              relative overflow-hidden group
              ${
                isAdded
                  ? "bg-green-500 text-white transform scale-105"
                  : isAdding
                  ? "bg-gray-400 text-white cursor-wait"
                  : stockLoading
                  ? "bg-gray-200 text-gray-400 cursor-wait"
                  : "text-gray-500"
              }
              disabled:cursor-not-allowed
              shadow-xl transform hover:scale-[1.02] active:scale-[0.98]
            `}
          >
            {/* Cart icon animation */}
            {isAdding && (
              <div className="absolute left-6 top-1/2 transform -translate-y-1/2">
                <div className="relative">
                  <svg
                    className="w-5 h-5 animate-bounce"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119.993z"
                    />
                  </svg>
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full animate-ping"></div>
                </div>
              </div>
            )}

            {/* Success checkmark with bounce */}
            {isAdded && (
              <div className="absolute right-6 top-1/2 transform -translate-y-1/2 animate-bounce">
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.707a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            )}

            <span
              className={`transition-all duration-300 ${
                isAdding ? "ml-8" : ""
              } ${isAdded ? "animate-pulse" : ""}`}
            >
              {stockLoading
                ? "Loading..."
                : isAdded
                ? "Added to Bag!"
                : isAdding
                ? "Adding..."
                : "Add to Bag"}
            </span>

            {/* Background animation for success */}
            {isAdded && (
              <div className="absolute inset-0 bg-green-400 animate-ping opacity-20 rounded-full"></div>
            )}
          </button>

          {/* Buy It Now Button */}
          <button
            onClick={handleBuyNow}
            disabled={buyNowLoading || stockLoading}
            className={`
              w-full py-4 px-6 rounded-md font-semibold text-base transition-all duration-300
              relative overflow-hidden group
              ${
                buyNowLoading || stockLoading
                  ? "bg-gray-400 text-white cursor-wait"
                  : "bg-gray-900 text-white hover:bg-black"
              }
              shadow-xl transform hover:scale-[1.02] active:scale-[0.98] 
            `}
          >
            {/* icon animation */}
            {(buyNowLoading || stockLoading) && (
              <div className="absolute left-6 top-1/2 transform -translate-y-1/2">
                <div className="relative">
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-400 rounded-full animate-ping"></div>
                </div>
              </div>
            )}

            <span
              className={`transition-all duration-300 ${
                buyNowLoading || stockLoading ? "ml-8" : ""
              } flex items-center justify-center gap-2`}
            >
              {stockLoading ? (
                "Loading..."
              ) : buyNowLoading ? (
                "Processing..."
              ) : (
                <span>Buy Now</span>
              )}
            </span>

            {/* Shimmer effect for enabled state */}
            {!buyNowLoading && !stockLoading && (
              <div className="absolute inset-0 -top-2 -bottom-2 bg-gradient-to-r from-transparent via-white to-transparent opacity-20 transform -skew-x-12 transition-transform duration-1000 hover:translate-x-full" />
            )}
          </button>
        </div>

        <style jsx>{`
          @keyframes shake {
            0%,
            100% {
              transform: translateX(0);
            }
            10%,
            30%,
            50%,
            70%,
            90% {
              transform: translateX(-2px);
            }
            20%,
            40%,
            60%,
            80% {
              transform: translateX(2px);
            }
          }

          .animate-shake {
            animation: shake 0.5s ease-in-out;
          }

          /* Add margin bottom to size selector when stock indicators are present */
          #size-selector .flex.flex-wrap.gap-2 {
            margin-bottom: 1.5rem;
          }
        `}</style>
      </div>

      <CartDrawerPortal
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
      />
    </>
  );
}
