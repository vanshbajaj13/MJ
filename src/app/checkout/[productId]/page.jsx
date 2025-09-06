// app/checkout/[productId]/page.jsx - Updated Buy Now checkout
"use client";
import { useEffect, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useUser } from "@/context/UserContext";
import { useCheckout } from "@/context/CheckoutContext";
import DirectCheckoutForm from "@/components/checkout/DirectCheckoutForm";
import DirectOrderSummary from "@/components/checkout/DirectOrderSummary";
import { usePathname } from "next/navigation";

export default function DirectCheckoutPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, loading: userLoading } = useUser();
  const { setDirectPurchase, clearCheckout, finalPrice } = useCheckout();

  const pathname = usePathname();

  // URL parameters - productId is actually a slug now
  const slug = params.productId;
  const size = searchParams.get('size');
  const quantity = parseInt(searchParams.get('quantity') || '1');

  // State
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [shouldRedirect, setShouldRedirect] = useState(false);
  const [countdown, setCountdown] = useState(10);

  // Fetch product using slug
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const response = await fetch(`/api/products/${slug}`);
        if (!response.ok) throw new Error('Product not found');
        
        const data = await response.json();
        
        if (data.success) {
          setProduct(data.data);
        } else {
          throw new Error(data.error);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      fetchProduct();
    }
  }, [slug]);

  // Initialize direct purchase in CheckoutContext when product is loaded
  useEffect(() => {
    if (product && size && !loading) {
      setDirectPurchase(product, size, quantity);
    }
  }, [product, size, quantity, loading]);

  // Initialize component
  useEffect(() => {
    if (!loading && !userLoading) {
      setIsInitialized(true);
      
      // Redirect if error or missing required params
      if (error || !product || !size) {
        const interval = setInterval(() => {
          setCountdown((prev) => prev - 1);
        }, 1000);

        const timer = setTimeout(() => {
          setShouldRedirect(true);
        }, 10000);

        return () => {
          clearInterval(interval);
          clearTimeout(timer);
        };
      }
    }
  }, [loading, userLoading, error, product, size]);

  // Handle redirect after state is stable
  useEffect(() => {
    if (shouldRedirect && isInitialized) {
      clearCheckout(); // Clear checkout context before redirect
      router.replace("/");
    }
  }, [shouldRedirect, isInitialized, router, clearCheckout]);

  // Validate parameters
  useEffect(() => {
    if (!loading && product && !size) {
      clearCheckout(); // Clear checkout context before redirect
      router.push(`/product/${product.slug}`);
    }
  }, [loading, product, size, router, clearCheckout]);

  // Cleanup on unmount
  useEffect(() => {
  return () => {
    if (!pathname.startsWith("/checkout")) {
      clearCheckout();
    }
  };
}, [clearCheckout, pathname]);

  // Show loading state while contexts are initializing
  if (!isInitialized || loading || userLoading) {
    return <DirectCheckoutLoadingState />;
  }

  // Show error state after everything has loaded
  if (error || !product || !size) {
    return (
      <DirectCheckoutErrorState 
        error={error}
        countdown={countdown}
        onContinueShopping={() => {
          clearCheckout();
          router.push("/");
        }}
      />
    );
  }

  const handleBack = () => {
    clearCheckout();
    router.push(`/products/${product.slug}`);
  };

  const handleOrderComplete = () => {
    clearCheckout();
    // Order completion logic handled in DirectCheckoutForm
  };

  return (
    <div className="fixed inset-0 bg-gray-50 z-50 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-4 px-6 flex justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Checkout</h1>
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

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Order Summary - Uses CheckoutContext */}
        <div className="order-0 lg:block lg:w-96 flex-shrink-0 lg:p-6 rounded-b-2xl">
          <DirectOrderSummary />
        </div>

        {/* Checkout Form */}
        <div className="flex-1 overflow-auto lg:p-6 lg:pt-0 scrollbar-hide">
          <DirectCheckoutForm
            user={user}
            onBack={handleBack}
            onComplete={handleOrderComplete}
          />
        </div>
      </div>
    </div>
  );
}

// Professional loading state component for direct checkout
function DirectCheckoutLoadingState() {
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

            {/* Item Skeleton */}
            <div className="flex gap-3 mb-6">
              <div className="w-16 h-16 bg-gray-200 rounded animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="w-full h-4 bg-gray-200 rounded animate-pulse" />
                <div className="w-3/4 h-3 bg-gray-200 rounded animate-pulse" />
                <div className="w-1/2 h-4 bg-gray-200 rounded animate-pulse" />
              </div>
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

function DirectCheckoutErrorState({ error, countdown, onContinueShopping }) {
  return (
    <div className="fixed inset-0 bg-gray-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
        {/* Error Icon */}
        <div className="w-24 h-24 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
          <svg
            className="w-12 h-12 text-red-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        {/* Content */}
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {error ? "Checkout Error" : "Product Not Found"}
        </h2>
        <p className="text-gray-600 mb-4">
          {error || "The product you're trying to checkout is not available."}
        </p>

        {/* Countdown message */}
        {countdown > 0 && (
          <p className="text-sm text-gray-500 mb-6">
            You will be redirected to the home page in{" "}
            <span className="font-semibold text-gray-900">{countdown}</span>{" "}
            seconds...
          </p>
        )}

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

        {/* Support link */}
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