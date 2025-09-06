// context/CheckoutContext.jsx - For Buy Now scenarios with guest support
"use client";
import { createContext, useContext, useReducer } from "react";

const CheckoutContext = createContext();

const checkoutReducer = (state, action) => {
  switch (action.type) {
    case "SET_DIRECT_PURCHASE":
      return {
        ...state,
        directPurchase: true,
        items: [action.payload.item],
        appliedCoupon: null,
      };

    case "APPLY_COUPON":
      return {
        ...state,
        appliedCoupon: action.payload,
      };

    case "REMOVE_COUPON":
      return {
        ...state,
        appliedCoupon: null,
      };

    case "SET_COUPON_LOADING":
      return {
        ...state,
        couponLoading: action.payload,
      };

    case "CLEAR_CHECKOUT":
      return {
        ...state,
        directPurchase: false,
        items: [],
        appliedCoupon: null,
      };

    case "UPDATE_ITEM_QUANTITY":
      return {
        ...state,
        items: state.items.map(item => 
          item.productId === action.payload.productId && item.size === action.payload.size
            ? { ...item, quantity: action.payload.quantity }
            : item
        )
      };

    default:
      return state;
  }
};

const initialState = {
  directPurchase: false,
  items: [],
  appliedCoupon: null,
  couponLoading: false,
};

export function CheckoutProvider({ children }) {
  const [state, dispatch] = useReducer(checkoutReducer, initialState);

  const setDirectPurchase = (product, size, quantity = 1) => {
    const item = {
      productId: product._id,
      name: product.name,
      price: product.price,
      image: product.images?.[0]?.url || "",
      size: size,
      quantity: quantity,
      slug: product.slug,
    };

    dispatch({ type: "SET_DIRECT_PURCHASE", payload: { item } });
  };

  const updateItemQuantity = (productId, size, quantity) => {
    dispatch({ 
      type: "UPDATE_ITEM_QUANTITY", 
      payload: { productId, size, quantity } 
    });

    // If coupon is applied, re-validate it after quantity changes
    if (state.appliedCoupon) {
      setTimeout(() => revalidateCoupon(), 500);
    }
  };

  // Apply coupon - supports both guest and authenticated users
  const applyCoupon = async (couponCode) => {
    if (!state.items.length) {
      throw new Error("No items in checkout");
    }

    dispatch({ type: "SET_COUPON_LOADING", payload: true });
    
    try {
      const response = await fetch("/api/checkout/apply-coupon-direct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ 
          couponCode,
          item: state.items[0] // Direct checkout only has one item
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || "Failed to apply coupon");
      }

      const couponData = {
        code: data.discount.coupon.code,
        type: data.discount.coupon.type,
        value: data.discount.coupon.value,
        description: data.discount.coupon.description,
        discountAmount: data.discount.discountAmount,
        itemDiscounts: data.discount.itemDiscounts,
        appliedAt: new Date().toISOString(),
        isGuest: data.isGuest || false
      };

      dispatch({ 
        type: "APPLY_COUPON", 
        payload: couponData
      });

      return data;
    } catch (error) {
      throw error;
    } finally {
      dispatch({ type: "SET_COUPON_LOADING", payload: false });
    }
  };

  const removeCoupon = async () => {
    // For direct checkout, just remove from local state
    // (no server persistence for direct checkout coupons)
    dispatch({ type: "REMOVE_COUPON" });
  };

  // Re-validate coupon after item changes
  const revalidateCoupon = async () => {
    if (!state.appliedCoupon || !state.items.length) {
      if (state.appliedCoupon) {
        dispatch({ type: "REMOVE_COUPON" });
      }
      return;
    }

    try {
      // Re-apply the current coupon to get updated discount
      await applyCoupon(state.appliedCoupon.code);
    } catch (error) {
      // If coupon is no longer valid, remove it silently
      dispatch({ type: "REMOVE_COUPON" });
    }
  };

  const clearCheckout = () => {
    dispatch({ type: "CLEAR_CHECKOUT" });
  };

  // Calculate totals with server-validated prices
  const totalPrice = state.items.reduce(
    (sum, item) => sum + (item.price * item.quantity),
    0
  );
  
  // Use server-validated discount amount
  const discountAmount = state.appliedCoupon?.discountAmount || 0;
  const finalPrice = Math.max(0, totalPrice - discountAmount);
  const totalItems = state.items.reduce((sum, item) => sum + item.quantity, 0);

  const value = {
    directPurchase: state.directPurchase,
    items: state.items,
    appliedCoupon: state.appliedCoupon,
    couponLoading: state.couponLoading,
    totalPrice,
    discountAmount,
    finalPrice,
    totalItems,
    setDirectPurchase,
    updateItemQuantity,
    applyCoupon,
    removeCoupon,
    revalidateCoupon,
    clearCheckout,
  };

  return (
    <CheckoutContext.Provider value={value}>
      {children}
    </CheckoutContext.Provider>
  );
}

export const useCheckout = () => {
  const context = useContext(CheckoutContext);
  if (!context) {
    throw new Error("useCheckout must be used within a CheckoutProvider");
  }
  return context;
};