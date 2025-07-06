"use client";

import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay } from "swiper/modules";
import "swiper/css";
import { permanentMarker } from "../fonts";
import useSWR from "swr";
import { useState, useEffect } from "react";
import CategoryCard from "./Cards/CategoryCard"; // New component

const fetcher = (url) => fetch(url).then((res) => res.json());

export default function ProductGrid() {
  const { data, isLoading } = useSWR("/api/categories", fetcher, {
    revalidateOnFocus: false,
    refreshInterval: 1000 * 60 * 5, // 5 minutes
  });

  const categories = data?.data || [];
  const skeletonCount = 5;
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 999);
    checkMobile();

    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  return (
    <div className="w-full mx-auto px-4 py-8">
      <h2
        className={`text-center mb-6 text-4xl md:text-6xl font-bold permanentMarker ${permanentMarker.className}`}
      >
        Shop by Category
      </h2>
      <Swiper
        key={`${categories.length}-${isMobile}`}
        modules={[Autoplay]}
        spaceBetween={20}
        loop={isMobile}
        autoplay={
          isMobile
            ? {
                delay: 2500,
                disableOnInteraction: false,
                waitForTransition: true,
              }
            : false
        }
        breakpoints={{
          320: { slidesPerView: 1.5, centeredSlides: true },
          480: { slidesPerView: 3, centeredSlides: true },
          768: { slidesPerView: 4,centeredSlides: false },
          999: { slidesPerView: 5,centeredSlides: false },
        }}
      >
        {Array.from({
          length: isLoading ? skeletonCount : categories.length,
        }).map((_, index) => (
          <SwiperSlide
            key={isLoading ? `skeleton-${index}` : categories[index]._id}
            className="py-10"
          >
            <CategoryCard
              category={isLoading ? null : categories[index]}
              loading={isLoading}
            />
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
}
