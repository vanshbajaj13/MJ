// app/page.js
import HomeSlider from "./components/HomeSlider";
import Footer from "./components/Footer";
import ProductGrid from "./components/ProductGrid";
import LatestLaunch from "./components/LatestLaunch";
import Loading from "./loading";
import { Suspense } from "react";

export default function Page() {
  return (
    <>
      <Suspense fallback={<Loading />}>
        <HomeSlider />
        <ProductGrid />
        <LatestLaunch />
        <Footer />
      </Suspense>
    </>
  );
}
