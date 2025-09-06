// components/DirectCheckoutForm.jsx - Simplified checkout form for single item
"use client";
import { useState } from "react";
import CheckoutForm from "./CheckoutForm";

export default function DirectCheckoutForm({ item, totalPrice, user, onBack, appliedCoupon, discountAmount }) {
  const items = [item]; // Convert single item to array for compatibility

  const handleOrderComplete = () => {
    // After successful order, redirect
    // This is handled in UnifiedCheckoutForm
  };

  return (
    <CheckoutForm
      items={items}
      totalPrice={totalPrice}
      user={user}
      clearCart={() => {}} // No cart to clear
      onBack={onBack}
      isDirect={true}
    />
  );
}