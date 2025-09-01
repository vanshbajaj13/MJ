"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { useUser } from "@/context/UserContext";
import CheckoutForm from "@/components/checkout/CheckoutForm";
import OrderSummary from "@/components/checkout/OrderSummary";

export default function CheckoutPage() {
  const router = useRouter();
  const {
    items,
    totalPrice,
    totalItems,
    clearCart,
    loading: cartLoading,
  } = useCart();
  const { user, loading: userLoading } = useUser();
  const [isInitialized, setIsInitialized] = useState(false);
  const [shouldRedirect, setShouldRedirect] = useState(false);

  // Wait for both cart and user contexts to initialize
  useEffect(() => {
    if (!cartLoading && !userLoading) {
      setIsInitialized(true);

      // Small delay to prevent flash and allow for any async cart loading
      const timer = setTimeout(() => {
        if (items.length === 0) {
          setShouldRedirect(true);
        }
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [cartLoading, userLoading, items.length]);

  // Handle redirect after state is stable
  useEffect(() => {
    if (shouldRedirect && isInitialized) {
      router.replace("/");
    }
  }, [shouldRedirect, isInitialized, router]);

  // Show loading state while contexts are initializing
  if (!isInitialized || cartLoading || userLoading) {
    return <CheckoutLoadingState />;
  }

  // Show empty cart state after everything has loaded
  if (items.length === 0) {
    return <EmptyCartState onContinueShopping={() => router.push("/")} />;
  }

  return (
    <div className="fixed inset-0 bg-gray-50 z-50 flex flex-col m-0">
      {/* Unified layout using CSS for responsive behavior */}
      <div className="flex flex-col lg:flex-row h-full">
        {/* Order Summary - appears first on mobile, second on desktop */}
        <div className="lg:hidden order-1 flex-shrink-0">
          <OrderSummary
            items={items}
            totalPrice={totalPrice}
            totalItems={totalItems}
          />
        </div>

        {/* Checkout Form - appears second on mobile, first on desktop */}
        <div className="order-2 lg:order-1 flex-1 overflow-auto p-4 lg:p-6">
          <CheckoutForm
            items={items}
            totalPrice={totalPrice}
            user={user}
            clearCart={clearCart}
          />
        </div>

        {/* Order Summary for desktop - appears in sidebar */}
        <div className="hidden lg:block lg:order-2 w-96 flex-shrink-0 p-6">
          <OrderSummary
            items={items}
            totalPrice={totalPrice}
            totalItems={totalItems}
          />
        </div>
      </div>
    </div>
  );
}

// Professional loading state component
function CheckoutLoadingState() {
  return (
    <div className="fixed inset-0 bg-gray-50 z-50 flex flex-col">
      {/* Mobile Loading */}
      <div className="flex items-center justify-center h-screen lg:hidden">
        <div className="space-y-6 w-full max-w-sm p-4">
          {/* Mobile Header Skeleton */}
          <div className="bg-white border-b border-gray-200 p-4 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 bg-gray-200 rounded animate-pulse" />
                <div>
                  <div className="w-24 h-4 bg-gray-200 rounded animate-pulse mb-1" />
                  <div className="w-16 h-3 bg-gray-200 rounded animate-pulse" />
                </div>
              </div>
              <div className="text-right">
                <div className="w-20 h-4 bg-gray-200 rounded animate-pulse mb-1" />
                <div className="w-16 h-3 bg-gray-200 rounded animate-pulse" />
              </div>
            </div>
          </div>

          {/* Mobile Content Skeleton */}
          <div className="bg-white p-4 rounded-lg shadow space-y-4">
            <div className="mb-6">
              <div className="w-32 h-5 bg-gray-200 rounded animate-pulse mb-4" />
              <div className="w-full h-2 bg-gray-200 rounded animate-pulse" />
            </div>

            <div className="space-y-4">
              <div className="w-48 h-6 bg-gray-200 rounded animate-pulse" />
              <div className="w-full h-12 bg-gray-200 rounded animate-pulse" />
              <div className="w-full h-12 bg-gray-200 rounded animate-pulse" />
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Loading */}
      <div className="hidden items-center justify-center lg:flex h-full max-w-7xl mx-auto p-6 gap-8">
        {/* Main Content Skeleton */}
        <div className="flex-1">
          <div className="bg-white rounded-xl shadow-sm p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="w-32 h-8 bg-gray-200 rounded animate-pulse mx-auto mb-2" />
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2 bg-gray-200 rounded animate-pulse mb-8" />

            {/* Content */}
            <div className="space-y-6">
              <div className="w-48 h-6 bg-gray-200 rounded animate-pulse" />
              <div className="space-y-4">
                <div className="w-full h-12 bg-gray-200 rounded animate-pulse" />
                <div className="w-full h-12 bg-gray-200 rounded animate-pulse" />
                <div className="w-3/4 h-12 bg-gray-200 rounded animate-pulse" />
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Skeleton */}
        <div className="w-96">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="w-32 h-6 bg-gray-200 rounded animate-pulse mb-6" />

            {/* Items Skeleton */}
            <div className="space-y-4 mb-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3">
                  <div className="w-16 h-16 bg-gray-200 rounded animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="w-full h-4 bg-gray-200 rounded animate-pulse" />
                    <div className="w-3/4 h-3 bg-gray-200 rounded animate-pulse" />
                    <div className="w-1/2 h-4 bg-gray-200 rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>

            {/* Price Skeleton */}
            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between">
                <div className="w-16 h-4 bg-gray-200 rounded animate-pulse" />
                <div className="w-20 h-4 bg-gray-200 rounded animate-pulse" />
              </div>
              <div className="flex justify-between">
                <div className="w-20 h-4 bg-gray-200 rounded animate-pulse" />
                <div className="w-12 h-4 bg-gray-200 rounded animate-pulse" />
              </div>
              <div className="flex justify-between pt-2 border-t">
                <div className="w-12 h-5 bg-gray-200 rounded animate-pulse" />
                <div className="w-24 h-5 bg-gray-200 rounded animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Loading Indicator */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 lg:top-8">
        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm border">
          <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin" />
          <span className="text-sm text-gray-600">Loading checkout...</span>
        </div>
      </div>
    </div>
  );
}

// Professional empty cart state component
function EmptyCartState({ onContinueShopping }) {
  return (
    <div className="fixed inset-0 bg-gray-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
        {/* Empty Cart Icon */}
        <div className="w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
          <svg
            className="w-12 h-12 text-gray-400"
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
        </div>

        {/* Content */}
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Your cart is empty
        </h2>
        <p className="text-gray-600 mb-8">
          Looks like you haven't added any items to your cart yet. Start
          shopping to fill it up!
        </p>

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={onContinueShopping}
            className="w-full bg-gray-900 text-white py-3 px-6 rounded-xl font-medium hover:bg-gray-800 transition-colors"
          >
            Continue Shopping
          </button>
          <button
            onClick={() => window.history.back()}
            className="w-full text-gray-600 hover:text-gray-900 transition-colors"
          >
            Go Back
          </button>
        </div>

        {/* Optional: Recent items or suggestions */}
        <div className="mt-8 pt-6 border-t border-gray-100">
          <p className="text-sm text-gray-500">
            Need help?{" "}
            <a href="/support" className="text-gray-900 hover:underline">
              Contact Support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
