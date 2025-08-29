"use client";
import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import CartDrawer from "./CartDrawer"; // adjust import path

export default function CartDrawerPortal({ isOpen, onClose }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true); // prevent SSR mismatch
  }, []);

  if (!mounted) return null;

  return createPortal(
    <CartDrawer isOpen={isOpen} onClose={onClose} />,
    document.body
  );
}
