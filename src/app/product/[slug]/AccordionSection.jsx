"use client";

import { useState, useRef, useEffect } from "react";

export default function AccordionSection({
  product,
  material,
  gender,
  sku,
  category,
}) {
  return (
    <div className="space-y-4">
      <AccordionItem title="DESCRIPTION / MATERIAL" defaultOpen={true}>
        <p className="text-gray-700 mt-2 leading-relaxed">
          {product.description ||
            "Exquisitely crafted jewelry piece designed for elegance and timeless appeal. Perfect for gifting or adding a touch of luxury to your own collection."}
        </p>
        <div className="mt-3 text-sm">
          <p className="text-gray-500">Material: {material}</p>
          <p className="text-gray-500">Gender: {gender}</p>
          <p className="text-gray-500">SKU: {sku}</p>
          <p className="text-gray-500">Category: {category}</p>
        </div>
      </AccordionItem>

      <AccordionItem title="SHIPPING">
        <p className="text-gray-700 leading-relaxed">
          Free shipping on orders over ₹5000. Standard delivery takes 3-5
          business days. Express shipping available at an additional cost.
        </p>
      </AccordionItem>

      <AccordionItem title="RETURNS/EXCHANGE">
        <p className="text-gray-700 leading-relaxed">
          We offer exchanges within 15 days of purchase. Items must be in
          original condition with all tags attached. Final sale items are not
          eligible for return or exchange.
        </p>
      </AccordionItem>

      <AccordionItem title="WARRANTY">
        <div>
          <h4 className="font-medium text-gray-900 mb-3">
            OUR MATERIAL ENSURE TO LAST FOREVER
          </h4>
          <ul className="space-y-2 text-gray-700">
            <li className="flex items-start">
              <span className="text-amber-500 mr-2">•</span>
              <span>
                Warranty - Premium materials, built to last. 1-year warranty on
                all products.
              </span>
            </li>
            <li className="flex items-start">
              <span className="text-amber-500 mr-2">•</span>
              <span>
                Water, Heat & Sweet-Proof - Hit the gym, go for a run or even
                take a shower.
              </span>
            </li>
          </ul>
        </div>
      </AccordionItem>
    </div>
  );
}

function AccordionItem({ title, children, defaultOpen = false }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const contentRef = useRef(null);
  const [height, setHeight] = useState(defaultOpen ? "auto" : "0px");

  useEffect(() => {
    if (contentRef.current) {
      setHeight(isOpen ? `${contentRef.current.scrollHeight}px` : "0px");
    }
  }, [isOpen]);

  return (
    <div className="relative border-b border-gray-200 pb-4">
      <button
        type="button"
        className="w-full flex justify-between items-center text-left font-medium text-gray-900 cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        <span>{title}</span>
        <span className={`ico-plus ${isOpen ? "open" : ""}`}></span>
      </button>
      <div
        ref={contentRef}
        style={{ maxHeight: height }}
        className="overflow-hidden transition-all duration-700 ease-in-out"
      >
        <div className="pt-2">{children}</div>
      </div>

      <style jsx>{`
        .ico-plus {
          position: relative;
          width: 20px;
          height: 20px;
          display: inline-block;
          flex-shrink: 0;
        }

        .ico-plus::before,
        .ico-plus::after {
          content: "";
          position: absolute;
          background-color: currentColor;
          transition: all 0.3s ease;
        }

        .ico-plus::before {
          width: 20px;
          height: 2px;
          top: 9px;
          left: 0;
        }

        .ico-plus::after {
          width: 2px;
          height: 20px;
          left: 9px;
          top: 0;
        }

        .ico-plus.open::after {
          transform: rotate(90deg);
          opacity: 0;
        }
      `}</style>
    </div>
  );
}
