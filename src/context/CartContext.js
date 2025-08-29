"use client";
import { createContext, useContext, useReducer, useEffect, useRef } from "react";
import { useUser } from "./UserContext"; // Keep your existing UserContext that manages Customer

const CartContext = createContext();

// Cart reducer to handle state changes
const cartReducer = (state, action) => {
  switch (action.type) {
    case "SET_CART":
      return {
        ...state,
        items: action.payload || [],
      };

    case "ADD_ITEM":
      const existingItemIndex = state.items.findIndex(
        (item) => 
          item.productId === action.payload.productId && 
          item.size === action.payload.size
      );

      if (existingItemIndex > -1) {
        // Update quantity if item exists
        const updatedItems = state.items.map((item, index) =>
          index === existingItemIndex
            ? { ...item, quantity: item.quantity + action.payload.quantity }
            : item
        );
        return {
          ...state,
          items: updatedItems,
        };
      } else {
        // Add new item
        return {
          ...state,
          items: [...state.items, action.payload],
        };
      }

    case "UPDATE_QUANTITY":
      return {
        ...state,
        items: state.items.map((item) =>
          item.productId === action.payload.productId && 
          item.size === action.payload.size
            ? { ...item, quantity: action.payload.quantity }
            : item
        ).filter(item => item.quantity > 0), // Remove items with 0 quantity
      };

    case "REMOVE_ITEM":
      return {
        ...state,
        items: state.items.filter(
          (item) => 
            !(item.productId === action.payload.productId && 
              item.size === action.payload.size)
        ),
      };

    case "CLEAR_CART":
      return {
        ...state,
        items: [],
      };

    case "SET_LOADING":
      return {
        ...state,
        loading: action.payload,
      };

    default:
      return state;
  }
};

// Initial state
const initialState = {
  items: [],
  loading: false,
};

export function CartProvider({ children }) {
  const [state, dispatch] = useReducer(cartReducer, initialState);
  const { user } = useUser();
  const syncInProgress = useRef(false);
  const initialized = useRef(false);

  // Load cart from localStorage on initial render (for guests)
  useEffect(() => {
    if (!initialized.current && !user) {
      const savedCart = localStorage.getItem("guestCart");
      if (savedCart) {
        try {
          const parsedCart = JSON.parse(savedCart);
          if (Array.isArray(parsedCart)) {
            dispatch({ type: "SET_CART", payload: parsedCart });
          }
        } catch (error) {
          console.error("Error parsing saved cart:", error);
          localStorage.removeItem("guestCart"); // Remove corrupted data
        }
      }
      initialized.current = true;
    }
  }, [user]);

  // Load cart when user logs in, sync when user logs out
  useEffect(() => {
    if (!initialized.current) return;

    if (user && !syncInProgress.current) {
      // User logged in - sync local cart with database
      syncCartWithDatabase();
    } else if (!user) {
      // User logged out - load from localStorage
      const savedCart = localStorage.getItem("guestCart");
      if (savedCart) {
        try {
          const parsedCart = JSON.parse(savedCart);
          if (Array.isArray(parsedCart)) {
            dispatch({ type: "SET_CART", payload: parsedCart });
          }
        } catch (error) {
          console.error("Error parsing saved cart:", error);
          localStorage.removeItem("guestCart");
        }
      } else {
        dispatch({ type: "SET_CART", payload: [] });
      }
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

  // Sync local cart with database when user logs in
  const syncCartWithDatabase = async () => {
    if (syncInProgress.current) return;
    
    syncInProgress.current = true;
    dispatch({ type: "SET_LOADING", payload: true });
    
    try {
      // Get local cart items
      const localItems = state.items;
      
      if (localItems.length > 0) {
        // Sync local items with database
        const response = await fetch("/api/cart/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ items: localItems }),
        });

        if (response.ok) {
          const data = await response.json();
          dispatch({ type: "SET_CART", payload: data.cart?.items || [] });
          // Clear localStorage after successful sync
          localStorage.removeItem("guestCart");
        } else {
          // If sync fails, load existing cart from database
          await loadCartFromDatabase();
        }
      } else {
        // Load existing cart from database
        await loadCartFromDatabase();
      }
    } catch (error) {
      console.error("Error syncing cart:", error);
      // Fallback to loading from database
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
        dispatch({ type: "SET_CART", payload: data.cart?.items || [] });
      } else {
        console.error("Failed to load cart from database");
        dispatch({ type: "SET_CART", payload: [] });
      }
    } catch (error) {
      console.error("Error loading cart:", error);
      dispatch({ type: "SET_CART", payload: [] });
    }
  };

  // Add item to cart
  const addToCart = async (product, size, quantity = 1) => {
    const cartItem = {
      productId: product._id,
      name: product.name,
      price: product.price,
      image: product.images?.[0]?.url || "",
      size: size,
      quantity: quantity,
      slug: product.slug,
    };

    // Update local state immediately for better UX
    dispatch({ type: "ADD_ITEM", payload: cartItem });

    // If user is logged in, also update database
    if (user) {
      try {
        const response = await fetch("/api/cart/add", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(cartItem),
        });

        if (!response.ok) {
          console.error("Failed to add to database cart");
          // Optionally revert the local change or show error message
        }
      } catch (error) {
        console.error("Error adding to database cart:", error);
      }
    }
  };

  // Update item quantity
  const updateQuantity = async (productId, size, quantity) => {
    // Update local state immediately
    dispatch({ 
      type: "UPDATE_QUANTITY", 
      payload: { productId, size, quantity } 
    });

    // If user is logged in, also update database
    if (user) {
      try {
        const response = await fetch("/api/cart/update", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ productId, size, quantity }),
        });

        if (!response.ok) {
          console.error("Failed to update database cart");
        }
      } catch (error) {
        console.error("Error updating database cart:", error);
      }
    }
  };

  // Remove item from cart
  const removeFromCart = async (productId, size) => {
    // Update local state immediately
    dispatch({ 
      type: "REMOVE_ITEM", 
      payload: { productId, size } 
    });

    // If user is logged in, also update database
    if (user) {
      try {
        const response = await fetch("/api/cart/remove", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ productId, size }),
        });

        if (!response.ok) {
          console.error("Failed to remove from database cart");
        }
      } catch (error) {
        console.error("Error removing from database cart:", error);
      }
    }
  };

  // Clear entire cart
  const clearCart = async () => {
    // Update local state immediately
    dispatch({ type: "CLEAR_CART" });

    // If user is logged in, also clear database
    if (user) {
      try {
        const response = await fetch("/api/cart/clear", {
          method: "DELETE",
          credentials: "include",
        });

        if (!response.ok) {
          console.error("Failed to clear database cart");
        }
      } catch (error) {
        console.error("Error clearing database cart:", error);
      }
    }
  };

  // Calculate totals
  const totalItems = state.items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = state.items.reduce(
    (sum, item) => sum + (item.price * item.quantity),
    0
  );

  const value = {
    items: state.items,
    loading: state.loading,
    totalItems,
    totalPrice,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
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