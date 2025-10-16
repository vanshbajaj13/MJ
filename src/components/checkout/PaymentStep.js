// src/components/checkout/PaymentStep.js - Updated with PaymentSuccessModal
"use client";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCheckout } from "@/context/BuyNowContext";
import { useCart } from "@/context/CartContext";
import Tooltip, { ToastContainer } from "@/components/ui/Tooltip";
import useBlockNavigation from "@/hooks/useBlockNavigation";
import { useRouter } from "next/navigation";

// Import the new components
import DeliveryDetails from "./DeliveryDetails";
import PriceChangeNotification from "./PriceChangeNotification";
import PaymentRecoveryModal from "./PaymentRecoveryModal";
import PaymentSuccessModal from "./PaymentSuccessModal";
import AnimatedPrice from "./AnimatedPrice";
import ProcessingPayment from "./ProcessingPayment";

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

const PaymentStep = ({ selectedAddress, onBack, verifiedPhone }) => {
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
  const [isRevalidatingBeforePay, setIsRevalidatingBeforePay] = useState(false);
  const [priceChanged, setPriceChanged] = useState(false);

  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successOrderId, setSuccessOrderId] = useState(null);
  const pendingRazorpayOrderIdRef = useRef(null);

  const router = useRouter();
  const { proceedNavigation } = useBlockNavigation(true, [
    "/order-confirmation",
  ]);

  const {
    sessionId,
    items,
    finalTotal,
    subtotal,
    totalDiscount,
    shippingDiscount,
    updateSessionPrices,
    updateSessionExpiry,
    type: sessionType,
  } = useCheckout();

  const { clearCart } = useCart();

  useEffect(() => {
    loadRazorpayScript().then(setRazorpayLoaded);
  }, []);

  useEffect(() => {
    if (selectedAddress && sessionId) {
      validateBeforePayment();
    }
  }, [selectedAddress, sessionId]);

  const validateBeforePayment = async (isRevalidateOnPay = false) => {
    if (isRevalidateOnPay) {
      setIsRevalidatingBeforePay(true);
    } else {
      setIsValidating(true);
    }

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

      const backendTotal = data.totals.total;
      const contextTotal = finalTotal;
      if (Math.abs(backendTotal - contextTotal) > 0.01) {
        updateSessionPrices(data.session.items, data.session.appliedCoupon);
        const changes =
          data.errors?.filter((e) => e.type === "price")[0]?.details || [];
        if (changes.length > 0) {
          setPriceChanges(changes);
          setShowPriceChangeNotification(true);
          setPriceChanged(true);
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
      if (isRevalidateOnPay) {
        setIsRevalidatingBeforePay(false);
      } else {
        setIsValidating(false);
      }
    }
  };

  const clearPendingPayment = () => {
    localStorage.removeItem("pendingRazorpayOrderId");
    localStorage.removeItem("checkoutSessionId");
    localStorage.removeItem("pendingPaymentTimestamp");
  };

  const handleRazorpayPayment = async () => {
    if (!razorpayLoaded) {
      setErrorMessage(
        "Payment system not loaded. Please refresh and try again."
      );
      setShowErrorTooltip(true);
      return;
    }

    const isValid = await validateBeforePayment(true);

    if (priceChanged || !isValid) {
      setPriceChanged(false);
      return;
    }

    setIsProcessing(true);

    try {
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

      pendingRazorpayOrderIdRef.current = orderData.orderId;

      // ✅ NEW: Update context with extended expiresAt
      if (orderData.priceProtection?.expiresAt) {
        updateSessionExpiry(orderData.priceProtection.expiresAt);
      }

      // Store in localStorage for browser close recovery
      localStorage.setItem("pendingRazorpayOrderId", orderData.orderId);
      localStorage.setItem("checkoutSessionId", sessionId);
      localStorage.setItem("pendingPaymentTimestamp", Date.now().toString());

      const options = {
        key: orderData.key,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "MJ",
        description: `Order for ${items.length} item(s)`,
        order_id: orderData.orderId,
        handler: async (response) => {
          clearPendingPayment();
          await handlePaymentVerification(response);
        },
        prefill: {
          name: orderData.customerDetails.name,
          email: orderData.customerDetails.email,
          contact: orderData.customerDetails.contact,
        },
        theme: {
          color: "#000000",
        },
        modal: {
          ondismiss: () => {
            setIsProcessing(false);

            const razorpayOrderId = pendingRazorpayOrderIdRef.current;

            if (razorpayOrderId) {
              setTimeout(() => {
                setShowRecoveryModal(true);
              }, 300);
            }
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
      pendingRazorpayOrderIdRef.current = null;
      clearPendingPayment();
    }
  };

  const handlePaymentVerification = async (response) => {
    try {
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
        handlePaymentSuccess(result);
      } else {
        console.error("Payment verification failed");
        setIsProcessing(false);
        setShowRecoveryModal(true);
      }
    } catch (error) {
      console.error("Payment verification error:", error);
      setIsProcessing(false);
      setShowRecoveryModal(true);
    }
  };

  const handlePaymentSuccess = (result) => {
    clearPendingPayment();
    if (sessionType !== "buy_now") {
      clearCart();
    }

    pendingRazorpayOrderIdRef.current = null;

    // Show success modal instead of direct redirect
    setSuccessOrderId(result.orderId);
    setShowSuccessModal(true);
  };

  const handleSuccessViewOrder = () => {
    setShowSuccessModal(false);
    router.push(`/order-confirmation?orderId=${successOrderId}`);
  };

  const handleSuccessContinueShopping = () => {
    router.push("/");
  };

  const handleRecoverySuccess = (orderNumber) => {
    clearPendingPayment();
    if (sessionType !== "buy_now") {
      clearCart();
    }

    pendingRazorpayOrderIdRef.current = null;

    // Show success modal for recovery too
    setSuccessOrderId(orderNumber);
    setShowSuccessModal(true);
  };

  const handleRecoveryCancel = () => {
    setShowRecoveryModal(false);
    // Note: We don't clear pending payment here so recovery can be attempted again
  };

  const handlePayment = () => {
    if (paymentMethod === "razorpay") {
      handleRazorpayPayment();
    }
  };

  if (isValidating) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="flex flex-col items-center justify-center py-16">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 border-4 border-gray-200 border-t-black rounded-full mb-4"
          />
          <p className="text-gray-600 text-center">Preparing your payment...</p>
        </div>
      </div>
    );
  }

  return (
    <>
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
      <AnimatePresence>{isProcessing && <ProcessingPayment />}</AnimatePresence>
      <AnimatePresence>
        {/* Recovery Modal */}
        {showRecoveryModal && pendingRazorpayOrderIdRef.current && (
          <PaymentRecoveryModal
            razorpayOrderId={pendingRazorpayOrderIdRef.current}
            onSuccess={handleRecoverySuccess}
            onCancel={handleRecoveryCancel}
          />
        )}

        {/* Success Modal */}
        {showSuccessModal && successOrderId && (
          <PaymentSuccessModal
            orderNumber={successOrderId}
            onViewOrder={handleSuccessViewOrder}
            onDismiss={handleSuccessContinueShopping}
          />
        )}
      </AnimatePresence>

      <div className="max-w-2xl mx-auto space-y-6">
        <DeliveryDetails
          selectedAddress={selectedAddress}
          onChangeAddress={onBack}
        />

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
            className={`flex-1 py-4 rounded-xl bg-gray-300 text-gray-500 font-semibold transition-all text-lg shadow-lg ${
              isProcessing || !razorpayLoaded || !validationComplete
                ? "bg-gray-300 cursor-not-allowed text-gray-500"
                : isRevalidatingBeforePay
                ? "cursor-wait"
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
