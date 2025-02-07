"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import LoadingScreen from "./components/LoadingScreen";

export default function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0); // Track progress

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => (prev < 90 ? prev + 10 : prev)); // Increment progress
    }, 500);

    // Simulate waiting for 3 seconds
    const timer = setTimeout(() => {
      fetch("/api/products")
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setProducts(data.data);
          }
          clearInterval(interval);
          setProgress(100); // Complete progress
          setTimeout(() => setLoading(false), 500); // Delay fade-out
        })
        .catch(() => {
          clearInterval(interval);
          setLoading(false);
        });
    }, 3100); // Wait for 3 seconds before fetching products

    return () => {
      clearInterval(interval);
      clearTimeout(timer); // Clean up the timer
    };
  }, []);

  if (loading) {
    return <LoadingScreen progress={progress} />;
  }

  return (
    <div className="container mx-auto p-8">
      <h2 className="text-3xl font-bold mb-6 text-center">Our Products</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {products.length ? (
          products.map((product) => (
            <div
              key={product._id}
              className="border rounded-lg p-4 text-center"
            >
              <img
                src={product.imageUrl || "https://via.placeholder.com/150"}
                alt={product.name}
                className="w-full h-auto mb-4"
              />
              <h3 className="text-xl font-semibold mb-2">{product.name}</h3>
              <p className="mb-2">{product.description}</p>
              <p className="font-bold">${product.price.toFixed(2)}</p>
            </div>
          ))
        ) : (
          <p className="col-span-full text-center">No products available.</p>
        )}
      </div>
    </div>
  );
}
