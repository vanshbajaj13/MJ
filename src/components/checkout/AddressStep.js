// src/components/checkout/AddressStep.js
"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

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

const DeleteConfirmationModal = ({ isOpen, onClose, onConfirm, isDeleting }) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
        >
          <div className="text-center">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Address?</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this address?
            </p>
            <div className="flex gap-3">
              <button
                onClick={onConfirm}
                disabled={isDeleting}
                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeleting ? (
                  <div className="flex items-center justify-center">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-2"
                    />
                    Deleting...
                  </div>
                ) : (
                  'Delete'
                )}
              </button>
              <button
                onClick={onClose}
                disabled={isDeleting}
                className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

const Toast = ({ message, type, onClose }) => (
  <motion.div
    initial={{ opacity: 0, y: -50 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -50 }}
    className="fixed top-4 right-4 z-50"
  >
    <div className={`px-6 py-4 rounded-xl shadow-lg ${
      type === 'success' ? 'bg-green-600' : 'bg-red-600'
    } text-white flex items-center gap-3 min-w-[300px]`}>
      {type === 'success' ? (
        <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      ) : (
        <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
      )}
      <span className="font-medium">{message}</span>
      <button onClick={onClose} className="ml-auto">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>
    </div>
  </motion.div>
);

const PincodeChecker = ({ 
  pincode, 
  setPincode, 
  onPincodeVerified, 
  addressFormData, 
  setAddressFormData, 
  addressErrors, 
  setAddressErrors 
}) => {
  const [isChecking, setIsChecking] = useState(false);
  const [pincodeStatus, setPincodeStatus] = useState(null);

  const checkPincode = async (code) => {
    if (!/^\d{6}$/.test(code)) {
      setPincodeStatus({ error: 'Please enter a valid 6-digit PIN code' });
      return;
    }

    setIsChecking(true);
    setPincodeStatus(null);

    try {
      const response = await fetch('/api/shipping/check-pincode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pincode: code }),
      });

      const data = await response.json();

      if (data.deliverable) {
        setPincodeStatus({ 
          success: true, 
          message: `Delivery available to ${data.city}, ${data.state}` 
        });
        
        setAddressFormData(prev => ({
          ...prev,
          city: data.city,
          state: data.state,
          pincode: code,
        }));

        setAddressErrors(prev => ({
          ...prev,
          city: '',
          state: '',
          pincode: '',
        }));

        onPincodeVerified(data);
      } else {
        setPincodeStatus({ 
          error: data.error || 'Delivery not available to this PIN code' 
        });
      }
    } catch (error) {
      setPincodeStatus({ 
        error: 'Failed to check delivery availability. Please try again.' 
      });
    } finally {
      setIsChecking(false);
    }
  };

  const handlePincodeChange = (value) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 6);
    setPincode(cleaned);
    
    if (cleaned.length === 6) {
      checkPincode(cleaned);
    } else {
      setPincodeStatus(null);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-900 mb-2">
          PIN Code *
        </label>
        <div className="relative">
          <input
            type="text"
            value={pincode}
            onChange={(e) => handlePincodeChange(e.target.value)}
            className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-black focus:border-black outline-none transition-all ${
              pincodeStatus?.error
                ? "border-red-500 bg-red-50"
                : pincodeStatus?.success
                ? "border-green-500 bg-green-50"
                : "border-gray-200 bg-white"
            }`}
            placeholder="Enter 6-digit PIN code"
            maxLength={6}
          />
          {isChecking && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-5 h-5 border-2 border-gray-900 border-t-transparent rounded-full"
              />
            </div>
          )}
        </div>

        <AnimatePresence mode="wait">
          {pincodeStatus && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`mt-2 p-3 rounded-xl text-sm font-medium ${
                pincodeStatus.success 
                  ? 'bg-green-50 text-green-800 border border-green-200' 
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              {pincodeStatus.message || pincodeStatus.error}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

const AddressForm = ({ 
  addressFormData, 
  setAddressFormData, 
  addressErrors, 
  setAddressErrors,
  onSubmit, 
  onCancel, 
  isSubmitting,
  isEditing = false,
}) => {
  const [pincode, setPincode] = useState(addressFormData.pincode || '');
  const [isPincodeVerified, setIsPincodeVerified] = useState(!!addressFormData.city);

  const handleInputChange = (field, value) => {
    setAddressFormData(prev => ({ ...prev, [field]: value }));
    if (addressErrors[field]) {
      setAddressErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handlePincodeVerified = (data) => {
    setIsPincodeVerified(true);
  };

  const validateForm = () => {
    const errors = {};

    if (!addressFormData.fullName.trim()) errors.fullName = 'Full name is required';
    if (!addressFormData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addressFormData.email)) {
      errors.email = 'Please enter a valid email';
    }
    if (!addressFormData.addressLine1.trim()) errors.addressLine1 = 'Address is required';
    if (!isPincodeVerified) errors.pincode = 'Please verify PIN code';

    setAddressErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(addressFormData);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <PincodeChecker
        pincode={pincode}
        setPincode={setPincode}
        onPincodeVerified={handlePincodeVerified}
        addressFormData={addressFormData}
        setAddressFormData={setAddressFormData}
        addressErrors={addressErrors}
        setAddressErrors={setAddressErrors}
      />

      <AnimatePresence>
        {isPincodeVerified && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-5"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Full Name *</label>
                <input
                  type="text"
                  value={addressFormData.fullName}
                  onChange={(e) => handleInputChange('fullName', e.target.value)}
                  className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-black focus:border-black outline-none transition-all ${
                    addressErrors.fullName ? 'border-red-500 bg-red-50' : 'border-gray-200'
                  }`}
                  placeholder="Your full name"
                />
                {addressErrors.fullName && (
                  <p className="text-red-600 text-sm mt-1">{addressErrors.fullName}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Email *</label>
                <input
                  type="email"
                  value={addressFormData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-black focus:border-black outline-none transition-all ${
                    addressErrors.email ? 'border-red-500 bg-red-50' : 'border-gray-200'
                  }`}
                  placeholder="your@email.com"
                />
                {addressErrors.email && (
                  <p className="text-red-600 text-sm mt-1">{addressErrors.email}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">House/Flat/Building *</label>
              <input
                type="text"
                value={addressFormData.addressLine1}
                onChange={(e) => handleInputChange('addressLine1', e.target.value)}
                className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-black focus:border-black outline-none transition-all ${
                  addressErrors.addressLine1 ? 'border-red-500 bg-red-50' : 'border-gray-200'
                }`}
                placeholder="House/Flat No., Building name"
              />
              {addressErrors.addressLine1 && (
                <p className="text-red-600 text-sm mt-1">{addressErrors.addressLine1}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">Road/Area/Colony</label>
              <input
                type="text"
                value={addressFormData.addressLine2}
                onChange={(e) => handleInputChange('addressLine2', e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black outline-none transition-all"
                placeholder="Optional"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">Landmark</label>
              <input
                type="text"
                value={addressFormData.landmark}
                onChange={(e) => handleInputChange('landmark', e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black outline-none transition-all"
                placeholder="Optional"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">City *</label>
                <input
                  type="text"
                  value={addressFormData.city}
                  readOnly
                  className="w-full px-4 py-3 border-2 border-gray-200 bg-gray-50 rounded-xl cursor-not-allowed text-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">State *</label>
                <input
                  type="text"
                  value={addressFormData.state}
                  readOnly
                  className="w-full px-4 py-3 border-2 border-gray-200 bg-gray-50 rounded-xl cursor-not-allowed text-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Address Type</label>
                <select
                  value={addressFormData.addressType}
                  onChange={(e) => handleInputChange('addressType', e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black outline-none transition-all"
                >
                  <option value="home">Home</option>
                  <option value="office">Office</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onCancel}
                className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 py-3 bg-black text-white rounded-xl hover:bg-gray-800 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-2"
                    />
                    {isEditing ? 'Updating...' : 'Saving...'}
                  </div>
                ) : (
                  <>{isEditing ? 'Update Address' : 'Save Address'}</>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </form>
  );
};

const AddressStep = ({ verifiedPhone, onContinue, onBack }) => {
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(false);
  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [addressToDelete, setAddressToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toast, setToast] = useState(null);

  const [addressFormData, setAddressFormData] = useState({
    fullName: "", email: "", addressLine1: "", addressLine2: "",
    city: "", state: "", pincode: "", landmark: "", addressType: "home",
  });
  const [addressErrors, setAddressErrors] = useState({});

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadSavedAddresses = async () => {
    if (!verifiedPhone) return;
    try {
      setIsLoadingAddresses(true);
      const response = await fetch(`/api/user/addresses?phone=${encodeURIComponent(verifiedPhone)}`);
      if (response.ok) {
        const data = await response.json();
        setSavedAddresses(data.addresses || []);
        const defaultAddress = data.addresses?.find(addr => addr.isDefault);
        if (defaultAddress && !selectedAddress) {
          setSelectedAddress(defaultAddress);
        }
      }
    } catch (error) {
      showToast('Failed to load addresses', 'error');
    } finally {
      setIsLoadingAddresses(false);
    }
  };

  useEffect(() => {
    loadSavedAddresses();
  }, [verifiedPhone]);

  const handleAddressSelect = (address) => {
    setSelectedAddress(address);
    setShowAddressForm(false);
    setIsEditingAddress(false);
    setEditingAddressId(null);
  };

  const handleAddNewAddress = () => {
    setSelectedAddress(null);
    setAddressFormData({
      fullName: "", email: "", addressLine1: "", addressLine2: "",
      city: "", state: "", pincode: "", landmark: "", addressType: "home",
    });
    setAddressErrors({});
    setIsEditingAddress(false);
    setEditingAddressId(null);
    setShowAddressForm(prev => !prev);
  };

  const handleEditAddress = (address) => {
    setAddressFormData({
      fullName: address.fullName || "", email: address.email || "",
      addressLine1: address.addressLine1 || "", addressLine2: address.addressLine2 || "",
      city: address.city || "", state: address.state || "",
      pincode: address.pincode || "", landmark: address.landmark || "",
      addressType: address.addressType || "home",
    });
    setAddressErrors({});
    setIsEditingAddress(true);
    setEditingAddressId(address._id);
    setShowAddressForm(true);
  };

  const handleAddressFormSubmit = async (formData) => {
    setIsAddingAddress(true);
    try {
      const addressData = { ...formData, phoneNumber: verifiedPhone };
      let response;
      
      if (isEditingAddress) {
        response = await fetch(`/api/user/addresses?id=${editingAddressId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(addressData),
        });
      } else {
        response = await fetch('/api/user/addresses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(addressData),
        });
      }

      if (response.ok) {
        const result = await response.json();
        
        if (isEditingAddress) {
          setSavedAddresses(prev => prev.map(addr => addr._id === editingAddressId ? result.address : addr));
          if (selectedAddress?._id === editingAddressId) {
            setSelectedAddress(result.address);
          }
          showToast('Address updated successfully');
        } else {
          setSavedAddresses(prev => [...prev, result.address]);
          setSelectedAddress(result.address);
          showToast('Address saved successfully');
        }

        setShowAddressForm(false);
        setIsEditingAddress(false);
        setEditingAddressId(null);
        setAddressFormData({
          fullName: "", email: "", addressLine1: "", addressLine2: "",
          city: "", state: "", pincode: "", landmark: "", addressType: "home",
        });
      } else {
        showToast('Failed to save address', 'error');
      }
    } catch (error) {
      showToast('An error occurred', 'error');
    } finally {
      setIsAddingAddress(false);
    }
  };

  const handleDeleteClick = (address) => {
    setAddressToDelete(address);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!addressToDelete) return;
    
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/user/addresses?id=${addressToDelete._id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setSavedAddresses(prev => prev.filter(addr => addr._id !== addressToDelete._id));
        if (selectedAddress?._id === addressToDelete._id) {
          setSelectedAddress(null);
        }
        showToast('Address deleted successfully');
        setDeleteModalOpen(false);
        setAddressToDelete(null);
      } else {
        showToast('Failed to delete address', 'error');
      }
    } catch (error) {
      showToast('An error occurred', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleContinue = () => {
    if (selectedAddress) {
      onContinue(selectedAddress);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <AnimatePresence>
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </AnimatePresence>

      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setAddressToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleting}
      />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Delivery Address</h2>
        <p className="text-gray-600">Choose where you'd like your order delivered</p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-4">
        {isLoadingAddresses ? (
          <div className="space-y-4">
            {[1, 2].map((i) => <AddressCardSkeleton key={i} />)}
          </div>
        ) : savedAddresses.length > 0 ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Your Addresses</h3>
              <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                {savedAddresses.length} saved
              </span>
            </div>

            {savedAddresses.map((address, index) => (
              <motion.div
                key={address._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`group relative p-5 border-2 rounded-2xl transition-all cursor-pointer ${
                  selectedAddress?._id === address._id
                    ? "border-black bg-gray-50 shadow-md"
                    : "border-gray-200 hover:border-gray-300 hover:shadow-sm"
                }`}
                onClick={() => handleAddressSelect(address)}
              >
                <div className="absolute bottom-4 right-4 flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditAddress(address);
                    }}
                    className="p-2 text-gray-400 hover:text-black hover:bg-gray-100 rounded-lg transition-colors"
                    title="Edit address"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteClick(address);
                    }}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete address"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>

                <div className="absolute -top-2 -right-2 flex items-center gap-2">
                  <button
                    onClick={() => handleAddressSelect(address)}
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                      selectedAddress?._id === address._id
                        ? 'border-black bg-black opacity-1'
                        : 'opacity-0'
                    }`}
                  >
                    {selectedAddress?._id === address._id && (
                      <motion.svg
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="w-3 h-3 text-white"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </motion.svg>
                    )}
                  </button>

                </div>

                <div className="pr-16">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900 text-lg">
                        {address.fullName}
                      </p>
                      <span className="text-xs font-medium px-2 py-1 rounded-full bg-gray-100 text-gray-600 capitalize">
                        {address.addressType}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-gray-700 leading-relaxed">
                      {address.addressLine1}
                      {address.addressLine2 && `, ${address.addressLine2}`}
                      <br />
                      {address.city}, {address.state} - <span className="font-medium">{address.pincode}</span>
                    </p>
                    {address.landmark && (
                      <p className="text-sm text-gray-500">
                        <span className="font-medium">Landmark:</span> {address.landmark}
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No saved addresses</h3>
            <p className="text-gray-600 mb-6">Add your first delivery address to continue</p>
          </div>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="border-2 border-gray-200 rounded-2xl overflow-hidden shadow-sm"
      >
        <div
          onClick={handleAddNewAddress}
          className="flex items-center justify-between p-5 cursor-pointer hover:bg-gray-50 transition-colors group"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-gradient-to-br from-gray-100 to-gray-50 rounded-full flex items-center justify-center group-hover:from-gray-200 group-hover:to-gray-100 transition-all">
              <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-lg">Add New Address</p>
              <p className="text-sm text-gray-500">
                {savedAddresses.length === 0 ? "Add your delivery address to continue" : "Save address for future orders"}
              </p>
            </div>
          </div>
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform ${showAddressForm ? 'rotate-45' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </div>

        <AnimatePresence>
          {showAddressForm && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden border-t border-gray-100 bg-gray-50/30"
            >
              <div className="p-6">
                <AddressForm
                  addressFormData={addressFormData}
                  setAddressFormData={setAddressFormData}
                  addressErrors={addressErrors}
                  setAddressErrors={setAddressErrors}
                  onSubmit={handleAddressFormSubmit}
                  onCancel={() => {
                    setShowAddressForm(false);
                    setIsEditingAddress(false);
                    setEditingAddressId(null);
                    setAddressFormData({
                      fullName: "", email: "", addressLine1: "", addressLine2: "",
                      city: "", state: "", pincode: "", landmark: "", addressType: "home",
                    });
                  }}
                  isSubmitting={isAddingAddress}
                  isEditing={isEditingAddress}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="flex flex-col sm:flex-row gap-4 pt-6"
      >
        <button
          type="button"
          onClick={onBack}
          className="w-full sm:w-auto px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
        >
          Back
        </button>

        {selectedAddress && (
          <motion.button
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={handleContinue}
            className="flex-1 sm:flex-none sm:px-8 py-3 bg-black hover:bg-gray-800 text-white rounded-xl font-medium transition-all"
          >
            Continue to Payment
          </motion.button>
        )}
      </motion.div>

      {!selectedAddress && savedAddresses.length > 0 && !showAddressForm && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center text-sm text-gray-500 pt-4"
        >
          Please select an address or add a new one to continue
        </motion.div>
      )}
    </div>
  );
};

export default AddressStep;