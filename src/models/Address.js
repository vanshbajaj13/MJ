import mongoose from 'mongoose';

const addressSchema = new mongoose.Schema({
  phoneNumber: {
    type: String,
    required: true,
    index: true,
  },
  fullName: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
  },
  addressLine1: {
    type: String,
    required: true,
    trim: true,
  },
  addressLine2: {
    type: String,
    trim: true,
  },
  city: {
    type: String,
    required: true,
    trim: true,
  },
  state: {
    type: String,
    required: true,
    trim: true,
  },
  pincode: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        return /^\d{6}$/.test(v);
      },
      message: 'PIN code must be 6 digits'
    }
  },
  landmark: {
    type: String,
    trim: true,
  },
  addressType: {
    type: String,
    enum: ['home', 'office', 'other'],
    default: 'home',
  },
  isDefault: {
    type: Boolean,
    default: false,
  }
}, {
  timestamps: true,
});

// Index for efficient queries
addressSchema.index({ phoneNumber: 1, isDefault: -1 });

// Pre-save middleware to ensure only one default address per phone number
addressSchema.pre('save', async function(next) {
  if (this.isDefault) {
    // Remove default flag from other addresses of the same phone number
    await this.constructor.updateMany(
      { phoneNumber: this.phoneNumber, _id: { $ne: this._id } },
      { $set: { isDefault: false } }
    );
  }
  next();
});

// Static method to get addresses for a phone number
addressSchema.statics.getAddressesByPhone = function(phoneNumber) {
  return this.find({ phoneNumber }).sort({ isDefault: -1, updatedAt: -1 });
};

const Address = mongoose.models.Address || mongoose.model('Address', addressSchema);

export default Address;