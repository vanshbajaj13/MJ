// src/components/checkout/PaymentRecoveryModal.js
"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";

const PaymentRecoveryModal = ({ razorpayOrderId, onSuccess, onCancel }) => {
  const [isChecking, setIsChecking] = useState(true);
  const [statusMessage, setStatusMessage] = useState(
    "Checking your payment status..."
  );

  useEffect(() => {
    checkPaymentStatus();
  }, []);

  const checkPaymentStatus = async () => {
    setIsChecking(true);

    try {
      const response = await fetch("/api/payments/check-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          razorpay_order_id: razorpayOrderId,
          sessionId: localStorage.getItem("checkoutSessionId"),
        }),
      });

      const data = await response.json();

      if (data.success && data.status === "completed") {
        setStatusMessage("Great news! Your payment was successful.");
        setTimeout(() => onSuccess(data.order.orderNumber), 2000);
      } else if (data.status === "payment_not_completed") {
        setStatusMessage("Payment was not completed.");
        setTimeout(onCancel, 2000);
      } else {
        setStatusMessage(data.message || "Unable to verify payment.");
        setIsChecking(false);
      }
    } catch (error) {
      console.error("Status check error:", error);
      setStatusMessage("Unable to check payment status.");
      setIsChecking(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (!isChecking && e.target === e.currentTarget) {
          onCancel();
        }
      }}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl"
      >
        <div className="flex flex-col items-center text-center">
          {isChecking ? (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-16 h-16 border-4 border-gray-200 border-t-black rounded-full mb-6"
              />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Verifying Payment
              </h3>
              <p className="text-gray-600 mb-6">{statusMessage}</p>
              <p className="text-sm text-gray-500">
                Please wait while we confirm your payment...
              </p>
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-6">
                <svg
                  className="w-8 h-8 text-yellow-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Payment Status
              </h3>
              <p className="text-gray-600 mb-6">{statusMessage}</p>
              <div className="flex gap-3 w-full">
                <button
                  onClick={onCancel}
                  className="flex-1 px-6 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                >
                  Close
                </button>
                <button
                  onClick={checkPaymentStatus}
                  className="flex-1 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Check Again
                </button>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default PaymentRecoveryModal;