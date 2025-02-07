"use client";

import { useEffect, useState } from "react";
import { motion, useAnimation } from "framer-motion";

export default function LoadingScreen({ progress }) {
  const controls = useAnimation();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Start glow animation after both letters finish drawing
  useEffect(() => {
    if (isClient) {
      // Start glow 3.1 seconds later (after M and J are drawn)
      const glowTimer = setTimeout(() => {
        controls.start({
          filter: [
            "drop-shadow(0px 0px 10px white)",
            "drop-shadow(0px 0px 4px white)"
          ],
          transition: {
            repeat: Infinity,
            repeatType: "mirror",
            duration: 2,
          },
        });
      }, 3100);

      return () => clearTimeout(glowTimer);
    }
  }, [controls, isClient]);

  if (!isClient) return null;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black">
      {/* Apply the glow effect on the parent svg only */}
      <motion.svg
        // Set initial filter on the parent
        style={{ filter: "drop-shadow(0px 0px 10px white)" }}
        animate={controls}
        width="400"
        height="200"
        viewBox="0 0 400 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* "M" Letter */}
        <g id="M-letter" transform="translate(40, 0)">
          <motion.path
            d="M 50 150 L 50 50 L 100 120 L 150 50 L 150 150"
            stroke="white"
            strokeWidth="20"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
          />
        </g>

        {/* "J" Letter */}
        <g id="J-letter" transform="translate(70, -10)">
          <motion.path
            d="M 230 50 L 230 130 Q 230 170 190 170 Q 150 170 150 130"
            stroke="white"
            strokeWidth="20"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{
              pathLength: { delay: 1.6, duration: 1.5, ease: "easeInOut" },
              opacity: { delay: 1.5, duration: 0.1 },
            }}
          />
        </g>
      </motion.svg>

      {/* Progress Bar */}
      <div className="w-80 mt-6 h-3 bg-gray-700 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-white"
          initial={{ width: "0%" }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        />
      </div>
    </div>
  );
}
