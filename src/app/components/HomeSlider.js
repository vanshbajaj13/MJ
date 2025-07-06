"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Slide from "./Slide";

// Define your slides – you can add more objects later.
// You can optionally pass custom class names for container, title, and tagline.
const slides = [
  {
    id: 1,
    title: "M.Jewels",
    tagline: "Elevate Your Style with Timeless Elegance",
    // Custom classes for this slide (optional):
    // containerClassName:
    //   "flex flex-col items-center justify-center text-center px-4",
    titleClassName: "text-red-500",
    taglineClassName: "text-gray-300",
    // image: "/images/brand.jpg", // Uncomment and add image if desired.
  },
  {
    id: 2,
    title: "Exclusive Offer",
    tagline: "Get 50% off on our premium collection – Limited Time!",
    // No custom classes provided → defaults will be used.
  },
];

export default function HomeSlider() {
  // We use a state tuple for [currentSlideIndex, direction]
  const [[page, direction], setPage] = useState([0, 0]);

  // Auto-rotate slides every 5 seconds.
  useEffect(() => {
    const interval = setInterval(() => {
      paginate(1);
    }, 5000);
    return () => clearInterval(interval);
  }, [page]);

  // Function to update slide index and direction.
  const paginate = (newDirection) => {
    setPage(([prevPage]) => {
      let newPage = prevPage + newDirection;
      if (newPage < 0) {
        newPage = slides.length - 1;
      } else if (newPage >= slides.length) {
        newPage = 0;
      }
      return [newPage, newDirection];
    });
  };

  // For swipe gesture detection.
  const swipeConfidenceThreshold = 10000;
  const swipePower = (offset, velocity) => Math.abs(offset) * velocity;

  return (
    <div className="relative w-full h-[50vh] sm:h-[40vh] md:h-[50vh] lg:h-[60vh] xl:h-[80vh] overflow-hidden">
      <AnimatePresence initial={false} custom={direction}>
        <Slide key={page} slide={slides[page]} direction={direction} />
      </AnimatePresence>

      {/* Invisible drag layer to allow swiping between slides */}
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={1}
        onDragEnd={(e, { offset, velocity }) => {
          const swipe = swipePower(offset.x, velocity.x);
          if (swipe < -swipeConfidenceThreshold) {
            paginate(1);
          } else if (swipe > swipeConfidenceThreshold) {
            paginate(-1);
          }
        }}
        className="absolute inset-0 z-20"
      />

      {/* Navigation arrow buttons */}
      <div className="absolute inset-0 flex items-center justify-between px-4 z-30">
        <button
          onClick={() => paginate(-1)}
          className="text-3xl focus:outline-none"
        >
          ‹
        </button>
        <button
          onClick={() => paginate(1)}
          className="text-3xl focus:outline-none"
        >
          ›
        </button>
      </div>
    </div>
  );
}
