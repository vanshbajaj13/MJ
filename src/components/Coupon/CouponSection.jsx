// components/Coupon/CouponSection.jsx - Enhanced with better error handling and guest support
"use client";
import { motion, AnimatePresence } from "framer-motion";

export default function CouponSection({
  appliedCoupon,
  showInput,
  setShowInput,
  couponCode,
  handleInputChange,
  handleKeyPress,
  handleApplyCoupon,
  handleRemoveCoupon,
  couponLoading,
  error,
  success,
  user,
  totalDiscount,
  isMobile = false,
}) {
  return (
    <div className="space-y-3">
      {/* Success Message */}
      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="bg-green-50 border border-green-200 rounded-lg p-3"
          >
            <div className="flex items-center gap-2">
              <svg
                className="w-4 h-4 text-green-600"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-green-800 text-sm font-medium">
                {success}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {appliedCoupon && appliedCoupon.couponId ? (
          /* Applied Coupon Display */
          <motion.div
            key="applied"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`bg-green-50 border border-green-200 rounded-lg px-4 py-1 transition-opacity ${
              couponLoading ? "opacity-60" : "opacity-100"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-green-900 text-sm">
                      {appliedCoupon.code}
                    </span>
                    <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-medium">
                      {appliedCoupon.type === "percentage"
                        ? `${appliedCoupon.value}% OFF`
                        : appliedCoupon.type === "fixed"
                        ? `₹${appliedCoupon.value} OFF`
                        : "FREE SHIPPING"}
                    </span>
                  </div>
                  {appliedCoupon.description && (
                    <p className="text-green-700 text-xs mt-1">
                      {appliedCoupon.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-green-900 font-semibold text-sm">
                  -₹{totalDiscount.toFixed(2)}
                </span>
                <button
                  onClick={handleRemoveCoupon}
                  disabled={couponLoading}
                  className="p-1.5 text-green-600 hover:text-green-800 hover:bg-green-100 rounded-full transition-colors disabled:opacity-50"
                >
                  {couponLoading ? (
                    <svg
                      className="w-4 h-4 animate-spin"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                  ) : (
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
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        ) : showInput ? (
          /* Coupon Input */
          <motion.div
            key="input"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3"
          >
            <div className="flex gap-2">
              <input
                type="text"
                value={couponCode}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                placeholder="Enter coupon code"
                maxLength={20}
                className={`flex-1 px-4 py-3 border rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent outline-none transition-all ${
                  error
                    ? "border-red-500 bg-red-50 focus:ring-red-500"
                    : "border-gray-300 bg-white hover:border-gray-400"
                }`}
                disabled={couponLoading}
              />
              <button
                onClick={handleApplyCoupon}
                disabled={couponLoading || !couponCode.trim()}
                className={`px-6 py-3 rounded-lg font-medium transition-all whitespace-nowrap ${
                  couponLoading || !couponCode.trim()
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-gray-900 hover:bg-gray-800 text-white shadow-sm hover:shadow-md"
                }`}
              >
                {couponLoading ? "..." : "Apply"}
              </button>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <svg
                    className="w-4 h-4 text-red-600 mt-0.5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-red-800 text-sm">{error}</span>
                </div>
              </div>
            )}
          </motion.div>
        ) : (
          /* Toggle Button */
          <div className="text-center">
            <button
              onClick={() => setShowInput(true)}
              className="text-sm text-gray-600 hover:text-gray-800 transition-colors flex items-center mx-auto gap-1.5 py-2 px-3 hover:bg-gray-50 rounded-lg"
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
                  d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                />
              </svg>
              Have a coupon code?
            </button>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
