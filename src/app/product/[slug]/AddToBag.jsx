"use client";

import { useState } from "react";
import { useCart } from "@/context/CartContext";
import CartDrawerPortal from "@/components/Cart/CartDrawerPortal";

export default function AddToBag({ product }) {
  const [isAdding, setIsAdding] = useState(false);
  const [isAdded, setIsAdded] = useState(false);
  const [selectedSize, setSelectedSize] = useState("");
  const [sizeError, setSizeError] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const { addToCart } = useCart();

  const handleSizeSelect = (size) => {
    setSelectedSize(size);
    setSizeError(false);
  };

  const handleSizeRequired = () => {
    setSizeError(true);
    // Scroll to size section
    document.getElementById("size-selector")?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  };

  const handleQuantityChange = (newQuantity) => {
    if (newQuantity >= 1) {
      setQuantity(newQuantity);
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
      await addToCart(product, selectedSize, quantity);

      // Show success animation
      setIsAdding(false);
      setIsAdded(true);

      // Open cart drawer immediately after successful add
      setIsDrawerOpen(true);

      // Reset "Added!" state after 2 seconds
      setTimeout(() => {
        setIsAdded(false);
        setQuantity(1); // Reset quantity
      }, 2000);
    } catch (error) {
      console.error("Error adding to bag:", error);
      setIsAdding(false);

      // Optionally show an error message
      // You could add an error state here
    }
  };

  return (
    <>
      <div className="space-y-6">
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
            <button className="text-sm text-gray-500 underline hover:text-gray-700 transition-colors">
              Size Guide
            </button>
          </div>

          {sizeError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg animate-shake">
              <p className="text-red-600 text-sm font-medium">
                Please select a size before adding to cart
              </p>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {product.sizes.map((s) => (
              <button
                key={s.size._id}
                onClick={() => handleSizeSelect(s.size.name)}
                className={`
                  px-4 py-3 text-sm font-medium rounded-lg border-2 transition-all duration-200
                  ${
                    selectedSize === s.size.name
                      ? "border-gray-900 bg-gray-900 text-white shadow-md transform scale-95"
                      : sizeError
                      ? "border-red-300 hover:border-red-400 focus:ring-red-500 text-gray-700 animate-pulse"
                      : "border-gray-200 hover:border-gray-300 focus:ring-gray-500 text-gray-700 hover:bg-gray-50"
                  }
                  focus:outline-none focus:ring-2 focus:ring-offset-2
                  min-w-[3rem] text-center
                `}
              >
                {s.size.name}
              </button>
            ))}
          </div>
        </div>

        {/* Quantity Selector */}
        <div>
          <label className="block text-base font-medium text-gray-900 mb-3">
            Quantity ({quantity} in cart)
          </label>
          <div className="flex items-center gap-4">
            <div className="flex items-center bg-gray-100 rounded-full">
              <button
                onClick={() => handleQuantityChange(quantity - 1)}
                disabled={quantity <= 1}
                className="w-10 h-10 flex items-center justify-center hover:bg-gray-200 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20 12H4"
                  />
                </svg>
              </button>
              <span className="w-12 text-center font-medium">{quantity}</span>
              <button
                onClick={() => handleQuantityChange(quantity + 1)}
                className="w-10 h-10 flex items-center justify-center hover:bg-gray-200 rounded-full transition-colors"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Add to Cart Button */}
        <div className="space-y-3">
          <button
            onClick={handleAddToBag}
            disabled={isAdding || isAdded}
            className={`
              w-full py-4 px-6 rounded-full font-semibold text-base transition-all duration-300
              relative overflow-hidden group
              ${
                isAdded
                  ? "bg-green-500 text-white transform scale-105"
                  : isAdding
                  ? "bg-gray-400 text-white cursor-wait"
                  : "bg-white border-2 border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white"
              }
              disabled:cursor-not-allowed
              shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98]
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
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 11V7a4 4 0 00-8 0v4M5 9h14l-1 12H6L5 9z"
                    />
                  </svg>
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full animate-ping"></div>
                </div>
              </div>
            )}

            {/* Success checkmark with bounce */}
            {isAdded && (
              <div className="absolute left-6 top-1/2 transform -translate-y-1/2 animate-bounce">
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
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
              {isAdded
                ? "Added to Cart!"
                : isAdding
                ? "Adding..."
                : "Add to Cart"}
            </span>

            {/* Background animation for success */}
            {isAdded && (
              <div className="absolute inset-0 bg-green-400 animate-ping opacity-20 rounded-full"></div>
            )}
          </button>

          {/* Buy It Now Button */}
          <button
            onClick={() => {
              if (!selectedSize) {
                handleSizeRequired();
                return;
              }
              // Handle buy now logic
              console.log("Buy now clicked");
            }}
            className="w-full bg-gray-900 text-white py-4 px-6 rounded-full font-semibold text-base hover:bg-gray-800 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98]"
          >
            Buy It Now
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
        `}</style>
      </div>

      <CartDrawerPortal
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
      />
    </>
  );
}
