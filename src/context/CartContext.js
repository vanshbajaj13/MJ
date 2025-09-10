"use client";
import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useRef,
} from "react";
import { useUser } from "./UserContext";

const CartContext = createContext();

// Cart reducer to handle state changes
const cartReducer = (state, action) => {
  switch (action.type) {
    case "SET_CART":
      return {
        ...state,
        items: action.payload?.items || [],
        appliedCoupon: action.payload?.appliedCoupon || null,
      };

    case "ADD_ITEM":
      const existingItemIndex = state.items.findIndex(
        (item) =>
          item.productId === action.payload.productId &&
          item.size === action.payload.size
      );

      let newItems;
      if (existingItemIndex > -1) {
        newItems = state.items.map((item, index) =>
          index === existingItemIndex
            ? { ...item, quantity: item.quantity + action.payload.quantity }
            : item
        );
      } else {
        newItems = [...state.items, action.payload];
      }

      return {
        ...state,
        items: newItems,
        // Keep coupon - will be revalidated separately
      };

    case "UPDATE_QUANTITY":
      const updatedItems = state.items
        .map((item) =>
          item.productId === action.payload.productId &&
          item.size === action.payload.size
            ? { ...item, quantity: action.payload.quantity }
            : item
        )
        .filter((item) => item.quantity > 0);

      return {
        ...state,
        items: updatedItems,
        appliedCoupon: updatedItems.length === 0 ? null : state.appliedCoupon,
      };

    case "REMOVE_ITEM":
      const filteredItems = state.items.filter(
        (item) =>
          !(
            item.productId === action.payload.productId &&
            item.size === action.payload.size
          )
      );

      return {
        ...state,
        items: filteredItems,
        appliedCoupon: filteredItems.length === 0 ? null : state.appliedCoupon,
      };

    case "CLEAR_CART":
      return {
        ...state,
        items: [],
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
  items: [],
  appliedCoupon: null,
  loading: false,
  couponLoading: false,
};

export function CartProvider({ children }) {
  const [state, dispatch] = useReducer(cartReducer, initialState);
  const { user } = useUser();
  const syncInProgress = useRef(false);
  const initialized = useRef(false);
  const guestCartId = useRef(null);
  const revalTimeoutRef = useRef(null);

  // Generate or retrieve guest cart ID
  useEffect(() => {
    if (!user) {
      let storedCartId = localStorage.getItem("guestCartId");
      if (!storedCartId) {
        storedCartId = `guest_${Date.now()}_${Math.random()
          .toString(36)
          .substr(2, 9)}`;
        localStorage.setItem("guestCartId", storedCartId);
      }
      guestCartId.current = storedCartId;
    } else {
      localStorage.removeItem("guestCartId");
      guestCartId.current = null;
    }
  }, [user]);

  // Load cart from localStorage on initial render (for guests)
  useEffect(() => {
    if (!initialized.current && !user) {
      const savedCart = localStorage.getItem("guestCart");
      let cartData = { items: [], appliedCoupon: null };

      if (savedCart) {
        try {
          const parsedCart = JSON.parse(savedCart);
          if (Array.isArray(parsedCart)) {
            cartData.items = parsedCart;
          } else if (typeof parsedCart === 'object') {
            cartData.items = parsedCart.items || [];
            cartData.appliedCoupon = parsedCart.appliedCoupon || null;
          }
        } catch (error) {
          console.error("Error parsing saved cart:", error);
          localStorage.removeItem("guestCart");
        }
      }

      dispatch({ type: "SET_CART", payload: cartData });
      initialized.current = true;
    }
  }, [user]);

  // Load cart when user logs in/out
  useEffect(() => {
    if (!initialized.current) return;

    if (user && !syncInProgress.current) {
      syncCartWithDatabase();
    } else if (!user) {
      const savedCart = localStorage.getItem("guestCart");
      let cartData = { items: [], appliedCoupon: null };

      if (savedCart) {
        try {
          const parsedCart = JSON.parse(savedCart);
          if (Array.isArray(parsedCart)) {
            cartData.items = parsedCart;
          } else if (typeof parsedCart === 'object') {
            cartData.items = parsedCart.items || [];
            cartData.appliedCoupon = parsedCart.appliedCoupon || null;
          }
        } catch (error) {
          console.error("Error parsing saved cart:", error);
          localStorage.removeItem("guestCart");
        }
      }

      dispatch({ type: "SET_CART", payload: cartData });
    }
  }, [user]);

  // Save to localStorage for guests
  useEffect(() => {
    if (!user && initialized.current && !syncInProgress.current) {
      try {
        localStorage.setItem(
          "guestCart", 
          JSON.stringify({
            items: state.items,
            appliedCoupon: state.appliedCoupon
          })
        );
      } catch (error) {
        console.error("Error saving cart to localStorage:", error);
      }
    }
  }, [state.items, state.appliedCoupon, user]);

  // Debounced coupon revalidation
  useEffect(() => {
    if (!state.appliedCoupon || state.items.length === 0) {
      if (state.appliedCoupon && state.items.length === 0) {
        dispatch({ type: "REMOVE_COUPON" });
      }
      return;
    }

    // Clear existing timeout
    if (revalTimeoutRef.current) {
      clearTimeout(revalTimeoutRef.current);
    }

    // Set new timeout for debounced revalidation
    revalTimeoutRef.current = setTimeout(() => {
      revalidateCoupon(state.items);
    }, 500); // 500ms debounce

    return () => {
      if (revalTimeoutRef.current) {
        clearTimeout(revalTimeoutRef.current);
      }
    };
  }, [state.items, state.appliedCoupon?.code]);

  // Sync cart with database
  const syncCartWithDatabase = async () => {
    if (syncInProgress.current) return;

    syncInProgress.current = true;
    dispatch({ type: "SET_LOADING", payload: true });

    try {
      const localItems = state.items;

      if (localItems.length > 0) {
        const response = await fetch("/api/cart/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ items: localItems }),
        });

        if (response.ok) {
          const data = await response.json();
          const cartData = data.cart || data;
          dispatch({
            type: "SET_CART",
            payload: {
              items: cartData?.items || [],
              appliedCoupon: cartData?.appliedCoupon || null,
            },
          });
          localStorage.removeItem("guestCart");
        } else {
          await loadCartFromDatabase();
        }
      } else {
        await loadCartFromDatabase();
      }
    } catch (error) {
      console.error("Error syncing cart:", error);
      await loadCartFromDatabase();
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
      syncInProgress.current = false;
    }
  };

  // Load cart from database
  const loadCartFromDatabase = async () => {
    if (!user) return;

    try {
      const response = await fetch("/api/cart", {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        const cartData = data.cart || data;

        dispatch({
          type: "SET_CART",
          payload: {
            items: cartData?.items || [],
            appliedCoupon: cartData?.appliedCoupon || null,
          },
        });
      }
    } catch (error) {
      console.error("Error loading cart:", error);
      dispatch({ type: "SET_CART", payload: { items: [] } });
    }
  };

  // Immediate cart operation with server sync
  const performCartOperation = async (operation, localUpdate) => {
    if (state.couponLoading) {
      return; // Prevent operations during coupon loading
    }

    // Apply local update immediately
    localUpdate();

    // Sync with server for authenticated users
    if (user) {
      try {
        await operation();
      } catch (error) {
        console.error("Server sync failed:", error);
        // Could implement rollback here if needed
      }
    }
  };

  // Add to cart
  const addToCart = async (product, size, quantity = 1) => {
    const cartItem = {
      productId: product._id,
      name: product.name,
      price: product.discountedPrice || product.price,
      image: product.images?.[0]?.url || "",
      size: size,
      quantity: quantity,
      slug: product.slug,
    };

    await performCartOperation(
      () => fetch("/api/cart/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(cartItem),
      }),
      () => dispatch({ type: "ADD_ITEM", payload: cartItem })
    );
  };

  // Update quantity
  const updateQuantity = async (productId, size, quantity) => {
    if (quantity <= 0) {
      await removeFromCart(productId, size);
      return;
    }

    await performCartOperation(
      () => fetch("/api/cart/update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ productId, size, quantity }),
      }),
      () => dispatch({
        type: "UPDATE_QUANTITY",
        payload: { productId, size, quantity },
      })
    );
  };

  // Remove from cart
  const removeFromCart = async (productId, size) => {
    await performCartOperation(
      () => fetch("/api/cart/remove", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ productId, size }),
      }),
      () => dispatch({
        type: "REMOVE_ITEM",
        payload: { productId, size },
      })
    );
  };

  // Clear cart
  const clearCart = async () => {
    dispatch({ type: "CLEAR_CART" });

    if (user) {
      try {
        await fetch("/api/cart/clear", {
          method: "DELETE",
          credentials: "include",
        });
      } catch (error) {
        console.error("Error clearing database cart:", error);
      }
    } else {
      localStorage.removeItem("guestCart");
      localStorage.removeItem("guestCartId");
    }
  };

  // Apply coupon
  const applyCoupon = async (couponCode, items = state.items || []) => {
    if (state.couponLoading) return;
    
    dispatch({ type: "SET_COUPON_LOADING", payload: true });

    try {
      const requestBody = {
        couponCode: couponCode.trim().toUpperCase(),
        cartId: guestCartId.current,
      };

      if (!user) {
        requestBody.guestCartItems = items.map((item) => ({
          productId: item.productId,
          size: item.size,
          quantity: item.quantity,
        }));
      }

      const response = await fetch("/api/cart/apply-coupon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to apply coupon");

      const couponData = {
        code: data.coupon.code,
        type: data.coupon.type,
        value: data.coupon.value,
        description: data.coupon.description,
        discountAmount: data.discount.totalDiscount,
        shippingDiscount: data.discount.shippingDiscount,
        itemDiscounts: data.discount.itemDiscounts,
        eligibleItems: data.discount.eligibleItems,
        isGuest: data.isGuest,
        trackingId: data.trackingId,
      };

      dispatch({ type: "APPLY_COUPON", payload: couponData });

      return {
        success: true,
        message: data.message,
        discount: data.discount,
        cartTotals: data.cartTotals,
      };
    } finally {
      dispatch({ type: "SET_COUPON_LOADING", payload: false });
    }
  };

  // Remove coupon
  const removeCoupon = async () => {
    if (state.couponLoading) return;
    
    dispatch({ type: "SET_COUPON_LOADING", payload: true });

    try {
      const response = await fetch("/api/cart/remove-coupon", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          cartId: guestCartId.current,
        }),
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

  // Revalidate coupon
  const revalidateCoupon = async (items = []) => {
    if (state.couponLoading || !state.appliedCoupon || items.length === 0) {
      return;
    }

    dispatch({ type: "SET_COUPON_LOADING", payload: true });

    try {
      const requestBody = {
        couponCode: state.appliedCoupon.code.trim().toUpperCase(),
        cartId: guestCartId.current,
      };

      if (!user) {
        requestBody.guestCartItems = items.map((item) => ({
          productId: item.productId,
          size: item.size,
          quantity: item.quantity,
        }));
      }

      const response = await fetch("/api/cart/apply-coupon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();
      
      if (response.ok) {
        const couponData = {
          code: data.coupon.code,
          type: data.coupon.type,
          value: data.coupon.value,
          description: data.coupon.description,
          discountAmount: data.discount.totalDiscount,
          shippingDiscount: data.discount.shippingDiscount,
          itemDiscounts: data.discount.itemDiscounts,
          eligibleItems: data.discount.eligibleItems,
          isGuest: data.isGuest,
          trackingId: data.trackingId,
        };

        dispatch({ type: "APPLY_COUPON", payload: couponData });
      } else {
        // Coupon is no longer valid
        dispatch({ type: "REMOVE_COUPON" });
      }
    } catch (error) {
      console.error("Coupon revalidation failed:", error);
      dispatch({ type: "REMOVE_COUPON" });
    } finally {
      dispatch({ type: "SET_COUPON_LOADING", payload: false });
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
    items: state.items,
    appliedCoupon: state.appliedCoupon,
    loading: state.loading,
    couponLoading: state.couponLoading,

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

    // Guest tracking
    guestCartId: guestCartId.current,

    // Actions
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    applyCoupon,
    removeCoupon,
    revalidateCoupon,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
};