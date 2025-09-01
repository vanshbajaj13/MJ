import mongoose from "mongoose";

const CustomerSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: false, // optional if user only logs in via OTP
    },
    name: {
      type: String,
    },
    mobile: {
      type: String,
    },
    addresses: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Address",
      },
    ],
    defaultAddress: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Address",
    },
    otp: {
      code: { type: String },
      expiry: { type: Date },
    },
  },
  { timestamps: true }
);

export default mongoose.models.Customer ||
  mongoose.model("Customer", CustomerSchema);
