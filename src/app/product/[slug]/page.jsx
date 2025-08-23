import Image from "next/image";
import Link from "next/link";
import ProductGallery from "../../components/ProductGallery";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/products/${slug}`
  );

  if (!res.ok) return { title: "Product Not Found" };

  const { data: product } = await res.json();
  return {
    title: product.name,
    description: product.description?.slice(0, 160),
  };
}

export default async function ProductPage({ params }) {
  const { slug } = await params;
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/products/${slug}`,
    {
      next: { revalidate: 300 },
    }
  );

  if (!res.ok) {
    return (
      <div className="text-center py-20 text-red-500">Product not found.</div>
    );
  }

  const { data: product } = await res.json();
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
      {/* Brand Header */}
      <div className="max-w-7xl mx-auto px-0 md:px-4 pb-6 lg:py-6">
        <div className="flex flex-col md:flex-row-reverse gap-10">
          {/* Image Section */}
          <div className="lg:w-1/2 lg:sticky lg:top-20 md:self-start overflow-hidden">
            <ProductGallery images={product.images} />
          </div>

          {/* Details Section */}
          <div className="md:w-1/2 px-4">
            <div className="space-y-6">
              <div className="border-b pb-6">
                <h2 className="text-gray-500 font-medium">{collection}</h2>
                <h1 className="text-3xl font-bold text-gray-900 mt-1">
                  {product.name}
                </h1>
                <p className="text-gray-500 mt-2">Material: {material}</p>
              </div>

              <div className="border-b pb-6">
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

              <div className="border-b pb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Quantity
                </h3>
                <div className="flex items-center">
                  <button className="border border-gray-300 w-10 h-10 flex items-center justify-center rounded-l-md">
                    -
                  </button>
                  <div className="border-y border-gray-300 w-12 h-10 flex items-center justify-center font-medium">
                    1
                  </div>
                  <button className="border border-gray-300 w-10 h-10 flex items-center justify-center rounded-r-md">
                    +
                  </button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <button className="bg-black text-white px-6 py-4 rounded-md hover:bg-gray-800 transition flex-1 font-medium">
                  Add to Cart
                </button>
                <button className="border-2 border-black text-black px-6 py-4 rounded-md hover:bg-gray-50 transition flex-1 font-medium">
                  Buy it now
                </button>
              </div>

              <div className="bg-gray-100 p-4 rounded-md text-center">
                <p className="text-gray-700 font-medium">
                  NO RETURNS, CHARGEABLE EXCHANGES
                </p>
              </div>

              <div className="bg-gray-50 p-5 rounded-lg">
                <h3 className="font-bold text-gray-900 mb-3">
                  Product Details
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Material</p>
                    <p className="font-medium">{material}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Gender</p>
                    <p className="font-medium">{gender}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">SKU</p>
                    <p className="font-medium">{sku}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Category</p>
                    <p className="font-medium">{category}</p>
                  </div>
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Description
                </h3>
                <p className="text-gray-700 leading-relaxed">
                  {product.description ||
                    "Exquisitely crafted jewelry piece designed for elegance and timeless appeal. Perfect for gifting or adding a touch of luxury to your own collection."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
