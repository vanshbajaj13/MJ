// src/components/checkout/DeliveryDetails.js
"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const DeliveryDetails = ({ selectedAddress, onChangeAddress }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm"
    >
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-center">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Delivering to
            </p>
            <svg
              className="w-5 h-5 text-blue-600 mt-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </div>
          <div>
            <p className="text-lg font-semibold text-gray-900 mt-1">
              {selectedAddress?.fullName}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              {selectedAddress?.phoneNumber}
            </p>
          </div>
        </div>

        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.3 }}
        >
          <svg
            className="w-5 h-5 text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 14l-7 7m0 0l-7-7m7 7V3"
            />
          </svg>
        </motion.div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-4 pt-4 border-t border-gray-100"
          >
            <div className="space-y-3">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-sm text-gray-600">
                  <span className="font-medium text-gray-900">
                    {selectedAddress?.addressLine1}
                  </span>
                  {selectedAddress?.addressLine2 && (
                    <>
                      <br />
                      <span>{selectedAddress.addressLine2}</span>
                    </>
                  )}
                  <br />
                  <span>
                    {selectedAddress?.city}, {selectedAddress?.state}{" "}
                    {selectedAddress?.postalCode}
                  </span>
                  <br />
                  <span className="text-xs text-gray-500">India</span>
                </p>
              </div>

              <motion.button
                onClick={onChangeAddress}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-2 px-4 text-sm font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
              >
                Change Address
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default DeliveryDetails;