import Link from "next/link";
import Image from "next/image";

const CategoryCard = ({ category, loading }) => {
  if (loading) {
    return (
      <div className="rounded-lg shadow-md bg-white border overflow-hidden">
        <div className="bg-gray-200 border-2 border-dashed w-full h-48 skeleton-shimmer" />
        <div className="p-3 text-center">
          <div className="h-6 bg-gray-200 rounded-full w-3/4 mx-auto mb-2 skeleton-shimmer"></div>
        </div>
      </div>
    );
  }

  return (
    <Link href={`/category/${category.slug}`}>
      <div className="rounded-lg shadow-md hover:shadow-xl transition duration-300 bg-white border overflow-hidden">
        <div className="relative w-full h-48">
          <Image
            loading="lazy"
            src={category.image.url}
            alt={category.name}
            fill
            className="object-cover hover:scale-110 transition-transform duration-700"
            placeholder="blur"
            blurDataURL={category.image.blurDataURL}
            sizes="(max-width: 768px) 100vw, 33vw"
          />
        </div>
        <div className="p-3 text-center">
          <h3 className="text-lg font-semibold text-gray-800">
            {category.name}
          </h3>
        </div>
      </div>
    </Link>
  );
};

export default CategoryCard;
