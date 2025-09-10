// pages/checkout/[[...type]]/page.js - Session-only unified checkout
"use client";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCheckout } from "@/context/BuyNowContext"; // Using unified context
import { useUser } from "@/context/UserContext";
import CheckoutForm from "@/components/checkout/CheckoutForm";
import UnifiedOrderSummary from "@/components/checkout/UnifiedOrderSummary";

export default function UnifiedCheckoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: userLoading } = useUser();

  // Unified Checkout context
  const {
    items,
    totalItems,
    loading: checkoutLoading,
    clearSession,
    loadSession,
    appliedCoupon,
    couponLoading,
    applyCoupon,
    removeCoupon,
    subtotal,
    totalDiscount,
    shippingDiscount,
    finalTotal,
    itemDiscounts,
    isActive,
    sessionId,
    type: sessionType,
  } = useCheckout();

  const [isInitialized, setIsInitialized] = useState(false);
  const [shouldRedirect, setShouldRedirect] = useState(false);
  const [countdown, setCountdown] = useState(10);
  const [sessionError, setSessionError] = useState(null);
  const [showExitConfirmation, setShowExitConfirmation] = useState(false);

  // Function to load session
  const loadCheckoutSession = async (sessionId) => {
    try {
      // console.log('Loading session:', sessionId);
      const result = await loadSession(sessionId);
      // console.log('Session loaded successfully:', result);
    } catch (error) {
      // console.error("Error loading session:", error);
      setSessionError(error.message);
      // Don't redirect immediately, let user see the error
      setTimeout(() => {
        router.replace("/?error=session_expired");
      }, 3000);
    }
  };

  // Load session data when session parameter exists
  useEffect(() => {
    const sessionParam = searchParams.get("session");

    if (sessionParam) {
      // Only load if we don't already have this session active
      if (!isActive || sessionId !== sessionParam) {
        loadCheckoutSession(sessionParam);
      }
    } else {
      // No session parameter - invalid access
      setSessionError("No session ID provided");
      startRedirectCountdown();
    }
  }, [searchParams, isActive, sessionId]);

  // Validate session and initialize
  useEffect(() => {
    if (!checkoutLoading && !userLoading) {
      const sessionParam = searchParams.get("session");

      // console.log('Validating session:', {
      //   sessionParam,
      //   isActive,
      //   itemsLength: items.length,
      //   sessionError
      // });

      // Handle session error
      if (sessionError) {
        setIsInitialized(true);
        return;
      }

      // Check if session is valid and has items
      if (sessionParam && isActive && items.length > 0) {
        setIsInitialized(true);
      } 
      // No session parameter provided
      else if (!sessionParam) {
        setSessionError("No session ID provided");
        startRedirectCountdown();
        setIsInitialized(true);
      }
      // Session parameter exists but session not loaded or empty
      else if (sessionParam && (!isActive || items.length === 0)) {
        // Still loading session or session is empty
        if (!sessionError) {
          return; // Keep waiting for session to load
        }
      }
      // Fallback - invalid state
      else {
        setSessionError("Invalid checkout session");
        startRedirectCountdown();
        setIsInitialized(true);
      }
    }
  }, [
    checkoutLoading,
    userLoading,
    items,
    isActive,
    searchParams,
    sessionError,
  ]);

  const startRedirectCountdown = () => {
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setShouldRedirect(true);
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Handle redirect
  useEffect(() => {
    if (shouldRedirect && isInitialized) {
      router.replace("/");
    }
  }, [shouldRedirect, isInitialized, router]);

  // Get active context data
  const getActiveContext = () => {
    return {
      items,
      totalItems,
      appliedCoupon,
      couponLoading,
      applyCoupon,
      removeCoupon,
      subtotal,
      totalDiscount,
      shippingDiscount,
      finalTotal,
      itemDiscounts,
      clearItems: clearSession,
      mode: sessionType || "checkout", // Use session type or default
    };
  };

  const activeContext = getActiveContext();

  const handleBack = () => {
    setShowExitConfirmation(true);
  };

  // Show loading if still initializing
  if (!isInitialized || checkoutLoading || userLoading) {
    return <CheckoutLoadingState />;
  }

  // Show empty state if no valid session or error
  if (sessionError || !isActive || items.length === 0) {
    return (
      <EmptyCheckoutState
        countdown={countdown}
        onContinueShopping={() => router.push("/")}
        error={sessionError || "No items found in checkout session"}
      />
    );
  }

  const handleConfirmExit = async () => {
    clearSession();
    router.back();
  };

  const handleCancelExit = () => {
    setShowExitConfirmation(false);
  };

  return (
    <div className="fixed inset-0 bg-gray-50 z-50 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm px-4 pt-2 lg:p-4 lg:px-6 flex justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">Checkout</h1>
          {sessionType && (
            <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
              {sessionType === 'buy_now' ? 'Buy Now' : 'Cart Checkout'}
            </span>
          )}
        </div>
        <button
          onClick={handleBack}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors group"
        >
          <svg
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
          </svg>
        </button>
      </div>

      {/* Exit Confirmation Modal */}
      {showExitConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full">
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto mb-4 bg-orange-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-orange-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              </div>

              <p className="text-gray-600 text-sm mb-1">
                Products in huge demand might run{" "}
                <span className="text-orange-600 font-medium">
                  Out of Stock
                </span>
              </p>
              <p className="text-gray-800 font-medium">
                Are you sure you want to cancel payment?
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleConfirmExit}
                className="flex-1 py-3 px-4 bg-gray-100 text-red-500 rounded-xl font-medium hover:bg-gray-200 transition-colors"
              >
                Yes
              </button>
              <button
                onClick={handleCancelExit}
                className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
              >
                No
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Order Summary - fixed position, no scrolling */}
        <div className="order-0 lg:ml-10 lg:block lg:w-96 flex-shrink-0 lg:p-6 lg:pr-0 rounded-b-2xl lg:max-h-[85vh]">
          <UnifiedOrderSummary
            items={activeContext.items}
            appliedCoupon={activeContext.appliedCoupon}
            couponLoading={activeContext.couponLoading}
            applyCoupon={activeContext.applyCoupon}
            removeCoupon={activeContext.removeCoupon}
            subtotal={activeContext.subtotal}
            totalDiscount={activeContext.totalDiscount}
            shippingDiscount={activeContext.shippingDiscount}
            finalTotal={activeContext.finalTotal}
            itemDiscounts={activeContext.itemDiscounts}
            totalItems={activeContext.totalItems}
            mode={activeContext.mode}
            user={user}
          />
        </div>

        {/* Checkout Form */}
        <div className="flex-1 overflow-auto lg:p-6 lg:pt-0 scrollbar-hide">
          <CheckoutForm
            context={activeContext}
            sessionId={sessionId}
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

function EmptyCheckoutState({ onContinueShopping, countdown, error }) {
  return (
    <div className="fixed inset-0 bg-gray-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
        <div className="w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
          <svg
            className="w-12 h-12 text-red-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        </div>

        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Checkout Session Error
        </h2>
        <p className="text-gray-600 mb-4">
          {error || "Your checkout session has expired or is invalid."}
        </p>

        {countdown > 0 && (
          <p className="text-sm text-gray-500 mb-6">
            You will be redirected to the home page in{" "}
            <span className="font-semibold text-gray-900">{countdown}</span>{" "}
            seconds...
          </p>
        )}

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