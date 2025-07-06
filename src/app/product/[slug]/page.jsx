import Image from "next/image";
import Link from "next/link";

export async function generateMetadata({ params }) {
  // Properly await the params object
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
      next: { revalidate: 300 }, // cache for 5 mins
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

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {/* Image */}
        <div className="relative w-full h-[400px] sm:h-[500px] lg:h-[600px] border rounded-xl overflow-hidden">
          <Image
            src={primaryImage?.url || "/fallback.jpg"}
            alt={product.name}
            fill
            priority
            placeholder="blur"
            blurDataURL={primaryImage?.blurDataURL || "/blur-placeholder.jpg"}
            className="object-cover rounded-xl"
          />
        </div>

        {/* Details */}
        <div className="flex flex-col space-y-6">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
            {product.name}
          </h1>
          <p className="text-gray-700 leading-relaxed">{product.description}</p>

          <div className="text-2xl font-semibold text-gray-900">
            ₹{product.price?.toFixed(2)}
            {product.discount > 0 && (
              <span className="ml-3 text-sm line-through text-gray-500">
                ₹{(product.price / (1 - product.discount / 100)).toFixed(2)}
              </span>
            )}
          </div>

          <div className="flex flex-col space-y-1 text-sm text-gray-600">
            <span>
              Material: <strong>{product.material}</strong>
            </span>
            <span>
              Gender: <strong>{product.gender}</strong>
            </span>
            <span>
              SKU: <strong>{product.SKU}</strong>
            </span>
            <span>
              Category: <strong>{product.category?.name}</strong>
            </span>
          </div>

          <button className="mt-6 bg-black text-white px-6 py-3 rounded-md hover:bg-gray-800 transition">
            Add to Cart
          </button>

          <Link
            href="/products"
            className="text-blue-600 hover:underline text-sm"
          >
            ← Back to Products
          </Link>
        </div>
      </div>
    </div>
  );
}
