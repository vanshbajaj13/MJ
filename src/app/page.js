// app/page.js
import HomeSlider from "./home/HomeSlider";
import Footer from "../components/Footer";
import ProductGrid from "./home/ProductGrid";
import LatestLaunch from "./home/LatestLaunch";
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
