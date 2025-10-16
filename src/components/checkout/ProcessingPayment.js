// src/components/checkout/PaymentRecoveryModal.js
"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";

const ProcessingPayment = () => {

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl"
      >
        <div className="flex flex-col items-center text-center">
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-16 h-16 border-4 border-gray-200 border-t-black rounded-full mb-6"
              />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Processing Payment
              </h3>
              <p className="text-sm text-gray-500">
                Please wait while we process your payment...
              </p>
            </>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ProcessingPayment;