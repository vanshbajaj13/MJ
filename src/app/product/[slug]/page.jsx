import ProductGallery from "./ProductGallery";
import AccordionSection from "./AccordionSection";
import AddToBag from "./AddToBag";

async function fetchProduct(slug) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/products/${slug}`,
    {
      next: { revalidate: 300 },
    }
  );

  if (!res.ok) return null;
  const { data } = await res.json();
  return data;
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const product = await fetchProduct(slug);
  return {
    title: product?.name || "Product Not Found",
    description: product?.description?.slice(0, 160) || "",
  };
}

export default async function ProductPage({ params }) {
  const { slug } = await params;
  const product = await fetchProduct(slug);
  if (!product) {
    return (
      <div className="text-center py-20 text-red-500">Product not found.</div>
    );
  }

  const primaryImage =
    product.images?.find((img) => img.position === 0) || product.images?.[0];

  // Static fallback fields
  const collection = "Signature Collection";
  const material = product.material || "Silver";
  const gender = product.gender || "Unisex";
  const sku = product.SKU;
  const category = "Jewelry";

  return (
    <div className="bg-white min-h-screen">
      <div className="max-w-7xl mx-auto px-0 lg:px-8 pb-12 lg:pt-4">
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-16">
          {/* Image Section */}
          <div className="lg:w-1/2 overflow-hidden">
            <ProductGallery images={product.images} />
          </div>

          {/* Details Section */}
          <div className="lg:w-1/2 sticky w-[90%] top-24 self-start m-auto lg:m-0">
            <div className="space-y-6 ">
              <div>
                <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                  {collection}
                </h2>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mt-1">
                  {product.name}
                </h1>

                {/* Rating */}
                <div className="flex items-center mt-2">
                  <div className="flex text-amber-400">
                    {/* ★★★☆☆ - 3 star rating as shown in example */}
                    {[1, 2, 3, 4, 5].map((star) => (
                      <svg
                        key={star}
                        className={`h-5 w-5 ${
                          star <= 3 ? "fill-current" : "text-gray-300"
                        }`}
                        viewBox="0 0 20 20"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <span className="ml-2 text-sm text-gray-500">review</span>
                </div>
              </div>

              <div className="border-t border-b border-gray-200 py-4">
                <div className="text-2xl font-bold text-gray-900">
                  ₹{product.price?.toFixed(2)}
                  {product.discount > 0 && (
                    <span className="ml-3 text-base line-through text-gray-500">
                      ₹
                      {(product.price / (1 - product.discount / 100)).toFixed(
                        2
                      )}
                    </span>
                  )}
                </div>
                <p className="text-gray-600 text-sm mt-1">
                  Tax included. Shipping calculated at checkout.
                </p>
              </div>

              {/* Size Selector */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-900">Size:</h3>
                  <button className="text-xs text-gray-500 underline">
                    Size chart
                  </button>
                </div>
                <div className="flex space-x-3">
                  {product.sizes.map((s) => (
                    <button
                      key={s.size._id}
                      className="border border-gray-300 px-4 py-2 text-sm font-medium rounded-md hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500"
                    >
                      {s.size.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Add to Cart Button */}
              <AddToBag />

              {/* Buy It Now Button */}
              <div className="bg-black text-white p-4 rounded-md text-center">
                <button className="font-medium text-sm">
                  BUY IT NOW
                </button>
              </div>

              {/* No Returns Notice */}
              <div className="text-center">
                <p className="text-gray-700 text-sm font-medium">
                  NO RETURNS, CHARGEABLE EXCHANGES
                </p>
              </div>

              {/* Accordion Sections */}
              <AccordionSection
                product={product}
                material={material}
                gender={gender}
                sku={sku}
                category={category}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
