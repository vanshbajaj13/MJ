"use client";
import { useState } from "react";
import { motion } from "framer-motion";

export default function PaymentStep({ 
  phoneNumber, 
  addressData, 
  onBack,
  items,
  totalPrice,
  clearCart
}) {
  const [paymentMethod, setPaymentMethod] = useState("razorpay");
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    setLoading(true);

    try {
      // Here you would integrate with your payment gateway
      // For now, we'll just simulate the payment process
      
      console.log("Processing payment...", {
        phoneNumber,
        addressData,
        items,
        totalPrice,
        paymentMethod,
      });

      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Create order in database
      const orderData = {
        phoneNumber,
        customerInfo: {
          fullName: addressData.fullName,
          email: addressData.email,
        },
        shippingAddress: addressData,
        items,
        totalAmount: totalPrice,
        paymentMethod,
        status: 'pending', // Will be updated after payment confirmation
      };

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });

      if (response.ok) {
        const order = await response.json();
        
        // Clear cart after successful order
        clearCart();
        
        // Redirect to success page
        window.location.href = `/order-confirmation?orderId=${order.orderId}`;
      } else {
        throw new Error('Failed to create order');
      }

    } catch (error) {
      console.error('Payment error:', error);
      alert('Payment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8"
      >
        {/* Order Summary */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h3>
          
          {/* Customer Info */}
          <div className="mb-4 pb-4 border-b border-gray-200">
            <p className="font-medium text-gray-900">{addressData.fullName}</p>
            <p className="text-sm text-gray-600">{phoneNumber}</p>
            <p className="text-sm text-gray-600">{addressData.email}</p>
          </div>

          {/* Shipping Address */}
          <div className="mb-4 pb-4 border-b border-gray-200">
            <h4 className="font-medium text-gray-900 mb-2">Shipping Address</h4>
            <div className="text-sm text-gray-600">
              <p>{addressData.addressLine1}</p>
              {addressData.addressLine2 && <p>{addressData.addressLine2}</p>}
              <p>{addressData.city}, {addressData.state} - {addressData.pincode}</p>
              {addressData.landmark && <p>Landmark: {addressData.landmark}</p>}
            </div>
          </div>

          {/* Items */}
          <div className="space-y-3">
            {items.map((item) => (
              <div key={`${item.productId}-${item.size}`} className="flex justify-between items-center">
                <div>
                  <p className="font-medium text-gray-900">{item.name}</p>
                  <p className="text-sm text-gray-600">Size: {item.size} • Qty: {item.quantity}</p>
                </div>
                <p className="font-semibold text-gray-900">
                  ₹{(item.price * item.quantity).toFixed(2)}
                </p>
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex justify-between items-center text-lg font-bold">
              <span>Total</span>
              <span>₹{totalPrice.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Payment Methods */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Method</h3>
          <div className="space-y-3">
            {/* Razorpay */}
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
                  <p className="text-sm text-gray-600">Pay securely with UPI, Card, or Net Banking</p>
                </div>
              </div>
            </label>

            {/* Cash on Delivery */}
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
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Cash on Delivery</p>
                  <p className="text-sm text-gray-600">Pay when your order is delivered</p>
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Security Info */}
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
                Your payment information is encrypted and secure. We never store your card details.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 pt-6">
          <motion.button
            type="button"
            onClick={onBack}
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
                {paymentMethod === "cod" ? "Place Order" : `Pay ₹${totalPrice.toFixed(2)}`}
              </>
            )}
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}