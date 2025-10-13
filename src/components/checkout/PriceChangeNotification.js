// src/components/checkout/PriceChangeNotification.js
"use client";
import { useEffect } from "react";
import { motion } from "framer-motion";

const PriceChangeNotification = ({ priceChanges, onDismiss }) => {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 5000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-4 flex items-start gap-3"
    >
      <svg
        className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>

      <div className="flex-1 min-w-0">
        <p className="font-semibold text-blue-900 text-sm">
          Your order pricing has been updated
        </p>
        <p className="text-xs text-blue-700 mt-1">
          {priceChanges.length} price change
          {priceChanges.length > 1 ? "s" : ""} applied to reflect latest rates
        </p>
      </div>

      <button
        onClick={onDismiss}
        className="text-blue-600 hover:text-blue-900 mt-0.5 flex-shrink-0"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M4.293 4.293a1 1 0 011.414-1.414L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>
    </motion.div>
  );
};

export default PriceChangeNotification;