"use client";

import { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import LoadingScreen from "./components/Loading/LoadingScreen";
import HomeSlider from "./components/HomeSlider";
import ProductGrid from "./components/ProductGrid";
import Footer from "./components/Footer";

export default function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0); // Track progress percentage
  const [fetchCompleted, setFetchCompleted] = useState(false);
  const [error, setError] = useState(null);
  const [isRetryLoading, setIsRetryLoading] = useState(false);
  // Global start time for the entire loading period.
  const startTimeRef = useRef(Date.now());

  // Function to fetch products and update states.
  const fetchProducts = () => {
    // Set start time only when the component mounts (if needed, you can reset here too)
    // startTimeRef.current = Date.now();

    setLoading(true);
    setProgress(0);
    setError(null);
    setFetchCompleted(false);

    // Start the fetch immediately.
    fetch("/api/products")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setProducts(data.data);
        } else {
          setError(data.error || "Unknown error occurred.");
        }
        setFetchCompleted(true);
        const elapsed = Date.now() - startTimeRef.current;
        const remaining = 3100 - elapsed;
        if (remaining > 0) {
          setTimeout(() => {
            setProgress(100);
            setLoading(false);
          }, remaining);
        } else {
          setProgress(100);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error(err);
        setError("Failed to load products. Please try again.");
        setFetchCompleted(true);
        setLoading(false);
      });
  };
  // Function to fetch products without loading screen.
  const fetchProductsWithoutLoadingScreen = () => {
    setFetchCompleted(false);
    setIsRetryLoading(true);
    fetch("/api/products")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setProducts(data.data);
        } else {
          setError(data.error || "Unknown error occurred.");
        }
        setFetchCompleted(true);
        setIsRetryLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError("Failed to load products. Please try again.");
        setFetchCompleted(true);
        setIsRetryLoading(false);
      });
  };

  useEffect(() => {
    // Capture the start time on mount.
    startTimeRef.current = Date.now();
    // Run the fetch and progress animation when component mounts.
    fetchProducts();

    let smoothInterval;
    let chunkInterval;

    // Phase 1: Smooth progress update from 0 to 80% over first 2000ms.
    smoothInterval = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      if (elapsed < 2000) {
        const prog = (elapsed / 2000) * 80;
        setProgress(prog);
      } else {
        clearInterval(smoothInterval);
        // Phase 2: If fetch isn't complete, update progress in chunks every 500ms.
        if (!fetchCompleted) {
          chunkInterval = setInterval(() => {
            setProgress((prev) => (prev < 94 ? prev + 5 : prev));
          }, 500);
        }
      }
    }, 50);

    return () => {
      clearInterval(smoothInterval);
      if (chunkInterval) clearInterval(chunkInterval);
    };
  }, []);

  return (
    <>
      <AnimatePresence exitBeforeEnter>
        {loading ? (
          <LoadingScreen progress={progress} key="loading" />
        ) : (
          <motion.div
            key="content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <HomeSlider />
            <ProductGrid />
            <div className="container mx-auto p-8 pt-0">
              <h2 className="text-3xl font-bold mb-6 text-center">
                Our Products
              </h2>
              {products.length ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                  {products.map((product) => (
                    <div
                      key={product._id}
                      className="border rounded-lg p-4 text-center"
                    >
                      <img
                        src={
                          product.imageUrl || "https://via.placeholder.com/150"
                        }
                        alt={product.name}
                        className="w-full h-auto mb-4"
                      />
                      <h3 className="text-xl font-semibold mb-2">
                        {product.name}
                      </h3>
                      <p className="mb-2">{product.description}</p>
                      <p className="font-bold">${product.price.toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="container mx-auto p-8 text-center">
                  <p className="text-red-500 text-xl mb-4">{error}</p>
                  <button
                    onClick={fetchProductsWithoutLoadingScreen}
                    className="text-gray-900 bg-white border border-gray-300 focus:outline-none hover:bg-gray-100 font-medium rounded-lg px-5 py-2.5 me-2 mb-2 dark:bg-gray-800 dark:text-white dark:border-gray-600 dark:hover:bg-gray-700 dark:hover:border-gray-600"
                  >
                    {isRetryLoading ? (
                      <svg
                        aria-hidden="true"
                        role="status"
                        className="inline w-4 h-4 me-3 text-gray-200 animate-spin dark:text-gray-600"
                        viewBox="0 0 100 101"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                          fill="currentColor"
                        />
                        <path
                          d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                          fill="#1C64F2"
                        />
                      </svg>
                    ) : (
                      <span className="mr-2">&#8635;</span>
                    )}
                    {isRetryLoading ? "Loading" : "Retry"}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <Footer />
    </>
  );
}
