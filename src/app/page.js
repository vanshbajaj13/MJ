// app/page.js
import HomeSlider from "./components/HomeSlider";
import Footer from "./components/Footer";
import ProductGrid from "./components/ProductGrid";
import LatestLaunch from "./components/LatestLaunch";

export default function Page() {
  return (
    <>
      <HomeSlider />
      <ProductGrid />
      <LatestLaunch />
      <Footer />
    </>
  );
}
