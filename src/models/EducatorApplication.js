import mongoose from 'mongoose';

const educatorApplicationSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    ref: 'User'
  },
  fullName: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  professionalEmail: {
    type: String,
    required: true
  },
  domains: [{
    type: String,
    required: true
  }],
  customDomain: {
    type: String,
    default: ''
  },
  skills: [{
    type: String,
    required: true
  }],
  experienceLevel: {
    type: String,
    required: true,
    enum: ['Student / Fresher', 'Self-taught Developer', 'Working Professional', 'Industry Trainer / Mentor']
  },
  proofLinks: {
    github: {
      type: String,
      default: ''
    },
    portfolio: {
      type: String,
      default: ''
    },
    linkedin: {
      type: String,
      default: ''
    }
  },
  motivation: {
    type: String,
    required: true
  },
  targetAudience: {
    type: String,
    required: true
  },
  availability: {
    type: String,
    enum: ['Weekly', 'Bi-weekly', 'Monthly', 'One-time course'],
    default: 'Weekly'
  },
  commitmentAccepted: {
    type: Boolean,
    required: true,
    default: false
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  appliedAt: {
    type: Date,
    default: Date.now
  },
  reviewedAt: {
    type: Date
  },
  adminNotes: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Prevent duplicate applications from same user
educatorApplicationSchema.index({ userId: 1, status: 1 });

const EducatorApplication = mongoose.model('EducatorApplication', educatorApplicationSchema);

export default EducatorApplication;
