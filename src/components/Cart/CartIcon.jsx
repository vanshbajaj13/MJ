"use client";
import { useState } from "react";
import { useCart } from "@/context/CartContext";
import CartDrawerPortal from "./CartDrawerPortal";

export default function CartIcon() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const { totalItems } = useCart();

  return (
    <>
      <button
        onClick={() => setIsDrawerOpen(true)}
        className="relative p-2 hover:bg-gray-100 rounded-full transition-colors"
        aria-label={`Shopping cart with ${totalItems} items`}
      >
        <svg
          className="w-6 h-6 text-gray-700"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M16 11V7a4 4 0 00-8 0v4M5 9h14l-1 12H6L5 9z"
          />
        </svg>
        
        {/* Badge */}
        {totalItems > 0 && (
          <span className="absolute -top-1 -right-1 bg-black text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center min-w-[20px]">
            {totalItems > 99 ? "99+" : totalItems}
          </span>
        )}
      </button>

      <CartDrawerPortal
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
      />
    </>
  );
}