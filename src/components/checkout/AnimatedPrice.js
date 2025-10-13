// src/components/checkout/AnimatedPrice.js
"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";

const AnimatedPrice = ({ value, label, prefix = "₹" }) => {
  const [displayValue, setDisplayValue] = useState(value);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (Math.abs(displayValue - value) > 0.01) {
      setIsAnimating(true);
      const timer = setTimeout(() => {
        setDisplayValue(value);
        setIsAnimating(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [value, displayValue]);

  return (
    <div
      className={`flex justify-between text-sm ${
        isAnimating ? "animate-pulse" : ""
      }`}
    >
      <span className="text-gray-600">{label}</span>
      <motion.span
        key={displayValue}
        initial={isAnimating ? { opacity: 0.5, scale: 0.9 } : {}}
        animate={isAnimating ? { opacity: 1, scale: 1 } : {}}
        transition={{ duration: 0.3 }}
        className={`font-semibold ${
          isAnimating ? "text-blue-600" : "text-gray-900"
        }`}
      >
        {prefix}
        {displayValue.toFixed(2)}
      </motion.span>
    </div>
  );
};

export default AnimatedPrice;