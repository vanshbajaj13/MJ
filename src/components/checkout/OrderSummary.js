// components/OrderSummary.jsx - Unified with integrated coupon system
"use client";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { useSwipeable } from "react-swipeable";
import { useCart } from "@/context/CartContext";
import { useUser } from "@/context/UserContext";
import CouponSection from "../Coupon/CouponSection";

export default function OrderSummary({ items}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [showCouponInput, setShowCouponInput] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const contentRef = useRef(null);
  const [height, setHeight] = useState("0px");

  const {
    appliedCoupon,
    couponLoading,
    applyCoupon,
    removeCoupon,
    subtotal,
    totalDiscount,
    shippingDiscount,
    finalTotal,
    itemDiscounts,
    totalItems,
  } = useCart();

  const { user } = useUser();

  useEffect(() => {
    if (contentRef.current) {
      setHeight(isExpanded ? `${contentRef.current.scrollHeight}px` : "0px");
    }
  }, [isExpanded, appliedCoupon, showCouponInput]);

  useEffect(() => {
    setShowCouponInput(!appliedCoupon);
    setError("");
    if (appliedCoupon) {
      setSuccess("Coupon applied successfully!");
      const timer = setTimeout(() => setSuccess(""), 3000);
      return () => clearTimeout(timer);
    }
  }, [appliedCoupon]);

  const handlers = useSwipeable({
    onSwipedUp: () => setIsExpanded(false),
    onSwipedDown: () => setIsExpanded(true),
    preventScrollOnSwipe: true,
    trackTouch: true,
    trackMouse: true,
  });

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      setError("Please enter a coupon code");
      return;
    }

    setError("");
    setSuccess("");

    try {
      const result = await applyCoupon(couponCode.trim());
      setCouponCode("");
      if (result?.message) {
        setSuccess(result.message);
        setTimeout(() => setSuccess(""), 3000);
      }
    } catch (err) {
      setError(err.message || "Failed to apply coupon");
      setTimeout(() => setError(""), 5000);
    }
  };

  const handleRemoveCoupon = async () => {
    setError("");
    setSuccess("");

    try {
      await removeCoupon();
      setShowCouponInput(false);
    } catch (err) {
      setError(err.message || "Failed to remove coupon");
      setTimeout(() => setError(""), 5000);
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    setCouponCode(value);
    setError("");
    setSuccess("");
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !couponLoading && couponCode.trim()) {
      handleApplyCoupon();
    }
  };

  const getItemDiscount = (item) => {
    if (!itemDiscounts) return 0;
    const itemKey = `${item.productId}-${item.size}`;
    return itemDiscounts[itemKey] || 0;
  };

  const getDiscountedPrice = (item) => {
    const discount = getItemDiscount(item);
    const originalTotal = item.price * item.quantity;
    return originalTotal - discount;
  };

  return (
    <>
      {/* Mobile Layout */}
      <div
        className="lg:hidden bg-white border-b border-gray-200 rounded-b-2xl"
        {...handlers}
      >
        {/* Mobile Header */}
        <div
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center justify-between p-4 py-0 cursor-pointer active:bg-gray-50 transition-colors"
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
                ₹{finalTotal.toFixed(2)}
              </p>
              {totalDiscount > 0 && (
                <p className="text-xs text-gray-500 line-through">
                  ₹{subtotal.toFixed(2)}
                </p>
              )}
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
          className="overflow-hidden transition-all duration-700 ease-in-out"
        >
          <div className="border-t border-gray-100 p-4 space-y-4">
            <MobileContent
              items={items}
              appliedCoupon={appliedCoupon}
              getItemDiscount={getItemDiscount}
              getDiscountedPrice={getDiscountedPrice}
              showCouponInput={showCouponInput}
              setShowCouponInput={setShowCouponInput}
              couponCode={couponCode}
              handleInputChange={handleInputChange}
              handleKeyPress={handleKeyPress}
              handleApplyCoupon={handleApplyCoupon}
              handleRemoveCoupon={handleRemoveCoupon}
              couponLoading={couponLoading}
              error={error}
              success={success}
              user={user}
              subtotal={subtotal}
              totalDiscount={totalDiscount}
              finalTotal={finalTotal}
            />
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

      {/* Desktop Layout */}
      <div className="hidden lg:block bg-gray-50 p-6 pt-0 pr-1">
        <h3 className="text-xl font-bold text-gray-900 ">Order Summary</h3>
        <p className="text-sm text-gray-500 mb-4">
          {totalItems} {totalItems === 1 ? "item" : "items"}
        </p>
        {/* Items List */}
        <div className="space-y-4 flex-1 mb-6 max-h-[20vh] overflow-y-auto">
          {items.map((item) => (
            <DesktopOrderItem
              key={`${item.productId}-${item.size}`}
              item={item}
              discount={getItemDiscount(item)}
              discountedPrice={getDiscountedPrice(item)}
            />
          ))}
        </div>

        {/* Coupon Section */}
          <div className="mb-6">
            <CouponSection
              appliedCoupon={appliedCoupon}
              showInput={showCouponInput}
              setShowInput={setShowCouponInput}
              couponCode={couponCode}
              handleInputChange={handleInputChange}
              handleKeyPress={handleKeyPress}
              handleApplyCoupon={handleApplyCoupon}
              handleRemoveCoupon={handleRemoveCoupon}
              couponLoading={couponLoading}
              error={error}
              success={success}
              user={user}
              totalDiscount={totalDiscount}
            />
          </div>

        {/* Price Breakdown */}
        <PriceBreakdown
          subtotal={subtotal}
          appliedCoupon={appliedCoupon}
          totalDiscount={totalDiscount}
          finalTotal={finalTotal}
        />
      </div>
    </>
  );
}

function MobileContent({
  items,
  appliedCoupon,
  getItemDiscount,
  getDiscountedPrice,
  showCouponInput,
  setShowCouponInput,
  couponCode,
  handleInputChange,
  handleKeyPress,
  handleApplyCoupon,
  handleRemoveCoupon,
  couponLoading,
  error,
  success,
  user,
  subtotal,
  totalDiscount,
  finalTotal,
}) {
  return (
    <>
      {/* Items List */}
      <div className="space-y-3 max-h-[20vh] overflow-y-auto scrollbar-hide">
        {/* Coupon Section */}
          <div className="border-t border-gray-100 py-1 px-3">
            <CouponSection
              appliedCoupon={appliedCoupon}
              showInput={showCouponInput}
              setShowInput={setShowCouponInput}
              couponCode={couponCode}
              handleInputChange={handleInputChange}
              handleKeyPress={handleKeyPress}
              handleApplyCoupon={handleApplyCoupon}
              handleRemoveCoupon={handleRemoveCoupon}
              couponLoading={couponLoading}
              error={error}
              success={success}
              user={user}
              totalDiscount={totalDiscount}
              isMobile={true}
            />
          </div>
        {items.map((item, index) => (
          <motion.div
            key={`${item.productId}-${item.size}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="flex gap-3 mt-0 p-3 bg-gray-50 border-b border-gray-300"
          >
            <ProductImage item={item} size="w-12 h-cover" />

            {/* Content */}
            <div className="flex-1 min-w-0 flex justify-between">
              {/* Left side: name + size/qty */}
              <div className="flex flex-col">
                <h4 className="font-medium text-gray-900 text-sm leading-tight line-clamp-1">
                  {item.name}
                </h4>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span>Size: {item.size}</span>
                  <span>•</span>
                  <span>Qty: {item.quantity}</span>
                </div>
              </div>

              {/* Right side: prices */}
              <div className="flex flex-col items-end justify-center">
                {getItemDiscount(item) > 0 ? (
                  <>
                    <p className="text-sm font-semibold text-green-600">
                      ₹{getDiscountedPrice(item).toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500 line-through">
                      ₹{(item.price * item.quantity).toFixed(2)}
                    </p>
                    <p className="text-xs text-green-600">
                      -₹{getItemDiscount(item).toFixed(2)}
                    </p>
                  </>
                ) : (
                  <p className="text-sm font-semibold text-gray-900">
                    ₹{(item.price * item.quantity).toFixed(2)}
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Mobile Price Breakdown */}
      <PriceBreakdown
        subtotal={subtotal}
        appliedCoupon={appliedCoupon}
        totalDiscount={totalDiscount}
        finalTotal={finalTotal}
        isMobile={true}
      />
    </>
  );
}

function DesktopOrderItem({ item, discount, discountedPrice }) {
  return (
    <div className="flex gap-3 p-3 border-b border-gray-300">
      <ProductImage item={item} size="w-16 h-cover" />
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-gray-900 text-sm leading-tight">
          {item.name}
        </h4>
        <p className="text-xs text-gray-500 mt-1">
          Size: {item.size} • Qty: {item.quantity}
        </p>
        <div className="mt-1">
          {discount > 0 ? (
            <div>
              <div className="flex items-center gap-2">
                <p className="text-xs text-gray-500 line-through">
                  ₹{(item.price * item.quantity).toFixed(2)}
                </p>
                <span className="text-sm font-semibold text-green-600">
                  ₹{discountedPrice.toFixed(2)}
                </span>
              </div>
              <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                -₹{discount.toFixed(2)}
              </span>
            </div>
          ) : (
            <p className="text-sm font-semibold text-gray-900">
              ₹{(item.price * item.quantity).toFixed(2)}
            </p>
          )}
        </div>
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
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 002 2z"
            />
          </svg>
        </div>
      )}
    </div>
  );
}

function PriceBreakdown({
  subtotal,
  appliedCoupon,
  totalDiscount,
  finalTotal,
  isMobile = false,
}) {
  return (
    <div className="space-y-4">
      <div
        className={`${
          isMobile ? "border-t border-gray-100 pt-4" : "border-t pt-4"
        } space-y-2`}
      >
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Subtotal</span>
          <span className="text-gray-900">₹{subtotal.toFixed(2)}</span>
        </div>

        {appliedCoupon && totalDiscount > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex justify-between text-sm bg-green-50 -mx-2 px-2 py-1 rounded"
          >
            <span className="text-gray-600 flex items-center gap-2">
              <svg
                className="w-4 h-4 text-green-600"
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
              Discount ({appliedCoupon.code})
            </span>
            <span className="text-green-700 font-medium">
              -₹{totalDiscount.toFixed(2)}
            </span>
          </motion.div>
        )}

        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Shipping</span>
          <span className="text-green-600">Free</span>
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Tax</span>
          <span className="text-gray-900">₹0.00</span>
        </div>

        <div
          className={`border-t pt-2 flex justify-between font-bold ${
            isMobile ? "text-base" : "text-lg"
          }`}
        >
          <span className="text-gray-900">Total</span>
          <span className="text-gray-900">₹{finalTotal.toFixed(2)}</span>
        </div>
      </div>

      {/* Savings Display */}
      {totalDiscount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-center text-sm text-green-700 bg-green-50 rounded-lg p-3"
        >
          <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
          You saved ₹{totalDiscount.toFixed(2)}!
        </motion.div>
      )}

      {!isMobile && (
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
          Secure checkout with SSL encryption
        </div>
      )}
    </div>
  );
}
