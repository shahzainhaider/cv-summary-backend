const mongoose = require('mongoose');

const cvBankSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true,
  },
  path: {
    type: String,
    required: [true, 'CV file path is required'],
    trim: true,
  },
  summary: {
    type: String,
    default: '',
    trim: true,
  },
  originalName: {
    type: String,
    required: true,
  },
  position: {
    type: String,
    default: '',
    trim: true,
    index: true, // Index for faster filtering
  },
  mimeType: {
    type: String,
    required: true,
  },
  fileSize: {
    type: Number,
    required: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true, // Adds createdAt and updatedAt fields
});

// Indexes for faster queries
cvBankSchema.index({ userId: 1, createdAt: -1 });
cvBankSchema.index({ userId: 1, path: 1 }, { unique: true }); // Ensure unique CV path per user
cvBankSchema.index({ userId: 1, position: 1 }); // Index for filtering by position

const CVBank = mongoose.models.CVBank || mongoose.model('CVBank', cvBankSchema);

module.exports = CVBank;
