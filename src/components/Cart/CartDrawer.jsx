"use client";
import { useEffect, useState, useRef } from "react";
import { useCart } from "@/context/CartContext";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import Image from "next/image";
import Link from "next/link";

export default function CartDrawer({ isOpen, onClose }) {
  const {
    items,
    totalItems,
    totalPrice,
    updateQuantity,
    removeFromCart,
    loading,
  } = useCart();
  const [isDesktop, setIsDesktop] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragControls = useDragControls();
  const constraintsRef = useRef(null);

  // Handle screen size detection
  useEffect(() => {
    const checkScreenSize = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };

    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);

    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  // Handle escape key and body scroll
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") onClose();
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  const handleQuantityChange = (productId, size, newQuantity) => {
    if (newQuantity < 1) {
      removeFromCart(productId, size);
    } else {
      updateQuantity(productId, size, newQuantity);
    }
  };

  const handleDragEnd = (event, info) => {
    const velocity = info.velocity.y;
    const dragDistance = info.offset.y;

    // If dragging down significantly or with high downward velocity, minimize
    if (dragDistance > 100 || velocity > 300) {
      setIsFullScreen(false);
    }
    // If dragging up significantly or with high upward velocity, maximize
    else if (dragDistance < -100 || velocity < -300) {
      setIsFullScreen(true);
    }

    setIsDragging(false);
  };

  const toggleFullScreen = () => {
    setIsFullScreen(!isFullScreen);
  };

  return (
    <div className="w-full h-full">
      <AnimatePresence mode="wait">
        {isOpen && (
          <>
            {/* Backdrop with fade animation */}
            <motion.div
              initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
              animate={{ opacity: 1, backdropFilter: "blur(2px)" }}
              exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="fixed inset-0 h-[100vh] bg-[#636364bd] z-50"
              onClick={onClose}
            />

            {/* Cart Drawer with slide animation */}
            <motion.div
              ref={constraintsRef}
              initial={{
                x: isDesktop ? "100%" : 0,
                y: isDesktop ? 0 : "-100%",
              }}
              animate={{
                x: 0,
                y: 0,
                height:
                  !isDesktop && isFullScreen
                    ? "100vh"
                    : !isDesktop
                    ? "60vh"
                    : "100vh",
              }}
              exit={{
                x: isDesktop ? "100%" : 0,
                y: isDesktop ? 0 : "-100%",
              }}
              transition={{
                type: "spring",
                stiffness: 200,
                damping: 18,
                mass: 0.6,
                restDelta: 0.001,
                restSpeed: 0.001,
              }}
              drag={!isDesktop ? "y" : false}
              dragControls={dragControls}
              dragConstraints={{
                top: isFullScreen ? 0 : -window.innerHeight * 0.4,
                bottom: isFullScreen ? window.innerHeight * 0.4 : 0,
              }}
              dragElastic={0.1}
              onDragStart={() => setIsDragging(true)}
              onDragEnd={handleDragEnd}
              className={`
              fixed z-[60] bg-white shadow-2xl flex flex-col
              ${
                isDesktop
                  ? "top-0 right-0 h-screen w-full max-w-md"
                  : `top-0 left-0 w-screen rounded-b-2xl ${
                      isFullScreen ? "h-screen rounded-none" : "h-[60vh]"
                    }`
              }
              ${isDragging ? "cursor-grabbing" : ""}
            `}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header with fade-in animation */}
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.3 }}
                className={`flex items-center justify-between p-1 px-6 lg:p-6 border-b border-gray-100 bg-white flex-shrink-0 ${
                  !isDesktop && isFullScreen ? "pt-2" : ""
                }`}
              >
                <div>
                  <h2 className="text-xl lg:text-2xl font-bold text-gray-900">
                    Cart
                  </h2>
                  <AnimatePresence>
                    {totalItems > 0 && (
                      <motion.p
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="text-sm text-gray-500 mt-1"
                      >
                        {totalItems} {totalItems === 1 ? "item" : "items"}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors group"
                >
                  <motion.svg
                    whileHover={{ rotate: 90 }}
                    transition={{ duration: 0.2 }}
                    className="w-6 h-6 text-gray-400 group-hover:text-gray-600"
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
                  </motion.svg>
                </button>
              </motion.div>

              {/* Free Shipping Banner with slide animation */}
              <AnimatePresence>
                {totalPrice > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="py-3 flex-shrink-0 overflow-hidden"
                  >
                    <div className="flex items-center justify-center text-sm text-green-700">
                      <svg
                        className="w-4 h-4 mr-2"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                      You are eligible for free shipping
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Cart Items - Scrollable Area */}
              <div className="flex-1 overflow-hidden overflow-y-auto min-h-0">
                <AnimatePresence>
                  {loading && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center justify-center py-12"
                    >
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{
                          duration: 1,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                        className="rounded-full h-10 w-10 border-2 border-gray-300 border-t-gray-900"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                {!loading && items.length === 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.4 }}
                    className="text-center py-16 px-6 h-full flex flex-col justify-center"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{
                        delay: 0.4,
                        type: "spring",
                        stiffness: 200,
                      }}
                      className="w-20 h-20 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center"
                    >
                      <svg
                        className="w-10 h-10 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M16 11V7a4 4 0 00-8 0v4M5 9h14l-1 12H6L5 9z"
                        />
                      </svg>
                    </motion.div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Your cart is empty
                    </h3>
                    <p className="text-gray-500 text-sm mb-6">
                      Add some beautiful jewelry to get started!
                    </p>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={onClose}
                      className="bg-gray-900 text-white px-6 py-3 rounded-full text-sm font-medium hover:bg-gray-800 transition-colors mx-auto"
                    >
                      Continue Shopping
                    </motion.button>
                  </motion.div>
                )}

                {/* Cart Items List with staggered animation */}
                <AnimatePresence>
                  {items.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.2, duration: 0.3 }}
                      className="p-4 pt-0 lg:p-6 space-y-4"
                    >
                      {items.map((item, index) => (
                        <motion.div
                          key={`${item.productId}-${item.size}`}
                          initial={{ opacity: 0, x: 50 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -50, height: 0 }}
                          transition={{
                            delay: index * 0.1,
                            duration: 0.3,
                            ease: "easeOut",
                          }}
                          layout
                          className="group"
                        >
                          <div className="flex gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                            {/* Product Image */}
                            <motion.div
                              whileHover={{ scale: 1.05 }}
                              className="w-20 h-20 lg:w-24 lg:h-24 bg-white rounded-lg overflow-hidden flex-shrink-0 shadow-sm"
                            >
                              {item.image ? (
                                <Image
                                  src={item.image}
                                  alt={item.name}
                                  width={96}
                                  height={96}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                                  <svg
                                    className="w-8 h-8 text-gray-400"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                    />
                                  </svg>
                                </div>
                              )}
                            </motion.div>

                            {/* Product Details */}
                            <div className="flex-1 min-w-0">
                              <Link
                                href={`/products/${item.slug}`}
                                className="block hover:text-gray-600 transition-colors"
                                onClick={onClose}
                              >
                                <h3 className="font-medium text-gray-900 text-base lg:text-lg leading-tight">
                                  {item.name}
                                </h3>
                              </Link>

                              <div className="flex items-center justify-between mt-2">
                                <div>
                                  <p className="text-sm text-gray-500">
                                    Size: {item.size}
                                  </p>
                                  <p className="text-base font-semibold text-gray-900 mt-1">
                                    ₹{item.price.toFixed(2)}
                                  </p>
                                </div>

                                {/* Remove Button */}
                                <motion.button
                                  initial={{ opacity: 0, scale: 0.8 }}
                                  animate={{ opacity: 1, scale: 0.8 }}
                                  whileHover={{
                                    opacity: 1,
                                    scale: 1,
                                    backgroundColor: "rgb(255, 255, 255)",
                                  }}
                                  whileTap={{ scale: 0.9 }}
                                  onClick={() =>
                                    removeFromCart(item.productId, item.size)
                                  }
                                  className="p-2 rounded-full transition-colors group-hover:opacity-100"
                                >
                                  <motion.svg
                                    whileHover={{ color: "rgb(239, 68, 68)" }}
                                    className="w-5 h-5 text-gray-400"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                    />
                                  </motion.svg>
                                </motion.button>
                              </div>

                              {/* Quantity Controls */}
                              <div className="flex items-center justify-between mt-4">
                                <div className="flex items-center gap-3 bg-white rounded-full p-1 shadow-sm">
                                  <motion.button
                                    whileHover={{
                                      scale: 1.1,
                                      backgroundColor: "rgb(243, 244, 246)",
                                    }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() =>
                                      handleQuantityChange(
                                        item.productId,
                                        item.size,
                                        item.quantity - 1
                                      )
                                    }
                                    className="w-8 h-8 flex items-center justify-center rounded-full transition-colors"
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
                                  </motion.button>
                                  <motion.span
                                    key={item.quantity}
                                    initial={{
                                      scale: 1.2,
                                      color: "rgb(34, 197, 94)",
                                    }}
                                    animate={{
                                      scale: 1,
                                      color: "rgb(0, 0, 0)",
                                    }}
                                    transition={{ duration: 0.2 }}
                                    className="w-10 text-center text-sm font-medium"
                                  >
                                    {item.quantity}
                                  </motion.span>
                                  <motion.button
                                    whileHover={{
                                      scale: 1.1,
                                      backgroundColor: "rgb(243, 244, 246)",
                                    }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() =>
                                      handleQuantityChange(
                                        item.productId,
                                        item.size,
                                        item.quantity + 1
                                      )
                                    }
                                    className="w-8 h-8 flex items-center justify-center rounded-full transition-colors"
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
                                  </motion.button>
                                </div>

                                <p className="text-base font-medium text-gray-900">
                                  ₹{(item.price * item.quantity).toFixed(2)}
                                </p>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Footer - Checkout Section with slide-up animation */}
              <AnimatePresence>
                {items.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: isDesktop ? 50 : -50}}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: isDesktop ? 50 : -50 }}
                    transition={{ delay: 0.1, duration: 0.4 }}
                    className="border-t rounded-full border-gray-100 p-4 pb-0 lg:p-6 bg-white flex-shrink-0"
                  >
                    {/* Total */}
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-lg lg:text-xl font-medium text-gray-900">
                        Total
                      </span>
                      <motion.span
                        key={totalPrice}
                        initial={{ scale: 1.1, color: "rgb(34, 197, 94)" }}
                        animate={{ scale: 1, color: "rgb(17, 24, 39)" }}
                        transition={{ duration: 0.3 }}
                        className="text-xl lg:text-2xl font-bold"
                      >
                        ₹{totalPrice.toFixed(2)}
                      </motion.span>
                    </div>

                    <p className="text-xs text-gray-500 text-center mb-4">
                      Taxes and shipping calculated at checkout
                    </p>

                    {/* Checkout Button */}
                    <Link
                      href="/checkout"
                      onClick={onClose}
                      className="w-full block"
                    >
                      <motion.div
                        whileHover={{
                          scale: 1.02,
                          backgroundColor: "rgb(31, 41, 55)",
                          boxShadow:
                            "0 10px 25px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
                        }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full bg-gray-900 text-white py-4 px-6 rounded-full font-medium text-center transition-colors shadow-lg text-base lg:text-lg cursor-pointer"
                      >
                        Checkout
                      </motion.div>
                    </Link>
                    {/* Mobile Drag Handle - Only show on mobile */}
                    {!isDesktop && (
                      <motion.div
                        className="flex-shrink-0 py-2 bg-white rounded-t-2xl flex flex-col items-center cursor-grab active:cursor-grabbing"
                        onPointerDown={(e) => dragControls.start(e)}
                        whileTap={{ scale: 0.95 }}
                      >
                        {/* Drag Handle Bar */}
                        <div className="w-12 h-1 bg-gray-300 rounded-full" />

                        {/* Expand/Collapse Button */}
                        <motion.button
                          onClick={toggleFullScreen}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className=""
                        >
                          <motion.svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            animate={{ rotate: isFullScreen ? 0 : 180 }}
                            transition={{ duration: 0.3 }}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M7 14l5-5 5 5"
                            />
                          </motion.svg>
                        </motion.button>
                      </motion.div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
