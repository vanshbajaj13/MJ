// context/CheckoutContext.jsx
"use client";
import { createContext, useContext, useReducer, useEffect } from "react";
import { useUser } from "./UserContext";

const CheckoutContext = createContext();

// Reducer to handle checkout state
const checkoutReducer = (state, action) => {
  switch (action.type) {
    case "SET_SESSION":
      return {
        ...state,
        sessionId: action.payload.sessionId || action.payload.id,
        items: action.payload.items || [],
        appliedCoupon: action.payload.appliedCoupon || null,
        type: action.payload.type,
        expiresAt: action.payload.expiresAt,
        isGuest: action.payload.isGuest,
        guestTrackingId: action.payload.guestTrackingId,
        isActive: true,
      };

    // ✅ NEW: Update session expiry without changing other data
    case "UPDATE_SESSION_EXPIRY":
      return {
        ...state,
        expiresAt: action.payload.expiresAt,
      };

    case "UPDATE_SESSION_PRICES":
      // Update prices and coupon silently when backend detects changes
      return {
        ...state,
        items: action.payload.items || state.items,
        appliedCoupon: action.payload.appliedCoupon !== undefined 
          ? action.payload.appliedCoupon 
          : state.appliedCoupon,
        priceUpdateTimestamp: new Date().getTime(), // Track when prices changed
      };

    case "CLEAR_SESSION":
      return {
        ...initialState,
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

    case "SET_LOADING":
      return {
        ...state,
        loading: action.payload,
      };

    case "SET_COUPON_LOADING":
      return {
        ...state,
        couponLoading: action.payload,
      };

    case "SET_PRICE_UPDATE_LOADING":
      return {
        ...state,
        priceUpdateLoading: action.payload,
      };

    default:
      return state;
  }
};

// Initial state
const initialState = {
  sessionId: null,
  items: [],
  appliedCoupon: null,
  type: null,
  expiresAt: null,
  isGuest: false,
  guestTrackingId: null,
  isActive: false,
  loading: false,
  couponLoading: false,
  priceUpdateLoading: false,
  priceUpdateTimestamp: null,
};

export function BuyNowProvider({ children }) {
  const [state, dispatch] = useReducer(checkoutReducer, initialState);
  const { user } = useUser();

  // Clear expired session
  useEffect(() => {
    if (state.isActive && state.expiresAt) {
      const expiryTime = new Date(state.expiresAt).getTime();
      const currentTime = Date.now();

      if (currentTime >= expiryTime) {
        dispatch({ type: "CLEAR_SESSION" });
        return;
      }

      const timeoutId = setTimeout(() => {
        dispatch({ type: "CLEAR_SESSION" });
      }, expiryTime - currentTime);

      return () => clearTimeout(timeoutId);
    }
  }, [state.isActive, state.expiresAt]);

  // Load existing session by ID
  const loadSession = async (sessionId) => {
    dispatch({ type: "SET_LOADING", payload: true });

    try {
      const response = await fetch(`/api/checkout-session/${sessionId}`, {
        method: "GET",
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to load session");
      }

      const sessionData = {
        sessionId: data.session.sessionId,
        id: data.session.sessionId,
        items: data.session.items || [],
        appliedCoupon: data.session.appliedCoupon || null,
        type: data.session.type,
        expiresAt: data.session.expiresAt,
        isGuest: data.session.isGuest,
        guestTrackingId: data.session.guestTrackingId,
      };

      dispatch({ type: "SET_SESSION", payload: sessionData });

      return {
        success: true,
        session: sessionData,
      };
    } catch (error) {
      dispatch({ type: "CLEAR_SESSION" });
      throw error;
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  };

  // NEW: Update session prices silently (called from PaymentStep)
  const updateSessionPrices = (updatedItems, updatedCoupon) => {
    dispatch({
      type: "UPDATE_SESSION_PRICES",
      payload: {
        items: updatedItems,
        appliedCoupon: updatedCoupon,
      },
    });
  };

  // ✅ NEW: Update session expiry (called after payment order creation)
  const updateSessionExpiry = (newExpiresAt) => {
    dispatch({
      type: "UPDATE_SESSION_EXPIRY",
      payload: { expiresAt: newExpiresAt },
    });
  };

  // Create Buy Now session (single product)
  const createBuyNowSession = async (productId, size, quantity = 1) => {
    dispatch({ type: "SET_LOADING", payload: true });

    try {
      const response = await fetch("/api/buy-now", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ productId, size, quantity }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to create buy now session");
      }

      const sessionData = {
        sessionId: data.sessionId,
        id: data.sessionId,
        items: data.session.items || [],
        appliedCoupon: data.session.appliedCoupon || null,
        type: data.session.type,
        expiresAt: data.session.expiresAt,
        isGuest: data.session.isGuest,
        guestTrackingId: data.session.guestTrackingId,
      };

      dispatch({ type: "SET_SESSION", payload: sessionData });

      return {
        success: true,
        sessionId: data.sessionId,
        session: sessionData,
      };
    } catch (error) {
      throw error;
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  };

  // Create Cart Checkout session (multiple products)
  const createCartCheckoutSession = async (cartItems, initialCoupon = null) => {
    dispatch({ type: "SET_LOADING", payload: true });

    try {
      const response = await fetch("/api/cart-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ cartItems }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw data;
      }

      const sessionData = {
        sessionId: data.sessionId,
        id: data.sessionId,
        items: data.session.items || [],
        appliedCoupon: data.session.appliedCoupon || null,
        type: data.session.type,
        expiresAt: data.session.expiresAt,
        isGuest: data.session.isGuest,
        guestTrackingId: data.session.guestTrackingId,
      };

      dispatch({ type: "SET_SESSION", payload: sessionData });

      if (initialCoupon) {
        try {
          await applyCoupon(initialCoupon, data.sessionId);
        } catch (couponError) {
          console.warn("Failed to apply initial coupon:", couponError.message);
        }
      }

      return {
        success: true,
        sessionId: data.sessionId,
        session: sessionData,
      };
    } catch (error) {
      throw error;
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  };

  // Apply coupon to session
  const applyCoupon = async (couponCode, sessionIdOverride = null) => {
    const sessionId = sessionIdOverride || state.sessionId;
    if (!sessionId) {
      throw new Error("No active checkout session");
    }

    dispatch({ type: "SET_COUPON_LOADING", payload: true });

    try {
      const response = await fetch("/api/checkout-session/apply-coupon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          sessionId: sessionId,
          couponCode: couponCode.trim().toUpperCase(),
        }),
      });

      const data = await response.json();
      if (!response.ok)
        throw new Error(data.message || "Failed to apply coupon");

      const couponData = {
        code: data.coupon.code,
        type: data.coupon.type,
        value: data.coupon.value,
        description: data.coupon.description,
        discountAmount: data.discount.totalDiscount,
        shippingDiscount: data.discount.shippingDiscount,
        itemDiscounts: data.discount.itemDiscounts,
        eligibleItems: data.discount.eligibleItems,
      };

      dispatch({ type: "APPLY_COUPON", payload: couponData });
      return {
        success: true,
        message: data.message,
        discount: data.discount,
        totals: data.totals,
      };
    } finally {
      dispatch({ type: "SET_COUPON_LOADING", payload: false });
    }
  };

  // Remove coupon from session
  const removeCoupon = async () => {
    if (!state.sessionId) {
      throw new Error("No active checkout session");
    }

    dispatch({ type: "SET_COUPON_LOADING", payload: true });

    try {
      const response = await fetch("/api/checkout-session/apply-coupon", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ sessionId: state.sessionId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to remove coupon");
      }

      dispatch({ type: "REMOVE_COUPON" });
      return data;
    } catch (error) {
      throw error;
    } finally {
      dispatch({ type: "SET_COUPON_LOADING", payload: false });
    }
  };

  // Clear session manually (both client and server)
  const clearSession = async (closeOnServer = true) => {
    dispatch({ type: "CLEAR_SESSION" });

    if (closeOnServer && state.sessionId) {
      try {
        await fetch(`/api/checkout-session/${state.sessionId}/close`, {
          method: "POST",
          credentials: "include",
        });
      } catch (error) {
        console.error("Error closing session on server:", error);
      }
    }
  };

  // Calculate totals
  const calculateTotals = () => {
    const subtotal = state.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    const totalItems = state.items.reduce(
      (sum, item) => sum + item.quantity,
      0
    );

    let totalDiscount = 0;
    let shippingDiscount = 0;
    let itemDiscounts = {};

    if (state.appliedCoupon) {
      totalDiscount = state.appliedCoupon.discountAmount || 0;
      shippingDiscount = state.appliedCoupon.shippingDiscount || 0;
      itemDiscounts = state.appliedCoupon.itemDiscounts || {};
    }

    const shippingCost = 50;
    const freeShippingThreshold = 500;

    let finalShippingCost = 0;

    if (subtotal > freeShippingThreshold) {
      finalShippingCost = 0;
    } else {
      finalShippingCost = shippingCost - (shippingDiscount || 0);
    }

    const finalTotal = Math.max(
      0,
      subtotal - totalDiscount + finalShippingCost
    );

    return {
      subtotal: Math.round(subtotal * 100) / 100,
      totalItems,
      totalDiscount: Math.round(totalDiscount * 100) / 100,
      shippingDiscount: Math.round(shippingDiscount * 100) / 100,
      finalTotal: Math.round(finalTotal * 100) / 100,
      itemDiscounts,
      savings: Math.round(totalDiscount * 100) / 100,
    };
  };

  const totals = calculateTotals();

  const value = {
    // State
    sessionId: state.sessionId,
    items: state.items,
    appliedCoupon: state.appliedCoupon,
    type: state.type,
    isActive: state.isActive,
    loading: state.loading,
    couponLoading: state.couponLoading,
    priceUpdateLoading: state.priceUpdateLoading,
    priceUpdateTimestamp: state.priceUpdateTimestamp,
    expiresAt: state.expiresAt,
    isGuest: state.isGuest,
    guestTrackingId: state.guestTrackingId,

    // Calculated values
    totalItems: totals.totalItems,
    totalPrice: totals.subtotal,
    subtotal: totals.subtotal,
    totalDiscount: totals.totalDiscount,
    shippingDiscount: totals.shippingDiscount,
    finalPrice: totals.finalTotal,
    finalTotal: totals.finalTotal,
    discountAmount: totals.totalDiscount,
    itemDiscounts: totals.itemDiscounts,
    savings: totals.savings,

    // Actions
    loadSession,
    createBuyNowSession,
    createCartCheckoutSession,
    applyCoupon,
    removeCoupon,
    clearSession,
    updateSessionPrices,
    updateSessionExpiry, // ✅ NEW: expose this function
  };

  return (
    <CheckoutContext.Provider value={value}>
      {children}
    </CheckoutContext.Provider>
  );
}

// Hook for using checkout context
export const useCheckout = () => {
  const context = useContext(CheckoutContext);
  if (!context) {
    throw new Error("useCheckout must be used within a CheckoutProvider");
  }
  return context;
};

// Backward compatibility
export const useBuyNow = useCheckout;