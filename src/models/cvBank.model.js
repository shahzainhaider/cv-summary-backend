const mongoose = require('mongoose');

const cvBankSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true,
  },
  title: {
    type: String,
    required: [true, 'CV title is required'],
    trim: true,
  },
  personalInfo: {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String,
    },
    linkedIn: String,
    portfolio: String,
    summary: String,
  },
  education: [{
    institution: {
      type: String,
      required: true,
    },
    degree: {
      type: String,
      required: true,
    },
    fieldOfStudy: String,
    startDate: Date,
    endDate: Date,
    gpa: Number,
    description: String,
  }],
  experience: [{
    company: {
      type: String,
      required: true,
    },
    position: {
      type: String,
      required: true,
    },
    location: String,
    startDate: Date,
    endDate: Date,
    current: {
      type: Boolean,
      default: false,
    },
    description: String,
    achievements: [String],
  }],
  skills: {
    technical: [String],
    soft: [String],
    languages: [{
      name: String,
      proficiency: {
        type: String,
        enum: ['Beginner', 'Intermediate', 'Advanced', 'Native'],
      },
    }],
  },
  certifications: [{
    name: String,
    issuer: String,
    issueDate: Date,
    expiryDate: Date,
    credentialId: String,
    credentialUrl: String,
  }],
  projects: [{
    name: {
      type: String,
      required: true,
    },
    description: String,
    technologies: [String],
    startDate: Date,
    endDate: Date,
    url: String,
    github: String,
  }],
  isPublic: {
    type: Boolean,
    default: false,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  version: {
    type: Number,
    default: 1,
  },
}, {
  timestamps: true, // Adds createdAt and updatedAt fields
});

// Indexes for faster queries
cvBankSchema.index({ userId: 1, createdAt: -1 });
cvBankSchema.index({ isPublic: 1, isActive: 1 });

const CVBank = mongoose.model('CVBank', cvBankSchema);

module.exports = CVBank;
