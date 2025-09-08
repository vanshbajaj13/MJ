// context/BuyNowContext.jsx - Fixed unified context for Buy Now and Cart checkout
"use client";
import { createContext, useContext, useReducer, useEffect } from "react";
import { useUser } from "./UserContext";

const BuyNowContext = createContext();

// Reducer to handle buy now state
const buyNowReducer = (state, action) => {
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
};

export function BuyNowProvider({ children }) {
  const [state, dispatch] = useReducer(buyNowReducer, initialState);
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

      // Set timer for automatic cleanup
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

      // Fix: Handle the session data structure properly
      const sessionData = {
        sessionId: data.session.sessionId,
        id: data.session.sessionId, // For backward compatibility
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

  // Create Buy Now session
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

      // Fix: Handle the response structure properly
      const sessionData = {
        sessionId: data.sessionId,
        id: data.sessionId, // For backward compatibility
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

  // Apply coupon to session
  const applyCoupon = async (couponCode) => {
    if (!state.sessionId) {
      throw new Error("No active checkout session");
    }

    dispatch({ type: "SET_COUPON_LOADING", payload: true });

    try {
      const response = await fetch("/api/checkout-session/apply-coupon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          sessionId: state.sessionId,
          couponCode: couponCode.trim().toUpperCase(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to apply coupon");
      }

      // Apply server-validated coupon data (same structure as cart)
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
    } catch (error) {
      throw error;
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
    // Always clear client state immediately
    dispatch({ type: "CLEAR_SESSION" });

    // Optionally close session on server
    if (closeOnServer && state.sessionId) {
      try {
        await fetch(`/api/checkout-session/${state.sessionId}/close`, {
          method: "POST",
          credentials: "include",
        });
      } catch (error) {
        console.error("Error closing session on server:", error);
        // Don't throw - client state is already cleared
      }
    }
  };

  // Calculate totals (same as cart for consistency)
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
    expiresAt: state.expiresAt,
    isGuest: state.isGuest,
    guestTrackingId: state.guestTrackingId,

    // Calculated values (same as cart for component compatibility)
    totalItems: totals.totalItems,
    totalPrice: totals.subtotal, // For backward compatibility
    subtotal: totals.subtotal,
    totalDiscount: totals.totalDiscount,
    shippingDiscount: totals.shippingDiscount,
    finalPrice: totals.finalTotal, // For backward compatibility
    finalTotal: totals.finalTotal,
    discountAmount: totals.totalDiscount, // For backward compatibility
    itemDiscounts: totals.itemDiscounts,
    savings: totals.savings,

    // Actions
    loadSession,
    createBuyNowSession,
    applyCoupon,
    removeCoupon,
    clearSession,
  };

  return (
    <BuyNowContext.Provider value={value}>{children}</BuyNowContext.Provider>
  );
}

export const useBuyNow = () => {
  const context = useContext(BuyNowContext);
  if (!context) {
    throw new Error("useBuyNow must be used within a BuyNowProvider");
  }
  return context;
};
