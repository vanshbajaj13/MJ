"use client";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "@/context/CartContext";

const CHECKOUT_STEPS = {
  VERIFICATION: 1,
  ADDRESS: 2,
  PAYMENT: 3,
};

// Loading skeleton for saved addresses
const AddressCardSkeleton = () => (
  <div className="animate-pulse">
    <div className="p-4 border-2 border-gray-200 rounded-xl">
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2">
          <div className="h-5 bg-gray-200 rounded w-32"></div>
          <div className="h-5 bg-gray-100 rounded w-12"></div>
        </div>
        <div className="w-6 h-6 bg-gray-200 rounded-full"></div>
      </div>
      <div className="space-y-2">
        <div className="h-4 bg-gray-200 rounded w-full"></div>
        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        <div className="h-4 bg-gray-100 rounded w-1/2"></div>
      </div>
    </div>
  </div>
);

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
  mobile = false,
}) {
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
  const [addressFormData, setAddressFormData] = useState({
    fullName: "",
    email: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    pincode: "",
    landmark: "",
    addressType: "home",
  });
  const [addressErrors, setAddressErrors] = useState({});
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(false);
  const contentRef = useRef(null);
  const [formHeight, setFormHeight] = useState("0px");

  // Payment state
  const [paymentMethod, setPaymentMethod] = useState("razorpay");

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

  // Update form height for address form
  useEffect(() => {
    if (contentRef.current) {
      setFormHeight(
        showAddressForm ? `${contentRef.current.scrollHeight}px` : "0px"
      );
    }
  }, [showAddressForm, addressFormData, addressErrors]);

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

            // Pre-load addresses in background
            loadSavedAddresses(data.phoneNumber);
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

  // Load saved addresses with loading state
  const loadSavedAddresses = async (phoneNumber = verifiedPhone) => {
    if (!phoneNumber) return;

    try {
      setIsLoadingAddresses(true);
      const response = await fetch(
        `/api/user/addresses?phone=${encodeURIComponent(phoneNumber)}`
      );
      if (response.ok) {
        const data = await response.json();
        setSavedAddresses(data.addresses || []);
      }
    } catch (error) {
      console.error("Failed to load addresses:", error);
    } finally {
      setIsLoadingAddresses(false);
    }
  };

  // Load addresses when phone is verified (but not during initial session check)
  useEffect(() => {
    if (
      verifiedPhone &&
      sessionCheckComplete &&
      currentStep >= CHECKOUT_STEPS.ADDRESS
    ) {
      loadSavedAddresses();
    }
  }, [verifiedPhone, sessionCheckComplete, currentStep]);

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

  // Address functions
  const validateAddressForm = () => {
    const newErrors = {};

    if (!addressFormData.fullName.trim()) {
      newErrors.fullName = "Full name is required";
    }

    if (!addressFormData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addressFormData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!addressFormData.addressLine1.trim()) {
      newErrors.addressLine1 = "Address line 1 is required";
    }

    if (!addressFormData.city.trim()) {
      newErrors.city = "City is required";
    }

    if (!addressFormData.state.trim()) {
      newErrors.state = "State is required";
    }

    if (!addressFormData.pincode.trim()) {
      newErrors.pincode = "PIN code is required";
    } else if (!/^\d{6}$/.test(addressFormData.pincode)) {
      newErrors.pincode = "Please enter a valid 6-digit PIN code";
    }

    setAddressErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddressInputChange = (field, value) => {
    setAddressFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    if (addressErrors[field]) {
      setAddressErrors((prev) => ({
        ...prev,
        [field]: "",
      }));
    }
  };

  const handleAddressSelect = (address) => {
    setSelectedAddress(address);
    setShowAddressForm(false);
  };

  const handleAddNewAddress = () => {
    setSelectedAddress(null);
    setAddressFormData({
      fullName: "",
      email: "",
      addressLine1: "",
      addressLine2: "",
      city: "",
      state: "",
      pincode: "",
      landmark: "",
      addressType: "home",
    });
    setAddressErrors({});
    setShowAddressForm((prev) => !prev);
  };

  const handleAddressFormSubmit = async (e) => {
    e.preventDefault();

    if (!validateAddressForm()) {
      return;
    }

    setIsAddingAddress(true);

    try {
      const addressData = {
        ...addressFormData,
        phoneNumber: verifiedPhone,
      };

      const response = await fetch("/api/user/addresses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(addressData),
      });

      if (response.ok) {
        const savedAddress = await response.json();
        setSavedAddresses((prev) => [...prev, savedAddress.address]);
        setSelectedAddress(savedAddress.address);
        setShowAddressForm(false);
        setAddressFormData({
          fullName: "",
          email: "",
          addressLine1: "",
          addressLine2: "",
          city: "",
          state: "",
          pincode: "",
          landmark: "",
          addressType: "home",
        });
        setAddressErrors({});
      } else {
        console.error("Failed to save address");
      }
    } catch (error) {
      console.error("Address save error:", error);
    } finally {
      setIsAddingAddress(false);
    }
  };

  // Enhanced payment handler with validation
  const handlePayment = async () => {
    setLoading(true);

    try {
      // Final validation before payment
      const isValid = await validateCheckout();
      if (!isValid) {
        setLoading(false);
        return;
      }

      // Use validated pricing for payment
      const finalAmount = validatedPricing.finalTotal;

      const orderData = {
        shippingAddress: selectedAddress,
        paymentMethod,
        // Server will re-validate everything
      };

      const response = await fetch("/api/orders/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(orderData),
      });

      if (response.ok) {
        const order = await response.json();
        clearCart();
        window.location.href = `/order-confirmation?orderId=${order.order.orderId}`;
      } else {
        const error = await response.json();
        throw new Error(error.message || "Failed to create order");
      }
    } catch (error) {
      console.error("Payment error:", error);
      alert(`Payment failed: ${error.message}`);
    } finally {
      setLoading(false);
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
    } else if (step === CHECKOUT_STEPS.ADDRESS) {
      setAddressErrors({});
    }
  };

  const indianStates = [
    "Andhra Pradesh",
    "Arunachal Pradesh",
    "Assam",
    "Bihar",
    "Chhattisgarh",
    "Goa",
    "Gujarat",
    "Haryana",
    "Himachal Pradesh",
    "Jharkhand",
    "Karnataka",
    "Kerala",
    "Madhya Pradesh",
    "Maharashtra",
    "Manipur",
    "Meghalaya",
    "Mizoram",
    "Nagaland",
    "Odisha",
    "Punjab",
    "Rajasthan",
    "Sikkim",
    "Tamil Nadu",
    "Telangana",
    "Tripura",
    "Uttar Pradesh",
    "Uttarakhand",
    "West Bengal",
    "Andaman and Nicobar Islands",
    "Chandigarh",
    "Dadra and Nagar Haveli and Daman and Diu",
    "Lakshadweep",
    "Delhi",
    "Puducherry",
    "Ladakh",
    "Jammu and Kashmir",
  ];

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
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-r-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent outline-none transition-all"
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
                    : "bg-gray-900 hover:bg-gray-800"
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
                    className="w-10 h-12 text-center text-lg font-bold border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent outline-none transition-all"
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
                    className="text-sm text-gray-900 font-medium hover:underline disabled:opacity-50"
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
                      className="rounded-full h-4 w-4 border-2 border-gray-400 border-t-gray-900 mr-2"
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

  // Enhanced address step with better UI and loading states
  const renderAddressStep = () => (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Saved Addresses Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            Select Delivery Address
          </h3>
          {!isLoadingAddresses && savedAddresses.length > 0 && (
            <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
              {savedAddresses.length} saved address
              {savedAddresses.length > 1 ? "es" : ""}
            </span>
          )}
        </div>

        {/* Loading State for Addresses */}
        {isLoadingAddresses ? (
          <div className="space-y-4">
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center text-gray-600">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                  className="rounded-full h-5 w-5 border-2 border-gray-400 border-t-gray-900 mr-3"
                />
                <span className="text-sm">Loading your saved addresses...</span>
              </div>
            </div>
            {[1, 2].map((i) => (
              <AddressCardSkeleton key={i} />
            ))}
          </div>
        ) : savedAddresses.length > 0 ? (
          /* Saved Addresses List */
          <div className="space-y-3">
            {savedAddresses.map((address, index) => (
              <motion.div
                key={address._id || index}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className={`group relative p-5 border-2 rounded-2xl cursor-pointer transition-all duration-300 ${
                  selectedAddress?._id === address._id
                    ? "border-gray-900 bg-gradient-to-br from-gray-50 to-white shadow-lg ring-1 ring-gray-900/5"
                    : "border-gray-200 hover:border-gray-300 hover:shadow-md hover:bg-gray-50/50"
                }`}
                onClick={() => handleAddressSelect(address)}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                {/* Selection Indicator */}
                {selectedAddress?._id === address._id && (
                  <div className="absolute bottom-4 right-4 w-6 h-6 bg-green-100  rounded-full flex items-center justify-center shadow-sm">
                    <motion.svg
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-4 h-4 text-green-500"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </motion.svg>
                  </div>
                )}
                <div className="absolute top-4 right-4 w-6 h-6  rounded-full flex items-center justify-center shadow-sm">
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded-full capitalize bg-gray-400 text-white`}
                  >
                    {address.addressType}
                  </span>
                </div>

                <div className="pr-8">
                  {/* Header with name and type */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <svg
                        className="w-4 h-4 text-gray-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </svg>
                      <p className="font-semibold text-gray-900 text-lg">
                        {address.fullName}
                      </p>
                    </div>
                  </div>

                  {/* Address Details */}
                  <div className="space-y-2">
                    <p className="text-gray-700 leading-relaxed">
                      <span className="inline-flex items-center gap-1 mb-1">
                        <svg
                          className="w-4 h-4 text-gray-400"
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
                      </span>
                      {address.addressLine1}
                      {address.addressLine2 && `, ${address.addressLine2}`}
                      <br />
                      {address.city}, {address.state} -{" "}
                      <span className="font-medium">{address.pincode}</span>
                    </p>

                    {/* {address.landmark && (
                      <p className="text-sm text-gray-500 flex items-center gap-1">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2v16z" />
                        </svg>
                        <span className="font-medium">Landmark:</span> {address.landmark}
                      </p>
                    )} */}

                    {/* <p className="text-sm text-gray-500 flex items-center gap-1">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      {address.email}
                    </p> */}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          /* No Addresses Found */
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-gray-400"
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
            <p className="text-gray-600 mb-2">No saved addresses found</p>
            <p className="text-sm text-gray-500">
              Add your first delivery address below
            </p>
          </div>
        )}
      </motion.div>

      {/* Add New Address Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200"
      >
        <div
          onClick={handleAddNewAddress}
          className="flex items-center justify-between p-5 cursor-pointer hover:bg-gray-50 transition-colors group"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-gradient-to-br from-gray-100 to-gray-50 rounded-full flex items-center justify-center group-hover:from-gray-200 group-hover:to-gray-100 transition-all duration-200">
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
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-lg">
                Add New Address
              </p>
              <p className="text-sm text-gray-500">
                {savedAddresses.length === 0
                  ? "Add your delivery address to continue"
                  : "Save address for future orders"}
              </p>
            </div>
          </div>

          <div className="relative w-5 h-5">
            <span
              className={`ico-plus ${showAddressForm ? "open" : ""}`}
              style={{ color: "#6B7280" }}
            />
          </div>
        </div>

        {/* Address Form */}
        <div
          ref={contentRef}
          style={{ maxHeight: formHeight }}
          className="overflow-hidden transition-all duration-700 ease-in-out"
        >
          <div className="border-t border-gray-100 p-6 bg-gray-50/30">
            <form onSubmit={handleAddressFormSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={addressFormData.fullName}
                    onChange={(e) =>
                      handleAddressInputChange("fullName", e.target.value)
                    }
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent outline-none transition-all ${
                      addressErrors.fullName
                        ? "border-red-500 bg-red-50"
                        : "border-gray-300 bg-white"
                    }`}
                    placeholder="Enter your full name"
                  />
                  {addressErrors.fullName && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-red-600 text-sm mt-1 flex items-center gap-1"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                      {addressErrors.fullName}
                    </motion.p>
                  )}
                </div>

                <div className="md:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    value={addressFormData.email}
                    onChange={(e) =>
                      handleAddressInputChange("email", e.target.value)
                    }
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent outline-none transition-all ${
                      addressErrors.email
                        ? "border-red-500 bg-red-50"
                        : "border-gray-300 bg-white"
                    }`}
                    placeholder="Enter your email address"
                  />
                  {addressErrors.email && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-red-600 text-sm mt-1 flex items-center gap-1"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                      {addressErrors.email}
                    </motion.p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Address Line 1 *
                </label>
                <input
                  type="text"
                  value={addressFormData.addressLine1}
                  onChange={(e) =>
                    handleAddressInputChange("addressLine1", e.target.value)
                  }
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent outline-none transition-all ${
                    addressErrors.addressLine1
                      ? "border-red-500 bg-red-50"
                      : "border-gray-300 bg-white"
                  }`}
                  placeholder="House number, building name, street"
                />
                {addressErrors.addressLine1 && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-red-600 text-sm mt-1 flex items-center gap-1"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {addressErrors.addressLine1}
                  </motion.p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Address Line 2 (Optional)
                </label>
                <input
                  type="text"
                  value={addressFormData.addressLine2}
                  onChange={(e) =>
                    handleAddressInputChange("addressLine2", e.target.value)
                  }
                  className="w-full px-4 py-3 border border-gray-300 bg-white rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent outline-none transition-all"
                  placeholder="Area, locality, sector"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    City *
                  </label>
                  <input
                    type="text"
                    value={addressFormData.city}
                    onChange={(e) =>
                      handleAddressInputChange("city", e.target.value)
                    }
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent outline-none transition-all ${
                      addressErrors.city
                        ? "border-red-500 bg-red-50"
                        : "border-gray-300 bg-white"
                    }`}
                    placeholder="Enter city"
                  />
                  {addressErrors.city && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-red-600 text-sm mt-1 flex items-center gap-1"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                      {addressErrors.city}
                    </motion.p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    State *
                  </label>
                  <select
                    value={addressFormData.state}
                    onChange={(e) =>
                      handleAddressInputChange("state", e.target.value)
                    }
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent outline-none transition-all ${
                      addressErrors.state
                        ? "border-red-500 bg-red-50"
                        : "border-gray-300 bg-white"
                    }`}
                  >
                    <option value="">Select State</option>
                    {indianStates.map((state) => (
                      <option key={state} value={state}>
                        {state}
                      </option>
                    ))}
                  </select>
                  {addressErrors.state && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-red-600 text-sm mt-1 flex items-center gap-1"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                      {addressErrors.state}
                    </motion.p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    PIN Code *
                  </label>
                  <input
                    type="text"
                    value={addressFormData.pincode}
                    onChange={(e) =>
                      handleAddressInputChange(
                        "pincode",
                        e.target.value.replace(/\D/g, "").slice(0, 6)
                      )
                    }
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent outline-none transition-all ${
                      addressErrors.pincode
                        ? "border-red-500 bg-red-50"
                        : "border-gray-300 bg-white"
                    }`}
                    placeholder="123456"
                    maxLength={6}
                  />
                  {addressErrors.pincode && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-red-600 text-sm mt-1 flex items-center gap-1"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                      {addressErrors.pincode}
                    </motion.p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Address Type
                  </label>
                  <select
                    value={addressFormData.addressType}
                    onChange={(e) =>
                      handleAddressInputChange("addressType", e.target.value)
                    }
                    className="w-full px-4 py-3 border border-gray-300 bg-white rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent outline-none transition-all"
                  >
                    <option value="home">🏠 Home</option>
                    <option value="office">🏢 Office</option>
                    <option value="other">📍 Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Landmark (Optional)
                </label>
                <input
                  type="text"
                  value={addressFormData.landmark}
                  onChange={(e) =>
                    handleAddressInputChange("landmark", e.target.value)
                  }
                  className="w-full px-4 py-3 border border-gray-300 bg-white rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent outline-none transition-all"
                  placeholder="Near hospital, mall, etc."
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddressForm(false);
                    setAddressErrors({});
                  }}
                  className="w-full sm:w-auto px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isAddingAddress}
                  className={`flex-1 sm:flex-none sm:px-8 py-3 rounded-lg font-medium transition-all ${
                    isAddingAddress
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-gray-900 hover:bg-gray-800"
                  } text-white`}
                >
                  {isAddingAddress ? (
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
                      Saving Address...
                    </div>
                  ) : (
                    "Save Address"
                  )}
                </button>
              </div>
            </form>
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
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row gap-4 pt-6"
      >
        <motion.button
          type="button"
          onClick={() => {
            setPhoneStep("phone");
            setOtp(["", "", "", "", "", ""]);
            setPhoneError("");
            setResendTimer(0);
            handleBackToStep(CHECKOUT_STEPS.VERIFICATION);
          }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full sm:w-auto px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Back
        </motion.button>
        {selectedAddress && (
          <motion.button
            onClick={() => setCurrentStep(CHECKOUT_STEPS.PAYMENT)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex-1 sm:flex-none sm:px-8 py-3 bg-gray-900 hover:bg-gray-800 text-white rounded-lg font-medium transition-colors"
          >
            Continue to Payment
          </motion.button>
        )}
      </motion.div>

      {!selectedAddress && savedAddresses.length > 0 && (
        <div className="text-center text-sm text-gray-500 pt-4">
          Please select an existing address or add a new one to continue
        </div>
      )}
    </div>
  );

  // Render payment step
   const renderPaymentStep = () => (
    <div className="max-w-2xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8"
      >
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Order Summary
          </h3>

          {/* Customer & Address Info */}
          <div className="mb-4 pb-4 border-b border-gray-200">
            <p className="font-medium text-gray-900">
              {selectedAddress.fullName}
            </p>
            <p className="text-sm text-gray-600">{verifiedPhone}</p>
            <p className="text-sm text-gray-600">{selectedAddress.email}</p>
          </div>

          <div className="mb-4 pb-4 border-b border-gray-200">
            <h4 className="font-medium text-gray-900 mb-2">Shipping Address</h4>
            <div className="text-sm text-gray-600">
              <p>{selectedAddress.addressLine1}</p>
              {selectedAddress.addressLine2 && (
                <p>{selectedAddress.addressLine2}</p>
              )}
              <p>
                {selectedAddress.city}, {selectedAddress.state} -{" "}
                {selectedAddress.pincode}
              </p>
            </div>
          </div>

          {/* Items */}
          <div className="space-y-3 mb-4 pb-4 border-b border-gray-200">
            {items.map((item) => (
              <div
                key={`${item.productId}-${item.size}`}
                className="flex justify-between items-center"
              >
                <div>
                  <p className="font-medium text-gray-900">{item.name}</p>
                  <p className="text-sm text-gray-600">
                    Size: {item.size} • Qty: {item.quantity}
                  </p>
                </div>
                <p className="font-semibold text-gray-900">
                  ₹{(item.price * item.quantity).toFixed(2)}
                </p>
              </div>
            ))}
          </div>

          {/* Pricing Breakdown */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal</span>
              <span className="text-gray-900">₹{(totalPrice + (discountAmount || 0)).toFixed(2)}</span>
            </div>
            
            {appliedCoupon && discountAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Discount ({appliedCoupon.code})</span>
                <span className="text-green-600">-₹{discountAmount.toFixed(2)}</span>
              </div>
            )}
            
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Shipping</span>
              <span className="text-green-600">Free</span>
            </div>
            
            <div className="border-t border-gray-200 pt-2 flex justify-between font-bold text-lg">
              <span className="text-gray-900">Total</span>
              <span className="text-gray-900">₹{totalPrice.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Payment Method Selection */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Payment Method
          </h3>
          <div className="space-y-3">
            <label className="flex items-center p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
              <input
                type="radio"
                name="payment"
                value="razorpay"
                checked={paymentMethod === "razorpay"}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="mr-4"
              />
              <div className="flex items-center">
                <div className="w-12 h-8 bg-blue-600 rounded mr-3 flex items-center justify-center">
                  <span className="text-white text-xs font-bold">PAY</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Online Payment</p>
                  <p className="text-sm text-gray-600">
                    Pay securely with UPI, Card, or Net Banking
                  </p>
                </div>
              </div>
            </label>

            <label className="flex items-center p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
              <input
                type="radio"
                name="payment"
                value="cod"
                checked={paymentMethod === "cod"}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="mr-4"
              />
              <div className="flex items-center">
                <div className="w-12 h-8 bg-green-600 rounded mr-3 flex items-center justify-center">
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
                <div>
                  <p className="font-medium text-gray-900">Cash on Delivery</p>
                  <p className="text-sm text-gray-600">
                    Pay when your order is delivered
                  </p>
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Security Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <svg
              className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0"
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
              <p className="font-medium text-blue-900 mb-1">Secure Payment</p>
              <p className="text-sm text-blue-800">
                Your payment information is encrypted and secure. We never store
                your card details.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 pt-6">
          <motion.button
            type="button"
            onClick={() => handleBackToStep(CHECKOUT_STEPS.ADDRESS)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full sm:w-auto px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Back to Address
          </motion.button>

          <motion.button
            onClick={handlePayment}
            disabled={loading}
            whileHover={{ scale: loading ? 1 : 1.02 }}
            whileTap={{ scale: loading ? 1 : 0.98 }}
            className={`flex-1 sm:flex-none sm:px-8 py-3 rounded-lg font-medium transition-all ${
              loading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-gray-900 hover:bg-gray-800"
            } text-white`}
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"
                />
                Processing...
              </div>
            ) : (
              <>
                {paymentMethod === "cod"
                  ? "Place Order"
                  : `Pay ₹${totalPrice.toFixed(2)}`}
              </>
            )}
          </motion.button>
        </div>
      </motion.div>
    </div>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case CHECKOUT_STEPS.VERIFICATION:
        return renderPhoneVerification();
      case CHECKOUT_STEPS.ADDRESS:
        return renderAddressStep();
      case CHECKOUT_STEPS.PAYMENT:
        return renderPaymentStep();
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
        } else if (stepKey === CHECKOUT_STEPS.ADDRESS) {
          setAddressErrors({});
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
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                    status === "completed"
                      ? "bg-green-500 text-white"
                      : status === "current"
                      ? "bg-gray-900 text-white"
                      : "bg-gray-200 text-gray-400"
                  } ${
                    canNavigateBack
                      ? "cursor-pointer hover:underline hover:text-green-700"
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
                      ? "text-gray-900"
                      : "text-gray-400"
                  } ${
                    canNavigateBack
                      ? "cursor-pointer hover:underline hover:text-green-700"
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
                      className={`w-1 h-1 rounded-full ${
                        status === "completed" ? "bg-green-400" : "bg-gray-300"
                      }`}
                    ></div>
                    <div
                      className={`w-1 h-1 rounded-full ${
                        status === "completed" ? "bg-green-400" : "bg-gray-300"
                      }`}
                    ></div>
                    <div
                      className={`w-1 h-1 rounded-full ${
                        status === "completed" ? "bg-green-400" : "bg-gray-300"
                      }`}
                    ></div>
                    <div
                      className={`w-1 h-1 rounded-full ${
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
