import mongoose from 'mongoose';

const otpSchema = new mongoose.Schema({
  phoneNumber: {
    type: String,
    required: true,
    index: true, // Index for faster queries
  },
  otp: {
    type: String,
    required: true,
  },
  attempts: {
    type: Number,
    default: 0,
    max: 3, // Maximum 3 attempts
  },
  verified: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 300, // TTL: 5 minutes (300 seconds)
  },
  lastAttemptAt: {
    type: Date,
    default: Date.now,
  }
}, {
  timestamps: true,
});

// Compound index for efficient queries
otpSchema.index({ phoneNumber: 1, verified: 1 });

// Pre-save middleware to handle rate limiting
otpSchema.pre('save', function(next) {
  if (this.isNew) {
    this.lastAttemptAt = new Date();
  }
  next();
});

// Static method to generate OTP
otpSchema.statics.generateOTP = function() {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Static method to find valid OTP
otpSchema.statics.findValidOTP = function(phoneNumber) {
  return this.findOne({
    phoneNumber,
    verified: false,
    attempts: { $lt: 3 },
    createdAt: { $gt: new Date(Date.now() - 5 * 60 * 1000) } // Within 5 minutes
  });
};

// Instance method to verify OTP
otpSchema.methods.verifyOTP = function(providedOTP) {
  this.attempts += 1;
  this.lastAttemptAt = new Date();
  
  if (this.otp === providedOTP) {
    this.verified = true;
    return true;
  }
  
  return false;
};

const Otp = mongoose.models.Otp || mongoose.model('Otp', otpSchema);

export default Otp;