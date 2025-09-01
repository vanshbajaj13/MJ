"use client";
import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";

export default function AddressStep({
  phoneNumber,
  formData,
  setFormData,
  errors,
  setErrors,
  savedAddresses,
  setSavedAddresses,
  selectedAddress,
  setSelectedAddress,
  showAddressForm,
  setShowAddressForm,
  isAddingAddress,
  setIsAddingAddress,
  onAddressComplete,
  onBack,
}) {
  const contentRef = useRef(null);
  const [formHeight, setFormHeight] = useState("0px");

  // Update form height when it expands/collapses
  useEffect(() => {
    if (contentRef.current) {
      setFormHeight(
        showAddressForm ? `${contentRef.current.scrollHeight}px` : "0px"
      );
    }
  }, [showAddressForm, formData, errors]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = "Full name is required";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!formData.addressLine1.trim()) {
      newErrors.addressLine1 = "Address line 1 is required";
    }

    if (!formData.city.trim()) {
      newErrors.city = "City is required";
    }

    if (!formData.state.trim()) {
      newErrors.state = "State is required";
    }

    if (!formData.pincode.trim()) {
      newErrors.pincode = "PIN code is required";
    } else if (!/^\d{6}$/.test(formData.pincode)) {
      newErrors.pincode = "Please enter a valid 6-digit PIN code";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: "",
      }));
    }
  };

  const handleAddressSelect = (address) => {
    setSelectedAddress(address);
    // Collapse the form when an address is selected
    setShowAddressForm(false);
  };

  const handleAddNewAddress = () => {
    setSelectedAddress(null);
    setFormData({
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
    setErrors({});
    setShowAddressForm((prev) => !prev);
  };

  const handleAddressFormSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsAddingAddress(true);

    try {
      // Save address to the database
      const addressData = {
        ...formData,
        phoneNumber,
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
        // Add the new address to saved addresses
        setSavedAddresses((prev) => [...prev, savedAddress.address]);
        // Select the newly added address
        setSelectedAddress(savedAddress.address);
        // Collapse the form
        setShowAddressForm(false);
        // Reset form
        setFormData({
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
        setErrors({});
      } else {
        console.error("Failed to save address");
      }
    } catch (error) {
      console.error("Address save error:", error);
    } finally {
      setIsAddingAddress(false);
    }
  };

  const handleContinueToPayment = () => {
    if (selectedAddress) {
      onAddressComplete(selectedAddress);
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

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Saved Addresses Section */}
      {savedAddresses.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              Select Delivery Address
            </h3>
            <span className="text-sm text-gray-500">
              {savedAddresses.length} saved address
              {savedAddresses.length > 1 ? "es" : ""}
            </span>
          </div>

          <div className="space-y-3">
            {savedAddresses.map((address, index) => (
              <motion.div
                key={address._id || index}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className={`relative p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                  selectedAddress?._id === address._id
                    ? "border-gray-900 bg-gray-50 shadow-md"
                    : "border-gray-200 hover:border-gray-300 hover:shadow-sm"
                }`}
                onClick={() => handleAddressSelect(address)}
              >
                {/* Selection Indicator */}
                {selectedAddress?._id === address._id && (
                  <div className="absolute top-4 right-4 w-6 h-6 bg-gray-900 rounded-full flex items-center justify-center">
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
                )}

                <div className="pr-8">
                  <div className="flex items-center gap-2 mb-2">
                    <p className="font-semibold text-gray-900">
                      {address.fullName}
                    </p>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full capitalize">
                      {address.addressType}
                    </span>
                  </div>

                  <p className="text-sm text-gray-600 leading-relaxed">
                    {address.addressLine1}
                    {address.addressLine2 && `, ${address.addressLine2}`}
                    <br />
                    {address.city}, {address.state} - {address.pincode}
                  </p>

                  {address.landmark && (
                    <p className="text-sm text-gray-500 mt-2">
                      <span className="font-medium">Landmark:</span>{" "}
                      {address.landmark}
                    </p>
                  )}

                  <p className="text-sm text-gray-500 mt-2">{address.email}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Add New Address Toggle */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="border border-gray-200 rounded-xl overflow-hidden"
      >
        {/* Add Address Header */}
        <div
          onClick={handleAddNewAddress}
          className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
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
              <p className="font-medium text-gray-900">Add New Address</p>
              <p className="text-sm text-gray-500">
                {savedAddresses.length === 0
                  ? "No saved addresses found"
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

        {/* Collapsible Address Form */}
        <div
          ref={contentRef}
          style={{ maxHeight: formHeight }}
          className="overflow-hidden transition-all duration-700 ease-in-out"
        >
          <div className="border-t border-gray-100 p-6">
            <form onSubmit={handleAddressFormSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Full Name */}
                <div className="md:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) =>
                      handleInputChange("fullName", e.target.value)
                    }
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent outline-none transition-all ${
                      errors.fullName ? "border-red-500" : "border-gray-300"
                    }`}
                    placeholder="Enter your full name"
                  />
                  {errors.fullName && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-red-600 text-sm mt-1"
                    >
                      {errors.fullName}
                    </motion.p>
                  )}
                </div>

                {/* Email */}
                <div className="md:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent outline-none transition-all ${
                      errors.email ? "border-red-500" : "border-gray-300"
                    }`}
                    placeholder="Enter your email address"
                  />
                  {errors.email && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-red-600 text-sm mt-1"
                    >
                      {errors.email}
                    </motion.p>
                  )}
                </div>
              </div>

              {/* Address Line 1 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Address Line 1 *
                </label>
                <input
                  type="text"
                  value={formData.addressLine1}
                  onChange={(e) =>
                    handleInputChange("addressLine1", e.target.value)
                  }
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent outline-none transition-all ${
                    errors.addressLine1 ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder="House number, building name, street"
                />
                {errors.addressLine1 && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-red-600 text-sm mt-1"
                  >
                    {errors.addressLine1}
                  </motion.p>
                )}
              </div>

              {/* Address Line 2 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Address Line 2 (Optional)
                </label>
                <input
                  type="text"
                  value={formData.addressLine2}
                  onChange={(e) =>
                    handleInputChange("addressLine2", e.target.value)
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent outline-none transition-all"
                  placeholder="Area, locality, sector"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* City */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    City *
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => handleInputChange("city", e.target.value)}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent outline-none transition-all ${
                      errors.city ? "border-red-500" : "border-gray-300"
                    }`}
                    placeholder="Enter city"
                  />
                  {errors.city && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-red-600 text-sm mt-1"
                    >
                      {errors.city}
                    </motion.p>
                  )}
                </div>

                {/* State */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    State *
                  </label>
                  <select
                    value={formData.state}
                    onChange={(e) => handleInputChange("state", e.target.value)}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent outline-none transition-all ${
                      errors.state ? "border-red-500" : "border-gray-300"
                    }`}
                  >
                    <option value="">Select State</option>
                    {indianStates.map((state) => (
                      <option key={state} value={state}>
                        {state}
                      </option>
                    ))}
                  </select>
                  {errors.state && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-red-600 text-sm mt-1"
                    >
                      {errors.state}
                    </motion.p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* PIN Code */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    PIN Code *
                  </label>
                  <input
                    type="text"
                    value={formData.pincode}
                    onChange={(e) =>
                      handleInputChange(
                        "pincode",
                        e.target.value.replace(/\D/g, "").slice(0, 6)
                      )
                    }
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent outline-none transition-all ${
                      errors.pincode ? "border-red-500" : "border-gray-300"
                    }`}
                    placeholder="123456"
                    maxLength={6}
                  />
                  {errors.pincode && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-red-600 text-sm mt-1"
                    >
                      {errors.pincode}
                    </motion.p>
                  )}
                </div>

                {/* Address Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Address Type
                  </label>
                  <select
                    value={formData.addressType}
                    onChange={(e) =>
                      handleInputChange("addressType", e.target.value)
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent outline-none transition-all"
                  >
                    <option value="home">Home</option>
                    <option value="office">Office</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              {/* Landmark */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Landmark (Optional)
                </label>
                <input
                  type="text"
                  value={formData.landmark}
                  onChange={(e) =>
                    handleInputChange("landmark", e.target.value)
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent outline-none transition-all"
                  placeholder="Near hospital, mall, etc."
                />
              </div>

              {/* Form Actions */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddressForm(false);
                    setErrors({});
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

      {/* Continue Button - Only show when address is selected */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row gap-4 pt-6"
      >
        <motion.button
          type="button"
          onClick={onBack}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full sm:w-auto px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Back
        </motion.button>
        {selectedAddress && (
          <motion.button
            onClick={handleContinueToPayment}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex-1 sm:flex-none sm:px-8 py-3 bg-gray-900 hover:bg-gray-800 text-white rounded-lg font-medium transition-colors"
          >
            Continue to Payment
          </motion.button>
        )}
      </motion.div>

      {/* Help Text */}
      {!selectedAddress && savedAddresses.length > 0 && (
        <div className="text-center text-sm text-gray-500 pt-4">
          Please select an existing address or add a new one to continue
        </div>
      )}
    </div>
  );
}