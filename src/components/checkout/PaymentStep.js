// components/checkout/PaymentStep.js - Updated with backend validation
"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCheckout } from "@/context/BuyNowContext";

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

const PaymentStep = ({
  selectedAddress,
  sessionId,
  onBack,
  items,
  onPaymentSuccess,
  verifiedPhone,
}) => {
  console.log(items);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);

  // Validation state
  const [isValidating, setIsValidating] = useState(false);
  const [validationComplete, setValidationComplete] = useState(false);
  const [validatedData, setValidatedData] = useState(null);
  const [validationErrors, setValidationErrors] = useState(null);

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

  // CRITICAL: Validate everything with backend before payment
  const validateBeforePayment = async () => {
    setIsValidating(true);
    setValidationErrors(null);

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

      if (!response.ok || !data.success) {
        setValidationErrors(data);
        setValidationComplete(false);
        return false;
      }

      // Validation passed - store validated data
      setValidatedData(data);
      setValidationComplete(true);
      return true;
    } catch (error) {
      console.error("Validation error:", error);
      setValidationErrors({
        hasErrors: true,
        errors: [
          {
            type: "system",
            message: "Unable to validate order. Please try again.",
          },
        ],
      });
      return false;
    } finally {
      setIsValidating(false);
    }
  };

  const handleRazorpayPayment = async () => {
    if (!razorpayLoaded) {
      alert("Payment system not loaded. Please refresh and try again.");
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
        description: `Order for ${validatedData.session.items.length} item(s)`,
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
                sessionId: sessionId,
              }),
            });

            if (verifyResponse.ok) {
              const result = await verifyResponse.json();
              onPaymentSuccess(result);
            } else {
              const error = await verifyResponse.json();
              alert(
                `Payment verification failed: ${
                  error.error || "Unknown error"
                }\n\n${
                  error.refundInitiated
                    ? "Refund has been initiated."
                    : "Please contact support."
                }`
              );
            }
          } catch (error) {
            console.error("Payment verification error:", error);
            alert("Payment verification failed. Please contact support.");
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
      alert(`Payment failed: ${error.message}`);
      setIsProcessing(false);
    }
  };

  const handleCODPayment = async () => {
    // Re-validate before COD order
    const isValid = await validateBeforePayment();
    if (!isValid) {
      return;
    }

    setIsProcessing(true);

    try {
      const response = await fetch("/api/orders/create-cod", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          sessionId,
          shippingAddress: selectedAddress,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        onPaymentSuccess(result);
      } else {
        const error = await response.json();
        throw new Error(error.error || "Failed to create COD order");
      }
    } catch (error) {
      console.error("COD order error:", error);
      alert(`Order creation failed: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePayment = () => {
    if (paymentMethod === "razorpay") {
      handleRazorpayPayment();
    } else {
      handleCODPayment();
    }
  };

  // Show validation loading
  if (isValidating) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="flex flex-col items-center justify-center py-12">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 border-4 border-gray-200 border-t-blue-600 rounded-full mb-4"
          />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Validating Your Order
          </h3>
          <p className="text-gray-600 text-center">
            Checking stock availability, prices, and coupons...
          </p>
        </div>
      </div>
    );
  }

  // Show validation errors
  if (validationErrors?.hasErrors) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
              <svg
                className="w-6 h-6 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-1.959-1.333-2.73 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-bold text-red-900 mb-2">
                Order Validation Issues
              </h3>
              <p className="text-red-700">
                We found some issues with your order. Please review them below.
              </p>
            </div>
          </div>

          <div className="space-y-4 mb-6">
            {validationErrors.errors?.map((error, index) => (
              <div
                key={index}
                className="bg-white rounded-lg p-4 border border-red-200"
              >
                <div className="flex items-start gap-3">
                  <svg
                    className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <div className="flex-1">
                    <h4 className="font-semibold text-red-900 mb-1">
                      {error.type === "stock" && "Stock Unavailable"}
                      {error.type === "price" && "Price Changes"}
                      {error.type === "coupon" && "Coupon Issue"}
                      {error.type === "system" && "System Error"}
                    </h4>
                    <p className="text-red-800 text-sm mb-2">{error.message}</p>
                    {error.details && Array.isArray(error.details) && (
                      <ul className="space-y-1 text-sm">
                        {error.details.map((detail, idx) => (
                          <li
                            key={idx}
                            className="text-red-700 bg-red-50 rounded px-3 py-2"
                          >
                            {detail.itemName && (
                              <span className="font-medium">
                                {detail.itemName}
                                {detail.size && ` (${detail.size})`}:{" "}
                              </span>
                            )}
                            {detail.issue}
                            {detail.newPrice !== undefined && (
                              <span className="ml-2">
                                Old: ₹{detail.oldPrice} → New: ₹
                                {detail.newPrice}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => (window.location.href = "/cart")}
              className="flex-1 bg-red-600 text-white py-3 px-6 rounded-xl font-semibold hover:bg-red-700 transition-colors"
            >
              Update Cart
            </button>
            <button
              onClick={onBack}
              className="flex-1 border-2 border-red-300 text-red-700 py-3 px-6 rounded-xl font-semibold hover:bg-red-50 transition-colors"
            >
              Change Address
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show order summary if validation complete
  if (!validatedData) {
    return null;
  }

  const { totals, customerDetails, shippingAddress } = validatedData;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Validation Success Badge */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-green-50 border border-green-200 rounded-xl p-4"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
            <svg
              className="w-6 h-6 text-green-600"
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
          </div>
          <div>
            <p className="font-semibold text-green-900">
              Order Validated Successfully
            </p>
            <p className="text-sm text-green-700">
              All items are in stock and ready for checkout
            </p>
          </div>
        </div>
      </motion.div>

      {/* Order Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-50 rounded-2xl p-6 space-y-6"
      >
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
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
              d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
          Order Summary
        </h3>

        {/* Customer Details */}
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <h4 className="font-medium text-gray-900 mb-3">Customer Details</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Name:</span>
              <span className="font-medium text-gray-900">
                {customerDetails.name}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Phone:</span>
              <span className="font-medium text-gray-900">
                {customerDetails.phone}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Email:</span>
              <span className="font-medium text-gray-900">
                {customerDetails.email}
              </span>
            </div>
          </div>
        </div>

        {/* Shipping Address */}
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <h4 className="font-medium text-gray-900 mb-3">Delivery Address</h4>
          <div className="text-sm text-gray-700">
            <p className="font-medium">{shippingAddress.fullName}</p>
            <p>{shippingAddress.addressLine1}</p>
            {shippingAddress.addressLine2 && (
              <p>{shippingAddress.addressLine2}</p>
            )}
            <p>
              {shippingAddress.city}, {shippingAddress.state} -{" "}
              {shippingAddress.pincode}
            </p>
            {shippingAddress.landmark && (
              <p className="text-gray-500">
                Landmark: {shippingAddress.landmark}
              </p>
            )}
          </div>
        </div>

        {/* Price Details */}
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <h4 className="font-medium text-gray-900 mb-3">Price Details</h4>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">
                Subtotal ({items.length} items)
              </span>
              <span className="text-gray-900">
                ₹{totals.subtotal.toFixed(2)}
              </span>
            </div>

            {totals.discount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Discount</span>
                <span className="text-green-600">
                  -₹{totals.discount.toFixed(2)}
                </span>
              </div>
            )}

            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Shipping</span>
              <span className="text-green-600 font-medium">FREE</span>
            </div>

            <div className="border-t border-gray-200 pt-3 flex justify-between font-bold text-lg">
              <span className="text-gray-900">Total</span>
              <span className="text-gray-900">₹{totals.total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Payment Method Selection */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-2xl p-6 border border-gray-200"
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Choose Payment Method
        </h3>

        <div className="space-y-3">
          {/* Online Payment */}
          <motion.label
            whileHover={{ scale: 1.01 }}
            className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all ${
              paymentMethod === "razorpay"
                ? "border-blue-500 bg-blue-50 ring-2 ring-blue-500/20"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <input
              type="radio"
              name="payment"
              value="razorpay"
              checked={paymentMethod === "razorpay"}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="sr-only"
            />
            <div className="flex items-center w-full gap-4">
              <div className="w-12 h-8 bg-blue-600 rounded flex items-center justify-center">
                <span className="text-white text-xs font-bold">PAY</span>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900">Online Payment</p>
                <p className="text-sm text-gray-600">
                  UPI, Cards, Net Banking & Wallets
                </p>
              </div>
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  paymentMethod === "razorpay"
                    ? "border-blue-500 bg-blue-500"
                    : "border-gray-300"
                }`}
              >
                {paymentMethod === "razorpay" && (
                  <svg
                    className="w-3 h-3 text-white"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </div>
            </div>
          </motion.label>

          {/* Cash on Delivery */}
          <motion.label
            whileHover={{ scale: 1.01 }}
            className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all ${
              paymentMethod === "cod"
                ? "border-green-500 bg-green-50 ring-2 ring-green-500/20"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <input
              type="radio"
              name="payment"
              value="cod"
              checked={paymentMethod === "cod"}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="sr-only"
            />
            <div className="flex items-center w-full gap-4">
              <div className="w-12 h-8 bg-green-600 rounded flex items-center justify-center">
                <svg
                  className="w-4 h-4 text-white"
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
                <p className="font-semibold text-gray-900">Cash on Delivery</p>
                <p className="text-sm text-gray-600">
                  Pay when delivered to your doorstep
                </p>
              </div>
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  paymentMethod === "cod"
                    ? "border-green-500 bg-green-500"
                    : "border-gray-300"
                }`}
              >
                {paymentMethod === "cod" && (
                  <svg
                    className="w-3 h-3 text-white"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </div>
            </div>
          </motion.label>
        </div>
      </motion.div>

      {/* Security Notice */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-blue-50 border border-blue-200 rounded-xl p-4"
      >
        <div className="flex items-start gap-3">
          <svg
            className="w-5 h-5 text-blue-600 mt-0.5"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
          <div>
            <p className="font-medium text-blue-900 text-sm">Secure Payment</p>
            <p className="text-sm text-blue-700">
              Your payment is encrypted and secure. We never store card details.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 pt-4">
        <button
          onClick={onBack}
          disabled={isProcessing}
          className="w-full sm:w-auto px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          Back to Address
        </button>

        <motion.button
          onClick={handlePayment}
          disabled={
            isProcessing ||
            (paymentMethod === "razorpay" && !razorpayLoaded) ||
            !validationComplete
          }
          whileHover={{
            scale:
              isProcessing || (paymentMethod === "razorpay" && !razorpayLoaded)
                ? 1
                : 1.02,
          }}
          whileTap={{
            scale:
              isProcessing || (paymentMethod === "razorpay" && !razorpayLoaded)
                ? 1
                : 0.98,
          }}
          className={`flex-1 py-4 rounded-xl font-semibold transition-all text-lg ${
            isProcessing ||
            (paymentMethod === "razorpay" && !razorpayLoaded) ||
            !validationComplete
              ? "bg-gray-400 cursor-not-allowed text-white"
              : paymentMethod === "razorpay"
              ? "bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
              : "bg-green-600 hover:bg-green-700 text-white shadow-lg"
          }`}
        >
          {isProcessing ? (
            <div className="flex items-center justify-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-3"
              />
              Processing...
            </div>
          ) : (
            <>
              {paymentMethod === "cod"
                ? `Place Order • ₹${totals.total.toFixed(2)}`
                : `Pay Now • ₹${totals.total.toFixed(2)}`}
            </>
          )}
        </motion.button>
      </div>

      {paymentMethod === "razorpay" && !razorpayLoaded && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <div className="inline-flex items-center text-sm text-amber-800 bg-amber-50 px-4 py-2 rounded-lg border border-amber-200">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-4 h-4 border-2 border-amber-600 border-t-transparent rounded-full mr-2"
            />
            Loading payment system...
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default PaymentStep;
