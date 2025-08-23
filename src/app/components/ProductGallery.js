"use client";

import React, { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import useEmblaCarousel from "embla-carousel-react";

export default function ProductGallery({ images = [] }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: "start" });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState([]);

  // Track slide change
  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;

    onSelect(); // set initial
    setScrollSnaps(emblaApi.scrollSnapList()); // get total dots
    emblaApi.on("select", onSelect);
  }, [emblaApi, onSelect]);

  if (!images.length) return null;

  return (
    <div>
      {/* Mobile carousel */}
      <div className="lg:hidden" ref={emblaRef}>
        <div className="flex">
          {images.map((img, i) => (
            <div className="flex-[0_0_100%] relative aspect-square max-h-[60vh]" key={i}>
              <Image
                src={img.url}
                alt={img.alt || `Product image ${i + 1}`}
                fill
                className="object-cover"
                priority={i === 0}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Dots for mobile */}
      <div className="flex justify-center mt-2 gap-2 lg:hidden">
        {scrollSnaps.map((_, i) => (
          <button
            key={i}
            onClick={() => emblaApi && emblaApi.scrollTo(i)}
            className={`w-2 h-2 rounded-full transition ${
              i === selectedIndex ? "bg-black" : "bg-gray-300"
            }`}
          />
        ))}
      </div>

      {/* Desktop grid */}
      <div className="hidden lg:grid grid-cols-2 gap-4">
        {images.map((img, i) => (
          <div
            key={i}
            className={`relative ${
              i === 0
                ? "col-span-2 w-full h-[85vh]" // First image spans full width & bigger
                : "aspect-square" // Others remain square
            }`}
          >
            <Image
              src={img.url}
              alt={img.alt || `Product image ${i + 1}`}
              fill
              className="object-cover"
              priority={i === 0}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
