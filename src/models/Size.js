// models/Size.js
const mongoose = require("mongoose");

const sizeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  description: {
    type: String,
    maxlength: 500,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Prevent model recompilation
const Size = mongoose.models.Size || mongoose.model("Size", sizeSchema);
module.exports = Size;
