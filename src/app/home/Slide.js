"use client";

import { motion } from "framer-motion";
import {permanentMarker} from "../fonts";

export default function Slide({ slide, direction }) {
  // Use custom class names if provided; otherwise, fallback to defaults.
  const containerClassName = slide.containerClassName || "";
  const titleClassName = slide.titleClassName || "";
  const taglineClassName = slide.taglineClassName || "";

  // Define horizontal sliding variants based on the direction.
  const variants = {
    enter: {
      x: direction > 0 ? "100%" : "-100%",
      opacity: 0,
    },
    center: {
      x: 0,
      opacity: 1,
    },
    exit: {
      x: direction > 0 ? "-100%" : "100%",
      opacity: 0,
    },
  };

  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center z-10"
      variants={variants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ duration: 1, ease: "anticipate" }}
      style={{ perspective: "1000px" }}
    >
      <div
        className={`flex flex-col items-center justify-center text-center px-4 ${containerClassName}`}
      >
        <motion.h1
          initial={{ opacity: 0.9, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.1 }}
          transition={{ duration: 0.8, ease: "anticipate" }}
          className={`text-4xl md:text-6xl font-bold ${permanentMarker.className} ${titleClassName}`}
        >
          {slide.title}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0.9, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.1 }}
          transition={{ duration: 0.8, ease: "anticipate" }}
          className={`mt-4 text-xl md:text-2xl ${taglineClassName}`}
        >
          {slide.tagline}
        </motion.p>
      </div>
    </motion.div>
  );
}
