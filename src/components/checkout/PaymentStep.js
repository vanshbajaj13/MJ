// components/checkout/PaymentStep.js - Enhanced version
"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCheckout } from "@/context/BuyNowContext";
import Tooltip, { ToastContainer } from "@/components/ui/Tooltip";

const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

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

const DeliveryDetails = ({ selectedAddress, onChangeAddress }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm"
    >
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-center">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Delivering to
            </p>
            <svg
              className="w-5 h-5 text-blue-600 mt-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </div>
          <div>
            <p className="text-lg font-semibold text-gray-900 mt-1">
              {selectedAddress?.fullName}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              {selectedAddress?.phoneNumber}
            </p>
          </div>
        </div>

        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.3 }}
        >
          <svg
            className="w-5 h-5 text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 14l-7 7m0 0l-7-7m7 7V3"
            />
          </svg>
        </motion.div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-4 pt-4 border-t border-gray-100"
          >
            <div className="space-y-3">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-sm text-gray-600">
                  <span className="font-medium text-gray-900">
                    {selectedAddress?.addressLine1}
                  </span>
                  {selectedAddress?.addressLine2 && (
                    <>
                      <br />
                      <span>{selectedAddress.addressLine2}</span>
                    </>
                  )}
                  <br />
                  <span>
                    {selectedAddress?.city}, {selectedAddress?.state}{" "}
                    {selectedAddress?.postalCode}
                  </span>
                  <br />
                  <span className="text-xs text-gray-500">India</span>
                </p>
              </div>

              <motion.button
                onClick={onChangeAddress}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-2 px-4 text-sm font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
              >
                Change Address
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const PriceChangeNotification = ({ priceChanges, onDismiss }) => {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 5000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-4 flex items-start gap-3"
    >
      <svg
        className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>

      <div className="flex-1 min-w-0">
        <p className="font-semibold text-blue-900 text-sm">
          Your order pricing has been updated
        </p>
        <p className="text-xs text-blue-700 mt-1">
          {priceChanges.length} price change
          {priceChanges.length > 1 ? "s" : ""} applied to reflect latest rates
        </p>
      </div>

      <button
        onClick={onDismiss}
        className="text-blue-600 hover:text-blue-900 mt-0.5 flex-shrink-0"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>
    </motion.div>
  );
};

const PaymentStep = ({
  selectedAddress,
  onBack,
  onPaymentSuccess,
  verifiedPhone,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("razorpay");

  const [isValidating, setIsValidating] = useState(false);
  const [validationComplete, setValidationComplete] = useState(false);
  const [showPriceChangeNotification, setShowPriceChangeNotification] =
    useState(false);
  const [showErrorTooltip, setShowErrorTooltip] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [priceChanges, setPriceChanges] = useState([]);

  const {
    sessionId,
    items,
    finalTotal,
    subtotal,
    totalDiscount,
    shippingDiscount,
    updateSessionPrices,
  } = useCheckout();

  // Load Razorpay script
  useEffect(() => {
    loadRazorpayScript().then(setRazorpayLoaded);
  }, []);

  // Auto-validate on mount
  useEffect(() => {
    if (selectedAddress && sessionId) {
      validateBeforePayment();
    }
  }, [selectedAddress, sessionId]);

  // Validate prices and session before payment
  const validateBeforePayment = async () => {
    setIsValidating(true);
    setShowErrorTooltip(false);
    setShowPriceChangeNotification(false);

    try {
      const response = await fetch(
        `/api/checkout-session/${sessionId}/validate-for-payment`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ shippingAddress: selectedAddress }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        const errorMsg =
          data.errors?.[0]?.message || "Unable to validate order";
        setErrorMessage(errorMsg);
        setShowErrorTooltip(true);
        setValidationComplete(false);
        return false;
      }

      // Check if prices changed
      const backendTotal = data.totals.total;
      const contextTotal = finalTotal;

      if (Math.abs(backendTotal - contextTotal) > 0.01) {
        // Silently update context with new prices
        updateSessionPrices(data.session.items, data.session.appliedCoupon);

        // Extract and show price changes
        const changes =
          data.errors?.filter((e) => e.type === "price")[0]?.details || [];
        if (changes.length > 0) {
          setPriceChanges(changes);
          setShowPriceChangeNotification(true);
        }
      }

      setValidationComplete(true);
      return true;
    } catch (error) {
      console.error("Validation error:", error);
      setErrorMessage("Unable to validate order. Please try again.");
      setShowErrorTooltip(true);
      return false;
    } finally {
      setIsValidating(false);
    }
  };

  const handleRazorpayPayment = async () => {
    if (!razorpayLoaded) {
      setErrorMessage(
        "Payment system not loaded. Please refresh and try again."
      );
      setShowErrorTooltip(true);
      return;
    }

    // Re-validate before creating payment order
    const isValid = await validateBeforePayment();
    if (!isValid) {
      return;
    }

    setIsProcessing(true);

    try {
      // Create Razorpay order
      const orderResponse = await fetch("/api/payments/create-razorpay-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          sessionId,
          shippingAddress: selectedAddress,
        }),
      });

      if (!orderResponse.ok) {
        const error = await orderResponse.json();
        throw new Error(error.error || "Failed to create payment order");
      }

      const orderData = await orderResponse.json();

      // Configure Razorpay
      const options = {
        key: orderData.key,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "Your Store Name",
        description: `Order for ${items.length} item(s)`,
        order_id: orderData.orderId,
        handler: async (response) => {
          try {
            // Verify payment
            const verifyResponse = await fetch("/api/payments/verify-payment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                shippingAddress: selectedAddress,
              }),
            });

            if (verifyResponse.ok) {
              const result = await verifyResponse.json();
              onPaymentSuccess(result);
            } else {
              const error = await verifyResponse.json();
              setErrorMessage(
                `Payment verification failed: ${error.error || "Unknown error"}`
              );
              setShowErrorTooltip(true);
            }
          } catch (error) {
            console.error("Payment verification error:", error);
            setErrorMessage(
              "Payment verification failed. Please contact support."
            );
            setShowErrorTooltip(true);
          } finally {
            setIsProcessing(false);
          }
        },
        prefill: {
          name: orderData.customerDetails.name,
          email: orderData.customerDetails.email,
          contact: orderData.customerDetails.contact,
        },
        theme: {
          color: "#2563eb",
        },
        modal: {
          ondismiss: () => {
            setIsProcessing(false);
          },
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error) {
      console.error("Payment initiation error:", error);
      setErrorMessage(`Payment failed: ${error.message}`);
      setShowErrorTooltip(true);
      setIsProcessing(false);
    }
  };

  const handlePayment = () => {
    if (paymentMethod === "razorpay") {
      handleRazorpayPayment();
    }
  };

  // Show validation loading
  if (isValidating) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="flex flex-col items-center justify-center py-16">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 border-4 border-gray-200 border-t-blue-600 rounded-full mb-4"
          />
          <p className="text-gray-600 text-center">Preparing your payment...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Toast Notifications */}
      <ToastContainer position="top-center">
        {showPriceChangeNotification && (
          <PriceChangeNotification
            priceChanges={priceChanges}
            onDismiss={() => setShowPriceChangeNotification(false)}
          />
        )}
        {showErrorTooltip && (
          <Tooltip
            message={errorMessage}
            type="error"
            duration={7000}
            onClose={() => setShowErrorTooltip(false)}
          />
        )}
      </ToastContainer>

      <div className="max-w-2xl mx-auto space-y-6">
        {/* Delivery Details Section */}
        <DeliveryDetails
          selectedAddress={selectedAddress}
          onChangeAddress={onBack}
        />

        {/* Payment Method Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm"
        >
          <div className="flex items-center gap-2 mb-6">
            <svg
              className="w-5 h-5 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
              />
            </svg>
            <h3 className="text-lg font-semibold text-gray-900">
              Payment Method
            </h3>
          </div>

          <motion.label
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            className="flex items-center p-4 border-2 border-gray-500 bg-blue-50/50 rounded-xl cursor-pointer transition-all"
          >
            <input
              type="radio"
              name="payment"
              value="razorpay"
              checked={true}
              readOnly
              className="sr-only"
            />
            <div className="flex items-center w-full gap-4">
              <div className="w-12 h-12 bg-gray-700 rounded-lg flex items-center justify-center shadow-md">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900">
                  Secure Online Payment
                </p>
                <p className="text-sm text-gray-600">
                  UPI, Cards, Net Banking & Wallets
                </p>
              </div>
              <div className="w-6 h-6 rounded-full border-2 border-black bg-black flex items-center justify-center">
                <svg
                  className="w-4 h-4 text-white"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            </div>
          </motion.label>
        </motion.div>

        {/* Security Notice */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex items-center justify-center gap-2 text-sm text-gray-600"
        >
          <svg
            className="w-4 h-4 text-green-600"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
          <span>Secured with 256-bit SSL encryption</span>
        </motion.div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <motion.button
            onClick={onBack}
            disabled={isProcessing}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full sm:w-auto px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="flex items-center justify-center gap-2">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              Back
            </span>
          </motion.button>

          <motion.button
            onClick={handlePayment}
            disabled={isProcessing || !razorpayLoaded || !validationComplete}
            whileHover={{
              scale:
                isProcessing || !razorpayLoaded || !validationComplete
                  ? 1
                  : 1.02,
            }}
            whileTap={{
              scale:
                isProcessing || !razorpayLoaded || !validationComplete
                  ? 1
                  : 0.98,
            }}
            className={`flex-1 py-4 rounded-xl font-semibold transition-all text-lg shadow-lg ${
              isProcessing || !razorpayLoaded || !validationComplete
                ? "bg-gray-300 cursor-not-allowed text-gray-500"
                : "bg-gray-900 text-white hover:bg-black"
            }`}
          >
            {isProcessing ? (
              <span className="flex items-center justify-center gap-3">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                  className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                />
                Processing Payment...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Pay ₹{finalTotal.toFixed(2)}
              </span>
            )}
          </motion.button>
        </div>

        {/* Payment System Loading */}
        {!razorpayLoaded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center"
          >
            <div className="inline-flex items-center text-sm text-gray-600 bg-gray-50 px-4 py-2 rounded-lg border border-gray-200">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  ease: "linear",
                }}
                className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full mr-2"
              />
              Loading payment gateway...
            </div>
          </motion.div>
        )}
      </div>
    </>
  );
};

export default PaymentStep;
