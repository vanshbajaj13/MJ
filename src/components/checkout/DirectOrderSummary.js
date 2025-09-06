// components/DirectOrderSummary.jsx - Integrated with CheckoutContext
"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import CouponSection from "../Coupon/CouponSection";
import { useCheckout } from "@/context/CheckoutContext";

export default function DirectOrderSummary() {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Get data from CheckoutContext instead of props
  const {
    items,
    totalPrice,
    finalPrice,
    discountAmount,
    appliedCoupon,
    couponLoading,
    applyCoupon,
    removeCoupon,
    totalItems
  } = useCheckout();

  const item = items[0]; // Direct checkout only has one item
  
  if (!item) {
    return null; // Don't render if no item
  }

  return (
    <>
      {/* Mobile Layout */}
      <div className="lg:hidden bg-white border-b border-gray-200 rounded-b-2xl">
        <div
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center justify-between p-4 cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <div>
              <span className="font-semibold text-gray-900">Express Order</span>
              <p className="text-sm text-gray-500">{totalItems} item • {item.size}</p>
            </div>
          </div>

          <div className="text-right">
            <p className="font-bold text-gray-900">₹{finalPrice.toFixed(2)}</p>
            {discountAmount > 0 && (
              <p className="text-xs text-gray-500 line-through">₹{totalPrice.toFixed(2)}</p>
            )}
            <p className="text-xs text-orange-600">Express delivery</p>
          </div>
        </div>

        {isExpanded && (
          <div className="border-t p-4">
            <DirectOrderContent />
          </div>
        )}
      </div>

      {/* Desktop Layout */}
      <div className="hidden lg:block bg-gray-50 p-6 sticky top-6">
        <div className="flex items-center gap-2 mb-6">
          <svg className="w-5 h-5 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
          </svg>
          <h3 className="text-xl font-bold text-gray-900">Express Order</h3>
        </div>

        <DirectOrderContent />
      </div>
    </>
  );
}

function DirectOrderContent() {
  const {
    items,
    totalPrice,
    finalPrice,
    discountAmount,
    appliedCoupon,
    couponLoading,
    applyCoupon,
    removeCoupon
  } = useCheckout();

  const item = items[0]; // Direct checkout only has one item

  if (!item) return null;

  return (
    <div className="space-y-6">
      {/* Product Display */}
      <div className="flex gap-4 p-4 bg-white rounded-lg border">
        <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden">
          {item.image ? (
            <Image 
              src={item.image} 
              alt={item.name} 
              width={80} 
              height={80} 
              className="w-full h-full object-cover" 
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
        </div>
        <div className="flex-1">
          <h4 className="font-medium text-gray-900">{item.name}</h4>
          <p className="text-sm text-gray-500 mt-1">Size: {item.size} • Qty: {item.quantity}</p>
          <p className="text-lg font-semibold text-gray-900 mt-2">₹{totalPrice.toFixed(2)}</p>
        </div>
      </div>

      {/* Coupon Section */}
      <div className="bg-white p-4 rounded-lg border">
        <CouponSection
          onApplyCoupon={applyCoupon}
          onRemoveCoupon={removeCoupon}
          appliedCoupon={appliedCoupon}
          loading={couponLoading}
          totalPrice={totalPrice}
          discountAmount={discountAmount}
        />
      </div>

      {/* Price Breakdown */}
      <div className="bg-white p-4 rounded-lg border space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Item Price</span>
          <span className="text-gray-900">₹{totalPrice.toFixed(2)}</span>
        </div>
        
        {appliedCoupon && discountAmount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-between text-sm"
          >
            <span className="text-gray-600 flex items-center gap-2">
              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              Discount ({appliedCoupon.code})
            </span>
            <span className="text-green-600">-₹{discountAmount.toFixed(2)}</span>
          </motion.div>
        )}
        
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Express Shipping</span>
          <span className="text-green-600">Free</span>
        </div>
        
        <div className="border-t pt-3 flex justify-between font-bold text-lg">
          <span>Total</span>
          <span>₹{finalPrice.toFixed(2)}</span>
        </div>

        {/* Savings Badge */}
        {discountAmount > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center justify-center text-sm text-green-700 bg-green-50 rounded-lg p-3 mt-4"
          >
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            You saved ₹{discountAmount.toFixed(2)}!
          </motion.div>
        )}
      </div>
    </div>
  );
}