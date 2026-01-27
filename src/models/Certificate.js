import mongoose from 'mongoose';

const certificateSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  userName: {
    type: String,
    required: true
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  courseTitle: {
    type: String,
    required: true
  },
  courseThumbnail: {
    type: String
  },
  certificateId: {
    type: String,
    unique: true,
    required: true
  },
  completionDate: {
    type: Date,
    default: Date.now
  },
  totalLectures: {
    type: Number,
    required: true
  },
  totalDuration: {
    type: Number, // in minutes
    required: true
  }
}, {
  timestamps: true
});

// Compound index to ensure one certificate per user per course
certificateSchema.index({ userId: 1, courseId: 1 }, { unique: true });

const Certificate = mongoose.model('Certificate', certificateSchema);
export default Certificate;
