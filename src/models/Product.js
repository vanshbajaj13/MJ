const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true,
  },
  description: {
    type: String,
    required: true,
    maxlength: 2000,
  },
  price: {
    type: Number,
    required: true,
  },
  encryptedCost: {
    type: String,
    required: true,
  },
  discount: {
    type: Number,
    default: 0,
  },
  SKU: {
    type: String,
    unique: true,
    required: true,
  },
  material: {
    type: String,
    enum: ["Gold", "Silver", "Alloy", "Brass", "Platinum", "Stainless Steel"],
    required: true,
  },
  gender: {
    type: String,
    enum: ["Men", "Women", "Unisex"],
    required: true,
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category",
    required: true,
  },
  images: [
    {
      public_id: String,
      url: String,
      blurDataURL: String,
      position: Number,
    },
  ],
  availableQty: {
    type: Number,
    default: 0,
  },
  soldQty: {
    type: Number,
    default: 0,
  },
  tags: [String],
  isFeatured: {
    type: Boolean,
    default: false,
  },
  averageRating: {
    type: Number,
    default: 0,
  },
  options: [
    {
      name: { type: String, required: true }, // e.g., "Silver Chain"
      price: { type: Number, required: true }, // e.g., 1599
      description: { type: String }, // optional
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});


// Prevent model recompilation
const Product =
  mongoose.models.Product || mongoose.model("Product", productSchema);
module.exports = Product;
