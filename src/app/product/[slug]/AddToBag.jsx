"use client";

import { useState } from "react";

export default function BagSlideButton() {
  const [isAdding, setIsAdding] = useState(false);
  const [isAdded, setIsAdded] = useState(false);

  const handleClick = () => {
    if (isAdding || isAdded) return;
    setIsAdding(true);

    // After cart finishes sliding, show "Added!" text
    setTimeout(() => {
      setIsAdding(false);
      setIsAdded(true);
      setTimeout(() => setIsAdded(false), 1000);
    }, 1200);
  };

  return (
    <div className="relative w-full">
      <button
        onClick={handleClick}
        disabled={isAdding || isAdded}
        className={`
          w-full bg-white px-6 py-4 rounded-md font-medium transition-all duration-300 shadow-lg
          disabled:cursor-not-allowed min-w-52 transform relative overflow-hidden
        `}
      >
        {/* Cart Icon with sliding animation */}
        <div
          className={`
            absolute left-6 top-1/2 transform -translate-y-1/2 z-10 font-bold text-black
            ${isAdding ? "animate-slide-cart" : "opacity-100"}
            ${isAdded ? "opacity-0" : ""}
          `}
          style={{
            animation: isAdding ? "leftToRightAndBack 1.2s ease-out" : "none",
          }}
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M7 18c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12L8.1 13h7.45c.75 0 1.41-.41 1.75-1.03L21.7 4H5.21l-.94-2H1zm16 16c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
          </svg>
        </div>

        <span
          className={`ml-8 transition-opacity duration-300 text-black font-bold ${
            isAdding ? "opacity-0" : "opacity-100"
          } ${isAdded ? "animate-bounce" : ""}`}
        >
          {isAdded ? "Added!" : "Add to Cart"}
        </span>

        {isAdded && (
          <div className="absolute right-6 top-1/2 transform -translate-y-1/2">
            <svg
              className="w-6 h-6 text-green-400"
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
      </button>

      <style jsx>{`
        @keyframes leftToRightAndBack {
          0% {
            transform: translateX(0) translateY(-50%);
          }
          50% {
            transform: translateX(70vw) translateY(-50%);
          }
          51% {
            transform: translateX(-50px) translateY(-50%);
            opacity:0;
          }
          90%{
            transform: translateX(-40px) translateY(-50%);
            opacity:0;
          }
          100% {
            transform: translateX(0) translateY(-50%);
            opacity:1;
          }
        }
        @media (min-width: 1024px) {
        @keyframes leftToRightAndBack {
          0% {
            transform: translateX(0) translateY(-50%);
          }
          50% {
            transform: translateX(40vw) translateY(-50%);
          }
          51% {
            transform: translateX(-50px) translateY(-50%);
            opacity:0;
          }
          90%{
            transform: translateX(-40px) translateY(-50%);
            opacity:0;
          }
          100% {
            transform: translateX(0) translateY(-50%);
            opacity:1;
          }
        }
        }
      `}</style>
    </div>
  );
}
