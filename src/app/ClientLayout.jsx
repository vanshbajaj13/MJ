"use client";

import { useState } from "react";
import Navbar from "../components/Navbar";
import CartDrawerPortal from "@/components/Cart/CartDrawerPortal";

export default function ClientLayout({ children }) {
  const [isCartOpen, setIsCartOpen] = useState(false);

  return (
    <>
      <Navbar onCartClick={() => setIsCartOpen(true)} />
      <main className="pt-[9vh]">{children}</main>
      <CartDrawerPortal
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
      />
    </>
  );
}
