// next-seo.config.js
export default {
  title: "My Store | Modern Jewelry & Fashion",
  description:
    "Discover handmade rings, necklaces, and jewelry with timeless elegance. Shop the latest designs at My Store.",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://my-store.com/",
    siteName: "My Store",
    images: [
      {
        url: "https://my-store.com/og-image.jpg", // default OG image
        width: 1200,
        height: 630,
        alt: "My Store Jewelry",
      },
    ],
  },
  twitter: {
    handle: "@mystore",
    site: "@mystore",
    cardType: "summary_large_image",
  },
};
