// components/checkout/SessionTimer.jsx
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCheckout } from "@/context/BuyNowContext";

export default function SessionTimer() {
  const { clearSession, isActive, expiresAt } = useCheckout();
  const [timeLeft, setTimeLeft] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const [isExpired, setIsExpired] = useState(false);
  // Inside your component
  const [totalTime, setTotalTime] = useState(0);

  useEffect(() => {
    if (!isActive || !expiresAt) return;

    const now = new Date().getTime();
    const expiration = new Date(expiresAt).getTime();
    const total = Math.max(0, Math.floor((expiration - now) / 1000));
    setTotalTime(total);

    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const remaining = Math.max(0, Math.floor((expiration - now) / 1000));

      if (remaining <= 0) {
        setIsExpired(true);
        setTimeout(() => clearSession(), 1000);
        return 0;
      }
      return remaining;
    };

    setTimeLeft(calculateTimeLeft());

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [isActive, expiresAt, clearSession]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const getTimerColor = () => {
    if (isExpired) return "text-red-600";
    if (timeLeft <= 60) return "text-red-500 animate-pulse";
    return "text-gray-600";
  };

  if (!isActive || !expiresAt) return null;

  return (
    <>
      <div className="flex items-center gap-3">
        {/* Timer Display */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={`
            bg-white px-3 py-2 flex items-center gap-2
            transition-all duration-300
          `}
        >
          <div className="flex items-center gap-1">
            <svg
              className={`w-4 h-4 ${getTimerColor()} transition-colors duration-300`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span
              className={`text-sm font-medium ${getTimerColor()} transition-colors duration-300`}
            >
              {isExpired ? "Session Expired" : `${formatTime(timeLeft)} left`}
            </span>
          </div>

          {/* Progress Circle - Only show if we have time left */}
          {timeLeft > 0 && (
            <div className="relative w-6 h-6">
              <svg className="w-6 h-6 transform -rotate-90" viewBox="0 0 24 24">
                {/* Background circle */}
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="2"
                  fill="none"
                  className="text-gray-200"
                />
                {/* Progress circle */}
                <motion.circle
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="2"
                  fill="none"
                  strokeLinecap="round"
                  className={timeLeft <= 60 ? "text-red-500" : "text-blue-500"}
                  initial={{ strokeDashoffset: 62.8 }}
                  animate={{
                    strokeDashoffset: 62.8 * (timeLeft / totalTime),
                  }}
                  transition={{ duration: 1 }}
                  strokeDasharray="62.8"
                />
              </svg>
            </div>
          )}
        </motion.div>
      </div>

      {/* Warning Tooltip - Centered Horizontally */}
      <AnimatePresence>
        {showWarning && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.9 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="fixed top-20 right-4 transform z-50"
          >
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 shadow-lg backdrop-blur-sm max-w-xs mx-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg
                    className="w-4 h-4 text-amber-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-1.959-1.333-2.73 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm text-amber-900 leading-relaxed">
                    Only 1 minute left! Complete your purchase before the
                    session expires.
                  </p>
                </div>

                <button
                  onClick={() => setShowWarning(false)}
                  className="text-amber-900 hover:opacity-70 transition-opacity flex-shrink-0"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
