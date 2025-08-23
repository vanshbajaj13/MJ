'use client';

import { useState } from 'react';
import Image from 'next/image';

// ProductModal Component (unchanged)
function ProductModal({ isOpen, onClose, images }) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  if (!isOpen) return null;

  const selectedImage = images[selectedImageIndex];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4">
      <div className="relative bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 text-gray-700 hover:text-black text-3xl"
          aria-label="Close modal"
        >
          &times;
        </button>
        
        <div className="relative h-96 md:h-[500px]">
          <Image
            src={selectedImage.url}
            alt="Product image"
            fill
            className="object-contain"
            placeholder={selectedImage.blurDataURL ? 'blur' : 'empty'}
            blurDataURL={selectedImage.blurDataURL}
          />
        </div>
        
        <div className="p-4 bg-white">
          <div className="flex gap-2 overflow-x-auto py-2">
            {images.map((image, index) => (
              <div
                key={image.public_id}
                className={`relative h-16 w-16 min-w-[64px] cursor-pointer border-2 ${
                  index === selectedImageIndex ? 'border-black' : 'border-transparent'
                }`}
                onClick={() => setSelectedImageIndex(index)}
              >
                <Image
                  src={image.url}
                  alt={`Thumbnail ${index + 1}`}
                  fill
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ClientProductPage({ product }) {
  const [selectedSize, setSelectedSize] = useState('M');
  const [quantity, setQuantity] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [openTabs, setOpenTabs] = useState({});
  
  const increaseQuantity = () => setQuantity(prev => prev + 1);
  const decreaseQuantity = () => setQuantity(prev => Math.max(1, prev - 1));

  const handleAddToCart = () => {
    // Add to cart logic here
    console.log(`Added ${quantity} of ${selectedSize} to cart`);
  };

  const handleBuyNow = () => {
    // Buy now logic here
    console.log(`Buy now ${quantity} of ${selectedSize}`);
  };

  const toggleTab = (tabName) => {
    setOpenTabs(prev => ({
      ...prev,
      [tabName]: !prev[tabName]
    }));
  };

  // Check if product is available
  if (!product) {
    return (
      <div className="text-center py-20 text-red-500">Product not found.</div>
    );
  }

  // Get the first variant for initial size selection
  const firstVariant = product.variants && product.variants[0];
  const initialSize = firstVariant ? firstVariant.size.name : 'M';

  return (
    <div className="bg-white min-h-screen">
      {/* Breadcrumb Navigation */}
      <div className="border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-2 text-sm text-gray-500">
          <span>Home / </span>
          <span>{product.category?.name || 'Products'} / </span>
          <span className="text-gray-900">{product.name}</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Product Images - Mobile First */}
          <div className="md:w-1/2">
            <div className="sticky top-4">
              {product.images && product.images.length > 0 && (
                <>
                  <div 
                    className="relative aspect-square w-full cursor-pointer rounded-md overflow-hidden"
                    onClick={() => setIsModalOpen(true)}
                  >
                    <Image
                      src={product.images[0].url}
                      alt={product.name}
                      fill
                      className="object-cover"
                      placeholder={product.images[0].blurDataURL ? 'blur' : 'empty'}
                      blurDataURL={product.images[0].blurDataURL}
                    />
                  </div>
                  
                  <div className="flex gap-2 mt-4 overflow-x-auto">
                    {product.images.map((image, index) => (
                      <div
                        key={image.public_id || index}
                        className="relative h-20 w-20 min-w-[80px] cursor-pointer rounded-md overflow-hidden border"
                        onClick={() => setIsModalOpen(true)}
                      >
                        <Image
                          src={image.url}
                          alt={`Thumbnail ${index + 1}`}
                          fill
                          className="object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Product Details */}
          <div className="md:w-1/2">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">{product.name}</h1>
            <p className="text-xl font-semibold text-gray-900 mb-4">₹{product.price.toFixed(2)}</p>
            
            {/* Size Selector */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-900 mb-2">Size</h3>
              <div className="flex gap-2">
                {product.variants && product.variants.map(variant => (
                  <button
                    key={variant.sku}
                    className={`px-4 py-2 border rounded-md text-sm font-medium ${
                      selectedSize === variant.size.name
                        ? 'border-black bg-black text-white'
                        : 'border-gray-300 text-gray-700 hover:border-gray-400'
                    }`}
                    onClick={() => setSelectedSize(variant.size.name)}
                  >
                    {variant.size.name}
                  </button>
                ))}
              </div>
              <a href="#size-chart" className="text-xs text-gray-500 mt-2 inline-block underline">
                Size chart
              </a>
            </div>
            
            {/* Quantity Selector */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-900 mb-2">Quantity</h3>
              <div className="flex items-center">
                <button
                  className="border border-gray-300 w-10 h-10 flex items-center justify-center rounded-l-md"
                  onClick={decreaseQuantity}
                >
                  -
                </button>
                <div className="border-y border-gray-300 w-12 h-10 flex items-center justify-center font-medium">
                  {quantity}
                </div>
                <button
                  className="border border-gray-300 w-10 h-10 flex items-center justify-center rounded-r-md"
                  onClick={increaseQuantity}
                >
                  +
                </button>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex flex-col gap-3 mb-6">
              <button
                className="bg-black text-white px-6 py-4 rounded-md hover:bg-gray-800 transition font-medium"
                onClick={handleAddToCart}
              >
                ADD TO CART
              </button>
              <button
                className="border-2 border-black text-black px-6 py-4 rounded-md hover:bg-gray-50 transition font-medium"
                onClick={handleBuyNow}
              >
                BUY IT NOW
              </button>
            </div>
            
            {/* Notice */}
            <div className="bg-gray-100 p-4 rounded-md text-center mb-6">
              <p className="text-gray-700 font-medium text-sm">
                NO RETURNS, CHARGEABLE EXCHANGES
              </p>
            </div>
            
            {/* Product Info Tabs - Updated to Vertical Accordion */}
            <div className="border-t border-gray-200 pt-6">
              <div className="space-y-2">
                {/* DESCRIPTION / MATERIAL Tab */}
                <div className="border border-gray-200 rounded-md overflow-hidden">
                  <button
                    className="w-full p-4 text-left font-medium bg-gray-50 hover:bg-gray-100 flex justify-between items-center"
                    onClick={() => toggleTab('description')}
                  >
                    <span>DESCRIPTION / MATERIAL</span>
                    <span className="transform transition-transform">
                      {openTabs.description ? '−' : '+'}
                    </span>
                  </button>
                  {openTabs.description && (
                    <div className="p-4 bg-white">
                      <p className="text-gray-700 mb-4">{product.description}</p>
                      <p className="text-gray-700">
                        <strong>Material:</strong> {product.material}
                      </p>
                    </div>
                  )}
                </div>
                
                {/* SHIPPING Tab */}
                <div className="border border-gray-200 rounded-md overflow-hidden">
                  <button
                    className="w-full p-4 text-left font-medium bg-gray-50 hover:bg-gray-100 flex justify-between items-center"
                    onClick={() => toggleTab('shipping')}
                  >
                    <span>SHIPPING</span>
                    <span className="transform transition-transform">
                      {openTabs.shipping ? '−' : '+'}
                    </span>
                  </button>
                  {openTabs.shipping && (
                    <div className="p-4 bg-white">
                      <p className="text-gray-700">
                        We offer standard and express shipping options. Orders are processed within 1-2 business days.
                        Delivery times vary based on location.
                      </p>
                    </div>
                  )}
                </div>
                
                {/* RETURNS/EXCHANGE Tab */}
                <div className="border border-gray-200 rounded-md overflow-hidden">
                  <button
                    className="w-full p-4 text-left font-medium bg-gray-50 hover:bg-gray-100 flex justify-between items-center"
                    onClick={() => toggleTab('returns')}
                  >
                    <span>RETURNS/EXCHANGE</span>
                    <span className="transform transition-transform">
                      {openTabs.returns ? '−' : '+'}
                    </span>
                  </button>
                  {openTabs.returns && (
                    <div className="p-4 bg-white">
                      <p className="text-gray-700">
                        We offer chargeable exchanges within 14 days of purchase. Items must be unworn and in original condition.
                      </p>
                    </div>
                  )}
                </div>
                
                {/* WARRANTY Tab */}
                <div className="border border-gray-200 rounded-md overflow-hidden">
                  <button
                    className="w-full p-4 text-left font-medium bg-gray-50 hover:bg-gray-100 flex justify-between items-center"
                    onClick={() => toggleTab('warranty')}
                  >
                    <span>WARRANTY</span>
                    <span className="transform transition-transform">
                      {openTabs.warranty ? '−' : '+'}
                    </span>
                  </button>
                  {openTabs.warranty && (
                    <div className="p-4 bg-white">
                      <h4 className="font-bold text-gray-900 mb-3">OUR MATERIAL ENSURES TO LAST FOREVER</h4>
                      <ul className="space-y-3">
                        <li>
                          <strong>MISO Warranty</strong>
                          <p className="text-gray-700">Premium materials, built to last. 1-year warranty on all products.</p>
                        </li>
                        <li>
                          <strong>Water, Heat & Sweat-Proof</strong>
                          <p className="text-gray-700">Hit the gym, go for a run or even take a shower.</p>
                        </li>
                        <li>
                          <strong>Hypoallergenic (No Green Skin)</strong>
                          <p className="text-gray-700">316L stainless steel is tarnish-proof and suitable for sensitive skin.</p>
                        </li>
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Product Details */}
            <div className="bg-gray-50 p-5 rounded-lg mt-6">
              <h3 className="font-bold text-gray-900 mb-3">Product Details</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Material</p>
                  <p className="font-medium">{product.material}</p>
                </div>
                <div>
                  <p className="text-gray-500">Gender</p>
                  <p className="font-medium">{product.gender}</p>
                </div>
                <div>
                  <p className="text-gray-500">SKU</p>
                  <p className="font-medium">{product.SKU}</p>
                </div>
                <div>
                  <p className="text-gray-500">Category</p>
                  <p className="font-medium">
                    {typeof product.category === 'object' 
                      ? product.category.name 
                      : product.category}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Product Modal */}
      {product.images && product.images.length > 0 && (
        <ProductModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          images={product.images} 
        />
      )}
    </div>
  );
}