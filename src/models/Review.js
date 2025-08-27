import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema({
  // Basic Info
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
    index: true
  },
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true,
    index: true
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    default: null // Allow anonymous reviews
  },
  
  // Review Content
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  title: {
    type: String,
    required: true,
    maxlength: 100
  },
  comment: {
    type: String,
    required: true,
    maxlength: 1000
  },
  
  // Reviewer Info (for anonymous reviews)
  reviewerName: {
    type: String,
    required: true,
    maxlength: 50
  },
  reviewerEmail: {
    type: String,
    required: true,
    lowercase: true
  },
  
  
  // Media
  images: [
    {
      public_id: String,
      url: String,
      blurDataURL: String,
    },
  ],
  videos: [{
    url: String,
    thumbnail: String
  }],
  
  // Verification & Status
  isVerifiedPurchase: {
    type: Boolean,
    default: false
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    default: null
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'hidden'],
    default: 'pending'
  },
  isPinned: {
    type: Boolean,
    default: false
  },
  
  // Metadata
  ipAddress: String,
  userAgent: String,
  
}, {
  timestamps: true
});

// Indexes for performance
reviewSchema.index({ productId: 1, status: 1 });
reviewSchema.index({ categoryId: 1, status: 1 });
reviewSchema.index({ status: 1, createdAt: -1 });
reviewSchema.index({ rating: 1 });
reviewSchema.index({ isVerifiedPurchase: 1 });
reviewSchema.index({ isPinned: 1, createdAt: -1 });

// Virtual - removed averageSpecificRating as jewelry-specific ratings are removed

// Static method to get product review stats
reviewSchema.statics.getProductStats = async function(productId) {
  const stats = await this.aggregate([
    { $match: { productId: new mongoose.Types.ObjectId(productId), status: 'approved' } },
    {
      $group: {
        _id: null,
        averageRating: { $avg: '$rating' },
        totalReviews: { $sum: 1 },
        ratingDistribution: {
          $push: '$rating'
        },
        verifiedCount: {
          $sum: { $cond: [{ $eq: ['$isVerifiedPurchase', true] }, 1, 0] }
        }
      }
    }
  ]);

  if (stats.length === 0) {
    return {
      averageRating: 0,
      totalReviews: 0,
      verifiedCount: 0,
      ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
    };
  }

  const result = stats[0];
  
  // Calculate rating distribution
  const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  result.ratingDistribution.forEach(rating => {
    distribution[rating]++;
  });

  return {
    averageRating: Math.round(result.averageRating * 10) / 10,
    totalReviews: result.totalReviews,
    verifiedCount: result.verifiedCount,
    ratingDistribution: distribution
  };
};

// Pre-save middleware
reviewSchema.pre('save', function(next) {
  // Auto-approve if verified purchase (you can modify this logic)
  if (this.isVerifiedPurchase && this.status === 'pending') {
    this.status = 'approved';
  }
  next();
});

export default mongoose.models.Review || mongoose.model('Review', reviewSchema);