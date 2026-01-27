import mongoose from "mongoose";

const lectureProgressSchema = new mongoose.Schema(
  {
    lectureId: {
      type: String,
      required: true,
    },
    completedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const courseProgressSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      ref: "User",
      required: true,
      index: true,
    },

    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
      index: true,
    },

    completed: {
      type: Boolean,
      default: false,
    },

    lecturesCompleted: {
      type: [lectureProgressSchema],
      default: [],
    },

    progressPercent: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
  },
  {
    timestamps: true,
    minimize: false,
  }
);

courseProgressSchema.index({ userId: 1, courseId: 1 }, { unique: true });

export const CourseProgress = mongoose.model("CourseProgress",courseProgressSchema);
