"use client";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { useSwipeable } from "react-swipeable";

export default function OrderSummary({ items, totalPrice, totalItems }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const contentRef = useRef(null);
  const [height, setHeight] = useState("0px");

  useEffect(() => {
    if (contentRef.current) {
      setHeight(isExpanded ? `${contentRef.current.scrollHeight}px` : "0px");
    }
  }, [isExpanded]);

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  const handlers = useSwipeable({
    onSwipedUp: () => setIsExpanded(false),
    onSwipedDown: () => setIsExpanded(true),
    preventScrollOnSwipe: true,
    trackTouch: true,
    trackMouse: true,
  });

  return (
    <>
      {/* Mobile Layout - Only visible on small screens */}
      <div
        className="lg:hidden bg-white border-b border-gray-200 rounded-b-2xl"
        {...handlers}
      >
        {/* Mobile Header - Always Visible */}
        <div
          onClick={toggleExpanded}
          className="flex items-center justify-between p-4 cursor-pointer active:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <svg
              className="w-5 h-5 text-gray-600"
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
            <div>
              <span className="font-semibold text-gray-900">Order Summary</span>
              <p className="text-sm text-gray-500">
                {totalItems} {totalItems === 1 ? "item" : "items"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="font-bold text-gray-900">
                ₹{totalPrice.toFixed(2)}
              </p>
              <p className="text-xs text-green-600">Free shipping</p>
            </div>
            <div className="relative w-5 h-5">
              <span
                className={`ico-plus ${isExpanded ? "open" : ""}`}
                style={{ color: "#6B7280" }}
              />
            </div>
          </div>
        </div>

        {/* Mobile Expanded Content */}
        <div
          ref={contentRef}
          style={{ maxHeight: height }}
          className="overflow-hidden transition-all duration-700 ease-in-out rounded-b-2xl"
        >
          <div className="border-t border-gray-100 rounded-b-2xl">
            <MobileOrderContent items={items} totalPrice={totalPrice} />
          </div>
        </div>

        <style jsx>{`
          .ico-plus {
            position: relative;
            width: 20px;
            height: 20px;
            display: inline-block;
            flex-shrink: 0;
          }

          .ico-plus::before,
          .ico-plus::after {
            content: "";
            position: absolute;
            background-color: currentColor;
            transition: all 0.3s ease;
          }

          .ico-plus::before {
            width: 20px;
            height: 2px;
            top: 9px;
            left: 0;
          }

          .ico-plus::after {
            width: 2px;
            height: 20px;
            left: 9px;
            top: 0;
          }

          .ico-plus.open::after {
            transform: rotate(90deg);
            opacity: 0;
          }
        `}</style>
      </div>

      {/* Desktop Layout - Only visible on larger screens */}
      <div className="hidden lg:block bg-gray-50  p-6 sticky top-6 h-fit">
        <h3 className="text-xl font-bold text-gray-900 mb-6">Order Summary</h3>

        {/* Desktop Items List */}
        <div className="space-y-4 mb-6 max-h-80 overflow-y-auto">
          {items.map((item) => (
            <DesktopOrderItem
              key={`${item.productId}-${item.size}`}
              item={item}
            />
          ))}
        </div>

        {/* Desktop Price Breakdown */}
        <DesktopPriceBreakdown totalPrice={totalPrice} />
      </div>
    </>
  );
}

function MobileOrderContent({ items, totalPrice }) {
  return (
    <div className="p-4 space-y-4 rounded-b-2xl">
      {/* Items List */}
      <div className="space-y-3 max-h-64 overflow-y-auto">
        {items.map((item, index) => (
          <motion.div
            key={`${item.productId}-${item.size}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="flex gap-3 p-3 bg-gray-50 rounded-lg"
          >
            <ProductImage item={item} size="w-12 h-12" />
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-gray-900 text-sm leading-tight line-clamp-1">
                {item.name}
              </h4>
              <div className="flex items-center justify-between mt-1">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span>Size: {item.size}</span>
                  <span>•</span>
                  <span>Qty: {item.quantity}</span>
                </div>
                <p className="text-sm font-semibold text-gray-900">
                  ₹{(item.price * item.quantity).toFixed(2)}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Mobile Price Breakdown */}
      <MobilePriceBreakdown totalPrice={totalPrice} />
    </div>
  );
}

function DesktopOrderItem({ item }) {
  return (
    <div className="flex gap-3">
      <ProductImage item={item} size="w-16 h-16" />
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-gray-900 text-sm leading-tight">
          {item.name}
        </h4>
        <p className="text-xs text-gray-500 mt-1">
          Size: {item.size} • Qty: {item.quantity}
        </p>
        <p className="text-sm font-semibold text-gray-900 mt-1">
          ₹{(item.price * item.quantity).toFixed(2)}
        </p>
      </div>
    </div>
  );
}

function ProductImage({ item, size }) {
  return (
    <div
      className={`${size} bg-gray-100 rounded-lg overflow-hidden flex-shrink-0`}
    >
      {item.image ? (
        <Image
          src={item.image}
          alt={item.name}
          width={64}
          height={64}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full bg-gray-200 flex items-center justify-center">
          <svg
            className="w-6 h-6 text-gray-400"
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
    </div>
  );
}

function MobilePriceBreakdown({ totalPrice }) {
  return (
    <div className="space-y-3">
      {/* Price Details */}
      <div className="border-t border-gray-100 pt-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Subtotal</span>
          <span className="text-gray-900">₹{totalPrice.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Shipping</span>
          <span className="text-green-600 font-medium">Free</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Tax</span>
          <span className="text-gray-900">₹0.00</span>
        </div>
        <div className="border-t border-gray-100 pt-2 flex justify-between font-bold">
          <span className="text-gray-900">Total</span>
          <span className="text-gray-900">₹{totalPrice.toFixed(2)}</span>
        </div>
      </div>

      {/* Security Badge */}
      <div className="flex items-center justify-center text-xs text-gray-500 pt-2">
        <svg
          className="w-4 h-4 mr-2 text-green-600"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clipRule="evenodd"
          />
        </svg>
        Secure checkout with SSL encryption
      </div>
      <div className="flex flex-col items-center justify-center mt-0 text-gray-500">
        <motion.svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          initial={{ y: 5, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            repeatType: "reverse",
          }}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 7l5-5 5 5"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 14l5-5 5 5"
          />
        </motion.svg>
      </div>
    </div>
  );
}

function DesktopPriceBreakdown({ totalPrice }) {
  return (
    <div className="space-y-4">
      {/* Price Details */}
      <div className="border-t pt-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Subtotal</span>
          <span className="text-gray-900">₹{totalPrice.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Shipping</span>
          <span className="text-green-600">Free</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Tax</span>
          <span className="text-gray-900">₹0.00</span>
        </div>
        <div className="border-t pt-2 flex justify-between font-bold text-lg">
          <span className="text-gray-900">Total</span>
          <span className="text-gray-900">₹{totalPrice.toFixed(2)}</span>
        </div>
      </div>

      {/* Free Shipping Badge */}
      <div className="flex items-center justify-center text-sm text-green-700 bg-green-50 rounded-lg p-3">
        <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clipRule="evenodd"
          />
        </svg>
        You get free shipping!
      </div>

      {/* Security Badge */}
      <div className="flex items-center justify-center text-xs text-gray-500">
        <svg
          className="w-4 h-4 mr-2 text-green-600"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clipRule="evenodd"
          />
        </svg>
        Secure checkout powered by WhatsApp verification
      </div>
    </div>
  );
}
