// components/ui/Tooltip.jsx - Reusable tooltip component
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";

export default function Tooltip({ 
  message, 
  type = "info", // info, warning, error, success
  duration = 5000,
  onClose,
  position = "top" // top, bottom
}) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        if (onClose) onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const handleClose = () => {
    setIsVisible(false);
    if (onClose) onClose();
  };

  const styles = {
    info: {
      bg: "bg-blue-50",
      border: "border-blue-200",
      text: "text-blue-900",
      icon: "text-blue-600",
      iconBg: "bg-blue-100"
    },
    warning: {
      bg: "bg-amber-50",
      border: "border-amber-200",
      text: "text-amber-900",
      icon: "text-amber-600",
      iconBg: "bg-amber-100"
    },
    error: {
      bg: "bg-red-50",
      border: "border-red-200",
      text: "text-red-900",
      icon: "text-red-600",
      iconBg: "bg-red-100"
    },
    success: {
      bg: "bg-green-50",
      border: "border-green-200",
      text: "text-green-900",
      icon: "text-green-600",
      iconBg: "bg-green-100"
    }
  };

  const icons = {
    info: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    ),
    warning: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-1.959-1.333-2.73 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    ),
    error: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    ),
    success: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    )
  };

  const style = styles[type];

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: position === "top" ? -20 : 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: position === "top" ? -20 : 20, scale: 0.95 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className={`${style.bg} ${style.border} border rounded-xl p-4 shadow-lg backdrop-blur-sm`}
        >
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 ${style.iconBg} rounded-full flex items-center justify-center flex-shrink-0`}>
              <svg className={`w-5 h-5 ${style.icon}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {icons[type]}
              </svg>
            </div>
            
            <div className="flex-1 min-w-0">
              <p className={`text-sm ${style.text} leading-relaxed`}>
                {message}
              </p>
            </div>

            <button
              onClick={handleClose}
              className={`${style.text} hover:opacity-70 transition-opacity flex-shrink-0`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Toast container component for stacking multiple tooltips
export function ToastContainer({ children, position = "top-right" }) {
  const positions = {
    "top-right": "top-4 right-4",
    "top-left": "top-4 left-4",
    "top-center": "top-4 left-1/2 -translate-x-1/2",
    "bottom-right": "bottom-4 right-4",
    "bottom-left": "bottom-4 left-4",
    "bottom-center": "bottom-4 left-1/2 -translate-x-1/2"
  };

  return (
    <div className={`fixed ${positions[position]} z-50 space-y-3 max-w-md w-full px-4`}>
      {children}
    </div>
  );
}