"use client";

import { motion} from "framer-motion";

export default function LoadingScreen({ progress }) {

  return (
    // Wrap the whole loading screen in a motion.div with exit transition.
    <motion.div
      className="fixed inset-0 flex flex-col items-center justify-center bg-black z-[50]"
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
    >
      {/* Parent SVG that gets the glow effect */}
      <motion.svg
        width="300"
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
        <g id="J-letter" transform="translate(70, -10)" className="p-3">
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
      <div className="w-80 mt-1 h-3 bg-gray-700 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-white"
          initial={{ width: "0%" }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        />
      </div>
    </motion.div>
  );
}