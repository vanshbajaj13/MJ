"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { permanentMarker } from "../app/fonts";

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  const toggleMenu = () => setMenuOpen((prev) => !prev);

  return (
    <>
      {/* Fixed Navbar */}
      <nav
        className="fixed h-[9vh] top-0 left-0 right-0 flex items-center justify-between px-4 py-3 z-50 border-b-2 border-black bg-[#636364bd] "
        style={{ backdropFilter: "blur(10px)" }}
      >
        {/* Left side: Animated Toggle Icon and Brand Name */}
        <div className="flex items-center space-x-2">
          <button onClick={toggleMenu} className="focus:outline-none">
            <AnimatePresence mode="wait">
              {menuOpen ? (
                <motion.svg
                  key="close"
                  initial={{ opacity: 0, rotate: -90 }}
                  animate={{ opacity: 1, rotate: 0 }}
                  exit={{ opacity: 0, rotate: 90 }}
                  transition={{ duration: 0.3 }}
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </motion.svg>
              ) : (
                <motion.svg
                  key="hamburger"
                  initial={{ opacity: 0, rotate: 90 }}
                  animate={{ opacity: 1, rotate: 0 }}
                  exit={{ opacity: 0, rotate: -90 }}
                  transition={{ duration: 0.3 }}
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </motion.svg>
              )}
            </AnimatePresence>
          </button>
          <Link
            href="/"
            className={`text-xl permanentMarker ${permanentMarker.className}`}
          >
            M.Jewels
          </Link>
        </div>

        {/* Right side: Action icons */}
        <div className="flex items-center space-x-5">
          {/* Search Icon */}
          <button className="focus:outline-none">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              fill="currentColor"
              className="bi bi-search"
              viewBox="0 0 16 16"
            >
              <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001q.044.06.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1 1 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0" />
            </svg>
          </button>
          {/* Account Icon */}
          <button className="focus:outline-none">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="25"
              height="25"
              fill="currentColor"
              className="bi bi-person"
              viewBox="0 0 16 16"
            >
              <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6m2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0m4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4m-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.289 10 8 10s-3.516.68-4.168 1.332c-.678.678-.83 1.418-.832 1.664z" />
            </svg>
          </button>
          {/* Wishlist Icon (Heart) */}
          <button className="focus:outline-none">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              fill="currentColor"
              className="bi bi-heart"
              viewBox="0 0 16 16"
            >
              <path d="m8 2.748-.717-.737C5.6.281 2.514.878 1.4 3.053c-.523 1.023-.641 2.5.314 4.385.92 1.815 2.834 3.989 6.286 6.357 3.452-2.368 5.365-4.542 6.286-6.357.955-1.886.838-3.362.314-4.385C13.486.878 10.4.28 8.717 2.01zM8 15C-7.333 4.868 3.279-3.04 7.824 1.143q.09.083.176.171a3 3 0 0 1 .176-.17C12.72-3.042 23.333 4.867 8 15" />
            </svg>
          </button>

          {/* Bag Icon */}
          <button className="focus:outline-none">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              fill="currentColor"
              className="bi bi-bag"
              viewBox="0 0 16 16"
            >
              <path d="M8 1a2.5 2.5 0 0 1 2.5 2.5V4h-5v-.5A2.5 2.5 0 0 1 8 1m3.5 3v-.5a3.5 3.5 0 1 0-7 0V4H1v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V4zM2 5h12v9a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1z" />
            </svg>
          </button>
        </div>
      </nav>

      {/* Hamburger Menu Overlay */}
      <AnimatePresence>
        {menuOpen && (
          // Outer motion.div: Covers the entire viewport and smoothly animates opacity and backdrop blur.
          <motion.div
            initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
            animate={{ opacity: 1, backdropFilter: "blur(2px)" }}
            exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            className="fixed top-[9vh] inset-0 z-40 bg-black/10"
            onClick={toggleMenu} // Clicking outside closes the menu.
          >
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{
                ease: "easeOut",
                duration: 0.5,
              }}
              // The menu occupies full height and a portion of the screen width on larger devices.
              className="h-full w-full sm:w-2/3 md:w-1/2 lg:w-1/3 bg-white"
              onClick={(e) => e.stopPropagation()} // Prevents closing when clicking inside the menu.
            >
              <div className="p-6">
                <ul className="space-y-6">
                  <li className="w-[90%] border-b border-gray-300 pb-2 hover:text-gray-700 transition-colors">
                    <Link
                      href="/"
                      onClick={toggleMenu}
                      className="text-xl block"
                    >
                      Home
                    </Link>
                  </li>
                  <li className="w-[90%] border-b border-gray-300 pb-2 hover:text-gray-700 transition-colors">
                    <Link
                      href="/products"
                      onClick={toggleMenu}
                      className="text-xl block"
                    >
                      Shop
                    </Link>
                  </li>
                  <li className="w-[90%] border-b border-gray-300 pb-2 hover:text-gray-700 transition-colors">
                    <Link
                      href="/collections"
                      onClick={toggleMenu}
                      className="text-xl block"
                    >
                      Collections
                    </Link>
                  </li>
                  <li className="w-[90%] border-b border-gray-300 pb-2 hover:text-gray-700 transition-colors">
                    <Link
                      href="/about"
                      onClick={toggleMenu}
                      className="text-xl block"
                    >
                      About
                    </Link>
                  </li>
                  <li className="w-[90%] border-b border-gray-300 pb-2 hover:text-gray-700 transition-colors">
                    <Link
                      href="/contact"
                      onClick={toggleMenu}
                      className="text-xl block"
                    >
                      Contact
                    </Link>
                  </li>
                </ul>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
