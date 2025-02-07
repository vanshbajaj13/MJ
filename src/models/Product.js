// src/models/Product.js
import mongoose from "mongoose";

const ProductSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: [true, "Please provide a product name."] 
  },
  description: { 
    type: String 
  },
  price: { 
    type: Number, 
    required: [true, "Please provide a product price."] 
  },
  imageUrl: { 
    type: String 
  },
  category: { 
    type: String,
    // Example categories: "necklace", "ring", "bracelet", "earring"
  },
  material: { 
    type: String,
    // Example materials: "Sterling Silver", "Gold-Plated", "Leather"
  },
  stock: { 
    type: Number, 
    default: 0 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Middleware to update the "updatedAt" field before each save
ProductSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

// Prevent model overwrite upon initial compile in development
export default mongoose.models.Product || mongoose.model("Product", ProductSchema);
