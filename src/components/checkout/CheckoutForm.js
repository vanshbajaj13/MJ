// src/components/checkout/CheckoutForm.js - Updated with new components
"use client";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "@/context/CartContext";
import AddressStep from "./AddressStep";
import PaymentStep from "./PaymentStep";

const CHECKOUT_STEPS = {
  VERIFICATION: 1,
  ADDRESS: 2,
  PAYMENT: 3,
};

// Initial loading component
const InitialLoader = () => (
  <div className="bg-gray-50 min-h-screen">
    <div className="max-w-4xl mx-auto lg:p-6">
      <div className="lg:bg-white lg:rounded-lg lg:shadow-sm py-4 lg:p-6 lg:mb-6">
        <div className="flex items-center justify-center space-x-4">
          {[1, 2, 3].map((step, index) => (
            <div key={step} className="flex items-center">
              <div className="flex flex-col items-center">
                <div className="w-6 h-6 bg-gray-200 rounded-full animate-pulse"></div>
                <div className="mt-2 h-3 bg-gray-200 rounded w-12 animate-pulse"></div>
              </div>
              {index < 2 && (
                <div className="flex items-center mx-4">
                  <div className="flex space-x-1">
                    {[1, 2, 3, 4].map((dot) => (
                      <div
                        key={dot}
                        className="w-1 h-1 bg-gray-200 rounded-full animate-pulse"
                      ></div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="lg:bg-white lg:rounded-lg lg:shadow-sm">
        <div className="p-6">
          <div className="max-w-md mx-auto text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-200 rounded-full animate-pulse"></div>
            <div className="h-6 bg-gray-200 rounded mx-auto mb-2 w-48 animate-pulse"></div>
            <div className="h-4 bg-gray-100 rounded mx-auto w-64 animate-pulse"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default function UnifiedCheckoutForm({
  items,
  totalPrice,
  user,
  clearCart,
  onBack,
  sessionId,
  context,
  mobile = false,
}) {
  console.log(context);
  
  const { appliedCoupon, discountAmount } = useCart();

  // Session and initialization state
  const [isInitializing, setIsInitializing] = useState(true);
  const [sessionCheckComplete, setSessionCheckComplete] = useState(false);
  const [validationLoading, setValidationLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState([]);
  const [validatedPricing, setValidatedPricing] = useState(null);

  // Main checkout state
  const [currentStep, setCurrentStep] = useState(CHECKOUT_STEPS.VERIFICATION);
  const [isVerified, setIsVerified] = useState(false);
  const [verifiedPhone, setVerifiedPhone] = useState("");
  const [loading, setLoading] = useState(false);

  // Phone verification state
  const [phoneStep, setPhoneStep] = useState("phone");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [phoneError, setPhoneError] = useState("");
  const [resendTimer, setResendTimer] = useState(0);
  const [isResending, setIsResending] = useState(false);
  const otpRefs = useRef([]);

  // Address step state
  const [selectedAddress, setSelectedAddress] = useState(null);

  // Timer for resend OTP
  useEffect(() => {
    let interval;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  // Enhanced session check on mount with proper state management
  useEffect(() => {
    const checkVerificationStatus = async () => {
      try {
        setIsInitializing(true);

        const response = await fetch("/api/auth/verify-session", {
          method: "GET",
          credentials: "include",
          headers: {
            "Cache-Control": "no-cache",
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.verified) {
            // User has valid session - set up verified state
            setIsVerified(true);
            setVerifiedPhone(data.phoneNumber);
            setPhoneNumber(data.phoneNumber.replace("+91", ""));
            setPhoneStep("otp");
            setCurrentStep(CHECKOUT_STEPS.ADDRESS);
          } else {
            // No valid session - start from verification
            setCurrentStep(CHECKOUT_STEPS.VERIFICATION);
          }
        } else {
          // API error - start from verification
          setCurrentStep(CHECKOUT_STEPS.VERIFICATION);
        }
      } catch (error) {
        console.error("Session check failed:", error);
        setCurrentStep(CHECKOUT_STEPS.VERIFICATION);
      } finally {
        setIsInitializing(false);
        setSessionCheckComplete(true);
      }
    };

    checkVerificationStatus();
  }, []);

  // Validate cart before proceeding to payment
  const validateCheckout = async () => {
    setValidationLoading(true);
    setValidationErrors([]);

    try {
      const response = await fetch("/api/checkout/validate", {
        method: "POST",
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Validation failed");
      }

      if (data.hasChanges) {
        setValidationErrors(data.errors);
        return false;
      }

      setValidatedPricing(data.validation);
      return true;
    } catch (error) {
      console.error("Validation error:", error);
      setValidationErrors([error.message]);
      return false;
    } finally {
      setValidationLoading(false);
    }
  };

  // Show loading screen during initialization
  if (isInitializing || !sessionCheckComplete) {
    return <InitialLoader />;
  }

  // Phone verification functions
  const validatePhoneNumber = (phone) => {
    const phoneRegex = /^[6-9]\d{9}$/;
    return phoneRegex.test(phone.replace(/\D/g, ""));
  };

  const formatPhoneNumber = (phone) => {
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length <= 10) {
      return cleaned.replace(/(\d{5})(\d{5})/, "$1 $2");
    }
    return cleaned.slice(0, 10).replace(/(\d{5})(\d{5})/, "$1 $2");
  };

  const handleSendOtp = async () => {
    const cleanPhone = phoneNumber.replace(/\D/g, "");

    if (!validatePhoneNumber(cleanPhone)) {
      setPhoneError("Please enter a valid 10-digit mobile number");
      return;
    }

    setLoading(true);
    setPhoneError("");

    try {
      const response = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phoneNumber: `+91${cleanPhone}`,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setPhoneStep("otp");
        setResendTimer(60);
        setOtp(["", "", "", "", "", ""]);
        setTimeout(() => otpRefs.current[0]?.focus(), 100);
      } else {
        setPhoneError(data.error || "Failed to send OTP. Please try again.");
      }
    } catch (error) {
      console.error("Send OTP error:", error);
      setPhoneError(
        "Network error. Please check your connection and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index, value) => {
    if (!/^\d?$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setPhoneError("");

    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }

    if (newOtp.every((digit) => digit !== "")) {
      handleVerifyOtp(newOtp.join(""));
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOtp = async (otpCode = otp.join("")) => {
    if (otpCode.length !== 6) {
      setPhoneError("Please enter the complete 6-digit OTP");
      return;
    }

    setLoading(true);
    setPhoneError("");

    try {
      const cleanPhone = phoneNumber.replace(/\D/g, "");
      const response = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phoneNumber: `+91${cleanPhone}`,
          otp: otpCode,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setIsVerified(true);
        setVerifiedPhone(`+91${cleanPhone}`);
        setCurrentStep(CHECKOUT_STEPS.ADDRESS);
      } else {
        setPhoneError(data.error || "Invalid OTP. Please try again.");
        setOtp(["", "", "", "", "", ""]);
        setTimeout(() => otpRefs.current[0]?.focus(), 100);
      }
    } catch (error) {
      console.error("Verify OTP error:", error);
      setPhoneError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendTimer > 0 || isResending) return;

    setIsResending(true);
    setPhoneError("");

    try {
      const cleanPhone = phoneNumber.replace(/\D/g, "");
      const response = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phoneNumber: `+91${cleanPhone}`,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setResendTimer(60);
        setOtp(["", "", "", "", "", ""]);
        setTimeout(() => otpRefs.current[0]?.focus(), 100);
      } else {
        setPhoneError(data.error || "Failed to resend OTP. Please try again.");
      }
    } catch (error) {
      console.error("Resend OTP error:", error);
      setPhoneError("Network error. Please try again.");
    } finally {
      setIsResending(false);
    }
  };

  // Show validation errors if any
  if (validationErrors.length > 0) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-red-900 mb-4">
            Cart Validation Issues
          </h3>
          <ul className="space-y-2 mb-6">
            {validationErrors.map((error, index) => (
              <li key={index} className="text-red-800 flex items-start gap-2">
                <svg className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                {error}
              </li>
            ))}
          </ul>
          <div className="flex gap-3">
            <button
              onClick={() => window.location.href = '/cart'}
              className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              Update Cart
            </button>
            <button
              onClick={() => {
                setValidationErrors([]);
                setValidatedPricing(null);
              }}
              className="border border-red-300 text-red-700 px-6 py-2 rounded-lg hover:bg-red-50 transition-colors"
            >
              Continue Anyway
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Navigation functions
  const handleBackToStep = (step) => {
    setCurrentStep(step);
    if (step === CHECKOUT_STEPS.VERIFICATION) {
      setPhoneError("");
    }
  };

  // Handle address step completion
  const handleAddressStepComplete = (address) => {
    setSelectedAddress(address);
    setCurrentStep(CHECKOUT_STEPS.PAYMENT);
  };

  // Handle payment success
  const handlePaymentSuccess = (result) => {
    clearCart();
    window.location.href = `/order-confirmation?orderId=${result.orderId}`;
  };

  // Render phone verification step
  const renderPhoneVerification = () => (
    <div className="max-w-md mx-auto">
      <AnimatePresence mode="wait">
        {phoneStep === "phone" ? (
          <motion.div
            key="phone-step"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-green-100 to-green-50 rounded-full flex items-center justify-center shadow-sm">
                <svg
                  className="w-8 h-8 text-green-600"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.704" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Verify via WhatsApp
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                We'll send a verification code to your WhatsApp to secure your
                order
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  WhatsApp Number
                </label>
                <div className="flex">
                  <div className="flex items-center px-3 py-3 border border-r-0 border-gray-300 bg-gray-50 rounded-l-lg">
                    <span className="text-gray-600 font-medium">+91</span>
                  </div>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => {
                      const formatted = formatPhoneNumber(e.target.value);
                      setPhoneNumber(formatted);
                      setPhoneError("");
                    }}
                    placeholder="98765 43210"
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-r-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    maxLength={11}
                  />
                </div>
                {phoneError && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-red-600 text-sm mt-2"
                  >
                    {phoneError}
                  </motion.p>
                )}
              </div>

              <motion.button
                onClick={handleSendOtp}
                disabled={loading}
                whileHover={{ scale: loading ? 1 : 1.02 }}
                whileTap={{ scale: loading ? 1 : 0.98 }}
                className={`w-full py-3 px-4 rounded-lg font-medium transition-all ${
                  loading
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700"
                } text-white`}
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                      className="rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"
                    />
                    Sending OTP...
                  </div>
                ) : (
                  "Send OTP"
                )}
              </motion.button>

              <p className="text-xs text-gray-500 text-center">
                By continuing, you agree to receive WhatsApp messages from us.
                Message and data rates may apply.
              </p>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="otp-step"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-green-100 to-green-50 rounded-full flex items-center justify-center shadow-sm">
                <svg
                  className="w-8 h-8 text-green-600"
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
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Enter Verification Code
              </h3>
              <p className="text-gray-600 text-sm">
                We've sent a 6-digit code to your WhatsApp
              </p>
              <p className="text-gray-800 font-medium text-sm mt-1">
                +91 {phoneNumber}
              </p>
            </div>

            <div className="space-y-6">
              <div className="flex justify-center gap-2">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => (otpRefs.current[index] = el)}
                    type="text"
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    className="w-10 h-12 text-center text-lg font-bold border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    maxLength={1}
                  />
                ))}
              </div>

              {phoneError && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-red-600 text-sm text-center"
                >
                  {phoneError}
                </motion.p>
              )}

              <div className="text-center">
                <p className="text-sm text-gray-600 mb-2">
                  Didn't receive the code?
                </p>
                {resendTimer > 0 ? (
                  <p className="text-sm text-gray-500">
                    Resend OTP in {resendTimer}s
                  </p>
                ) : (
                  <button
                    onClick={handleResendOtp}
                    disabled={isResending}
                    className="text-sm text-blue-600 font-medium hover:underline disabled:opacity-50"
                  >
                    {isResending ? "Resending..." : "Resend OTP"}
                  </button>
                )}
              </div>

              <button
                onClick={() => {
                  setPhoneStep("phone");
                  setOtp(["", "", "", "", "", ""]);
                  setPhoneError("");
                  setResendTimer(0);
                }}
                className="w-full py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Change phone number
              </button>

              {loading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center"
                >
                  <div className="flex items-center justify-center text-sm text-gray-600">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                      className="rounded-full h-4 w-4 border-2 border-gray-400 border-t-blue-600 mr-2"
                    />
                    Verifying...
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case CHECKOUT_STEPS.VERIFICATION:
        return renderPhoneVerification();
      case CHECKOUT_STEPS.ADDRESS:
        return (
          <AddressStep
            verifiedPhone={verifiedPhone}
            onContinue={handleAddressStepComplete}
            onBack={() => {
              setPhoneStep("phone");
              setOtp(["", "", "", "", "", ""]);
              setPhoneError("");
              setResendTimer(0);
              handleBackToStep(CHECKOUT_STEPS.VERIFICATION);
            }}
          />
        );
      case CHECKOUT_STEPS.PAYMENT:
        return (
          <PaymentStep
            selectedAddress={selectedAddress}
            sessionId={sessionId}
            items={items}
            verifiedPhone={verifiedPhone}
            onBack={() => handleBackToStep(CHECKOUT_STEPS.ADDRESS)}
            onPaymentSuccess={handlePaymentSuccess}
          />
        );
      default:
        return null;
    }
  };

  const getStepStatus = (stepNumber) => {
    if (currentStep > stepNumber) return "completed";
    if (currentStep === stepNumber) return "current";
    return "upcoming";
  };

  const renderProgressBar = () => {
    const steps = [
      { number: 1, label: "Mobile", key: CHECKOUT_STEPS.VERIFICATION },
      { number: 2, label: "Address", key: CHECKOUT_STEPS.ADDRESS },
      { number: 3, label: "Pay", key: CHECKOUT_STEPS.PAYMENT },
    ];

    const handleStepClick = (stepKey) => {
      // Only allow backward navigation
      if (stepKey < currentStep) {
        if (stepKey === CHECKOUT_STEPS.VERIFICATION) {
          setPhoneStep("phone");
          setOtp(["", "", "", "", "", ""]);
          setPhoneError("");
          setResendTimer(0);
        }
        handleBackToStep(stepKey);
      }
    };

    return (
      <div className="flex items-center justify-center space-x-2 lg:space-x-4">
        {steps.map((step, index) => {
          const status = getStepStatus(step.key);
          const canNavigateBack = step.key < currentStep;

          return (
            <div key={step.key} className="flex items-center cursor-default">
              <div
                className="flex flex-col items-center"
                onClick={() => handleStepClick(step.key)}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                    status === "completed"
                      ? "bg-green-500 text-white"
                      : status === "current"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 text-gray-400"
                  } ${
                    canNavigateBack
                      ? "cursor-pointer hover:scale-110"
                      : ""
                  }`}
                >
                  {status === "completed" ? (
                    <svg
                      className="w-4 h-4"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    step.number
                  )}
                </div>
                <span
                  className={`mt-2 text-xs font-medium transition-colors ${
                    status === "completed"
                      ? "text-green-600"
                      : status === "current"
                      ? "text-blue-600"
                      : "text-gray-400"
                  } ${
                    canNavigateBack
                      ? "cursor-pointer hover:underline"
                      : ""
                  }`}
                >
                  {step.label}
                </span>
              </div>

              {index < steps.length - 1 && (
                <div className="flex items-center mx-2 md:mx-4">
                  <div className="flex space-x-1">
                    <div
                      className={`w-1 h-1 rounded-full transition-colors ${
                        status === "completed" ? "bg-green-400" : "bg-gray-300"
                      }`}
                    ></div>
                    <div
                      className={`w-1 h-1 rounded-full transition-colors ${
                        status === "completed" ? "bg-green-400" : "bg-gray-300"
                      }`}
                    ></div>
                    <div
                      className={`w-1 h-1 rounded-full transition-colors ${
                        status === "completed" ? "bg-green-400" : "bg-gray-300"
                      }`}
                    ></div>
                    <div
                      className={`w-1 h-1 rounded-full transition-colors ${
                        status === "completed" ? "bg-green-400" : "bg-gray-300"
                      }`}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto lg:p-6 lg:pt-4">
        <div className="lg:bg-white lg:rounded-lg lg:shadow-sm py-4 lg:p-6 lg:mb-6">
          {renderProgressBar()}
        </div>

        <div className="lg:bg-white lg:rounded-lg lg:shadow-sm">
          <div className="p-6">{renderCurrentStep()}</div>
        </div>
      </div>
    </div>
  );
}