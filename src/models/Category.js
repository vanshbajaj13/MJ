const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    image: {
      type: {
        public_id: { type: String, required: true },
        url: { type: String, required: true },
        blurDataURL: String,
      },
      required: true, // Entire images object is required
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
    },
  },
  { timestamps: true }
);

// Prevent model recompilation
const Category = mongoose.models.Category || mongoose.model("Category", categorySchema);
module.exports = Category;
