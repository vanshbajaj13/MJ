"use client";
import { createContext, useContext, useReducer, useEffect, useRef } from "react";
import { useUser } from "./UserContext";

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
        ).filter(item => item.quantity > 0),
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

    case "REMOVE_MULTIPLE_ITEMS":
      return {
        ...state,
        items: state.items.filter(item => 
          !action.payload.some(removeItem => 
            item.productId === removeItem.productId && 
            item.size === removeItem.size
          )
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

    case "SET_OPERATION_IN_PROGRESS":
      return {
        ...state,
        operationInProgress: action.payload,
      };

    default:
      return state;
  }
};

// Initial state
const initialState = {
  items: [],
  loading: false,
  operationInProgress: false,
};

export function CartProvider({ children }) {
  const [state, dispatch] = useReducer(cartReducer, initialState);
  const { user } = useUser();
  const syncInProgress = useRef(false);
  const initialized = useRef(false);
  
  // Queue for batch operations
  const operationQueue = useRef([]);
  const isProcessingQueue = useRef(false);
  const queueTimeoutRef = useRef(null);

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
          localStorage.removeItem("guestCart");
        }
      }
      initialized.current = true;
    }
  }, [user]);

  // Load cart when user logs in, sync when user logs out
  useEffect(() => {
    if (!initialized.current) return;

    if (user && !syncInProgress.current) {
      syncCartWithDatabase();
    } else if (!user) {
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

  // Process operation queue
  const processOperationQueue = async () => {
    if (isProcessingQueue.current || operationQueue.current.length === 0 || !user) {
      return;
    }

    isProcessingQueue.current = true;
    const operations = [...operationQueue.current];
    operationQueue.current = [];

    try {
      // Group operations by type
      const removeOperations = operations.filter(op => op.type === 'remove');
      const updateOperations = operations.filter(op => op.type === 'update');
      const addOperations = operations.filter(op => op.type === 'add');

      // Process removes in batch
      if (removeOperations.length > 0) {
        await fetch("/api/cart/batch-remove", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ 
            items: removeOperations.map(op => ({
              productId: op.productId,
              size: op.size
            }))
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
            items: updateOperations.map(op => ({
              productId: op.productId,
              size: op.size,
              quantity: op.quantity
            }))
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

  // Add operation to queue
  const queueOperation = (operation) => {
    if (!user) return;
    
    // Remove duplicate operations for the same item
    operationQueue.current = operationQueue.current.filter(op => 
      !(op.productId === operation.productId && 
        op.size === operation.size && 
        op.type === operation.type)
    );
    
    operationQueue.current.push(operation);
    scheduleQueueProcessing();
  };

  // Existing methods with queue integration...
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
          dispatch({ type: "SET_CART", payload: data.cart?.items || [] });
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

    dispatch({ type: "ADD_ITEM", payload: cartItem });
    queueOperation({ type: 'add', ...cartItem });
  };

  const updateQuantity = async (productId, size, quantity) => {
    dispatch({ 
      type: "UPDATE_QUANTITY", 
      payload: { productId, size, quantity } 
    });
    
    queueOperation({ 
      type: 'update', 
      productId, 
      size, 
      quantity 
    });
  };

  const removeFromCart = async (productId, size) => {
    dispatch({ 
      type: "REMOVE_ITEM", 
      payload: { productId, size } 
    });
    
    queueOperation({ 
      type: 'remove', 
      productId, 
      size 
    });
  };

  // New method for removing multiple items at once
  const removeMultipleFromCart = async (itemsToRemove) => {
    if (!Array.isArray(itemsToRemove) || itemsToRemove.length === 0) return;
    
    // Update local state immediately
    dispatch({ 
      type: "REMOVE_MULTIPLE_ITEMS", 
      payload: itemsToRemove 
    });

    // Queue all remove operations
    itemsToRemove.forEach(item => {
      queueOperation({
        type: 'remove',
        productId: item.productId,
        size: item.size
      });
    });
  };

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
    operationInProgress: state.operationInProgress,
    totalItems,
    totalPrice,
    addToCart,
    updateQuantity,
    removeFromCart,
    removeMultipleFromCart, // New method
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