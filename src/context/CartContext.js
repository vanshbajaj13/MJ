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
        // Clear coupon when cart changes - will be revalidated
        appliedCoupon: null,
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

    case "REMOVE_MULTIPLE_ITEMS":
      const remainingItems = state.items.filter(
        (item) =>
          !action.payload.some(
            (removeItem) =>
              item.productId === removeItem.productId &&
              item.size === removeItem.size
          )
      );

      return {
        ...state,
        items: remainingItems,
        appliedCoupon: remainingItems.length === 0 ? null : state.appliedCoupon,
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

  // Queue for batch operations
  const operationQueue = useRef([]);
  const isProcessingQueue = useRef(false);
  const queueTimeoutRef = useRef(null);

  // Generate or retrieve guest cart ID for secure tracking
  useEffect(() => {
    if (!user) {
      let storedCartId = localStorage.getItem("guestCartId");
      if (!storedCartId) {
        // Generate a secure guest cart ID
        storedCartId = `guest_${Date.now()}_${Math.random()
          .toString(36)
          .substr(2, 9)}`;
        localStorage.setItem("guestCartId", storedCartId);
      }
      guestCartId.current = storedCartId;
    } else {
      // Clear guest ID when user logs in
      localStorage.removeItem("guestCartId");
      guestCartId.current = null;
    }
  }, [user]);

  // Load cart from localStorage on initial render (for guests)
  useEffect(() => {
    if (!initialized.current && !user) {
      const savedCart = localStorage.getItem("guestCart");

      let cartData = { items: [] };

      if (savedCart) {
        try {
          const parsedCart = JSON.parse(savedCart);
          if (Array.isArray(parsedCart)) {
            cartData.items = parsedCart;
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

  // Load cart when user logs in, sync when user logs out
  useEffect(() => {
    if (!initialized.current) return;

    if (user && !syncInProgress.current) {
      syncCartWithDatabase();
    } else if (!user) {
      // User logged out, load from localStorage
      const savedCart = localStorage.getItem("guestCart");

      let cartData = { items: [] };

      if (savedCart) {
        try {
          const parsedCart = JSON.parse(savedCart);
          if (Array.isArray(parsedCart)) {
            cartData.items = parsedCart;
          }
        } catch (error) {
          console.error("Error parsing saved cart:", error);
          localStorage.removeItem("guestCart");
        }
      }

      dispatch({ type: "SET_CART", payload: cartData });
    }
  }, [user]);

  // Save to localStorage whenever cart changes (for guest users only)
  useEffect(() => {
    if (!user && initialized.current && !syncInProgress.current) {
      try {
        localStorage.setItem("guestCart", JSON.stringify(state.items));
      } catch (error) {
        console.error("Error saving cart to localStorage:", error);
      }
    }
  }, [state.items, user]);

  // Process operation queue (for authenticated users)
  const processOperationQueue = async () => {
    if (
      isProcessingQueue.current ||
      operationQueue.current.length === 0 ||
      !user
    ) {
      return;
    }

    isProcessingQueue.current = true;
    const operations = [...operationQueue.current];
    operationQueue.current = [];

    try {
      // Group operations by type
      const removeOperations = operations.filter((op) => op.type === "remove");
      const updateOperations = operations.filter((op) => op.type === "update");
      const addOperations = operations.filter((op) => op.type === "add");

      // Process removes in batch
      if (removeOperations.length > 0) {
        await fetch("/api/cart/batch-remove", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            items: removeOperations.map((op) => ({
              productId: op.productId,
              size: op.size,
            })),
          }),
        });
      }

      // Process updates in batch
      if (updateOperations.length > 0) {
        await fetch("/api/cart/batch-update", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            items: updateOperations.map((op) => ({
              productId: op.productId,
              size: op.size,
              quantity: op.quantity,
            })),
          }),
        });
      }

      // Process adds in batch
      if (addOperations.length > 0) {
        await fetch("/api/cart/batch-add", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ items: addOperations }),
        });
      }
    } catch (error) {
      console.error("Error processing operation queue:", error);
    } finally {
      isProcessingQueue.current = false;

      // Process any new operations that were added while processing
      if (operationQueue.current.length > 0) {
        setTimeout(processOperationQueue, 100);
      }
    }
  };

  // Debounced queue processing
  const scheduleQueueProcessing = () => {
    if (queueTimeoutRef.current) {
      clearTimeout(queueTimeoutRef.current);
    }

    queueTimeoutRef.current = setTimeout(() => {
      processOperationQueue();
    }, 300); // 300ms debounce
  };

  // Add operation to queue (for authenticated users)
  const queueOperation = (operation) => {
    if (!user) return;

    // Remove duplicate operations for the same item
    operationQueue.current = operationQueue.current.filter(
      (op) =>
        !(
          op.productId === operation.productId &&
          op.size === operation.size &&
          op.type === operation.type
        )
    );

    operationQueue.current.push(operation);
    scheduleQueueProcessing();
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
      } else {
        console.error("Failed to load cart from database");
        dispatch({ type: "SET_CART", payload: { items: [] } });
      }
    } catch (error) {
      console.error("Error loading cart:", error);
      dispatch({ type: "SET_CART", payload: { items: [] } });
    }
  };

  // Sync cart with database
  const syncCartWithDatabase = async () => {
    if (syncInProgress.current) return;

    syncInProgress.current = true;
    dispatch({ type: "SET_LOADING", payload: true });

    try {
      const localItems = state.items;

      if (localItems.length > 0) {
        // Sync local cart with database
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
          // Clear localStorage after successful sync
          localStorage.removeItem("guestCart");
        } else {
          // If sync fails, load from database
          await loadCartFromDatabase();
        }
      } else {
        // No local items, just load from database
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

  // Add to cart
  const addToCart = async (product, size, quantity = 1) => {
    const cartItem = {
      productId: product._id,
      name: product.name,
      price: product.discountedPrice || product.price, // Use server price
      image: product.images?.[0]?.url || "",
      size: size,
      quantity: quantity,
      slug: product.slug,
    };

    dispatch({ type: "ADD_ITEM", payload: cartItem });
    queueOperation({ type: "add", ...cartItem });

    // If coupon is applied, re-validate it after cart changes
    if (state.appliedCoupon) {
      setTimeout(() => revalidateCoupon(), 500);
    }
  };

  // Update quantity
  const updateQuantity = async (productId, size, quantity) => {
    // If quantity is 0 or less, treat as removal
    if (quantity <= 0) {
      await removeFromCart(productId, size);
      return;
    }
    dispatch({
      type: "UPDATE_QUANTITY",
      payload: { productId, size, quantity },
    });

    queueOperation({
      type: "update",
      productId,
      size,
      quantity,
    });

    // If coupon is applied, re-validate it after cart changes
    if (state.appliedCoupon) {
      setTimeout(() => revalidateCoupon(), 500);
    }
  };

  // Remove from cart
  const removeFromCart = async (productId, size) => {
    dispatch({
      type: "REMOVE_ITEM",
      payload: { productId, size },
    });

    queueOperation({
      type: "remove",
      productId,
      size,
    });

    // If coupon is applied, re-validate it after cart changes
    if (state.appliedCoupon) {
      setTimeout(() => revalidateCoupon(), 500);
    }
  };

  // Remove multiple items
  const removeMultipleFromCart = async (itemsToRemove) => {
    if (!Array.isArray(itemsToRemove) || itemsToRemove.length === 0) return;

    dispatch({
      type: "REMOVE_MULTIPLE_ITEMS",
      payload: itemsToRemove,
    });

    itemsToRemove.forEach((item) => {
      queueOperation({
        type: "remove",
        productId: item.productId,
        size: item.size,
      });
    });

    // If coupon is applied, re-validate it after cart changes
    if (state.appliedCoupon) {
      setTimeout(() => revalidateCoupon(), 500);
    }
  };

  // Clear cart
  const clearCart = async () => {
    dispatch({ type: "CLEAR_CART" });

    // Clear the queue and send immediate clear request
    operationQueue.current = [];
    if (queueTimeoutRef.current) {
      clearTimeout(queueTimeoutRef.current);
    }

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

  // Apply coupon - Secure version with server-side validation
  const applyCoupon = async (couponCode) => {
    dispatch({ type: "SET_COUPON_LOADING", payload: true });

    try {
      const requestBody = {
        couponCode: couponCode.trim().toUpperCase(),
        cartId: guestCartId.current,
      };

      // For guest users, include cart items for server-side validation
      if (!user) {
        requestBody.guestCartItems = state.items.map((item) => ({
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

      if (!response.ok) {
        throw new Error(data.message || "Failed to apply coupon");
      }

      // Apply server-validated coupon data
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
    } catch (error) {
      throw error;
    } finally {
      dispatch({ type: "SET_COUPON_LOADING", payload: false });
    }
  };

  // Remove coupon
  const removeCoupon = async () => {
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

  // Re-validate coupon after cart changes
  const revalidateCoupon = async () => {
    if (!state.appliedCoupon || state.items.length === 0) {
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

  // Calculate totals with server-validated discounts
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

    const finalTotal = Math.max(0, subtotal - totalDiscount);

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
    totalPrice: totals.subtotal, // For backward compatibility
    subtotal: totals.subtotal,
    totalDiscount: totals.totalDiscount,
    shippingDiscount: totals.shippingDiscount,
    finalPrice: totals.finalTotal, // For backward compatibility
    finalTotal: totals.finalTotal,
    discountAmount: totals.totalDiscount, // For backward compatibility
    itemDiscounts: totals.itemDiscounts,
    savings: totals.savings,

    // Guest tracking
    guestCartId: guestCartId.current,

    // Actions
    addToCart,
    updateQuantity,
    removeFromCart,
    removeMultipleFromCart,
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
