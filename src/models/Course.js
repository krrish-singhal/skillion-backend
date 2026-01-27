import mongoose from "mongoose";

const lectureSchema = new mongoose.Schema(
  {
    lectureId: {
      type: String,
      required: true,
    },

    lectureTitle: {
      type: String,
      required: true,
      trim: true,
    },

    lectureDuration: {
      type: Number,
      required: function() {
        // Duration is NOT required for assignments or projects
        return !this.isAssignment && !this.isProject;
      },
      validate: {
        validator: function(v) {
          // Skip validation for assignments and projects
          if (this.isAssignment || this.isProject) {
            return true;
          }
          // For regular lectures, duration must be provided and at least 1
          return v && v >= 1;
        },
        message: 'Duration must be at least 1 minute for lectures'
      }
    },

    lectureUrl: {
      type: String,
      required: function() {
        // URL is NOT required for assignments or projects
        return !this.isAssignment && !this.isProject;
      },
    },

    videoId: {
      type: String,
      required: false,
    },

    isPreviewFree: {
      type: Boolean,
      default: false,
    },

    isAssignment: {
      type: Boolean,
      default: false,
    },

    assignmentDescription: {
      type: String,
      required: false,
    },

    isProject: {
      type: Boolean,
      default: false,
    },

    projectDescription: {
      type: String,
      required: false,
    },

    lectureOrder: {
      type: Number,
      required: true,
      min: 1,
    },
  },
  { _id: false }
);

const chapterSchema = new mongoose.Schema(
  {
    chapterId: {
      type: String,
      required: true,
    },

    chapterOrder: {
      type: Number,
      required: true,
      min: 1,
    },

    chapterTitle: {
      type: String,
      required: true,
      trim: true,
    },

    chapterContent: {
      type: [lectureSchema],
      required: true,
      default: [],
    },
  },
  { _id: false }
);

const courseSchema = new mongoose.Schema(
  {
    courseTitle: {
      type: String,
      required: true,
      trim: true,
    },

    courseDescription: {
      type: String,
      required: true,
      trim: true,
    },

    courseThumbnail: {
      type: String,
      default: null,
    },

    coursePrice: {
      type: Number,
      required: true,
      min: 0,
    },

    discount: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    isPublished: {
      type: Boolean,
      default: false,
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },

    courseContent: {
      type: [chapterSchema],
      default: [],
    },

    courseRatings: [
      {
        userId: {
          type: String,
          required: true,
        },
        rating: {
          type: Number,
          required: true,
          min: 1,
          max: 5,
        },
      },
    ],

    averageRating: {
      type: Number,
      default: 0,
    },

    ratingCount: {
      type: Number,
      default: 0,
    },

    educator: {
      type: String,
      ref: "User",
      required: true,
    },

    enrolledStudents: [
      {
        type: String,
        ref: "User",
      },
    ],
  },
  {
    timestamps: true,
    minimize: false,
  }
);

courseSchema.index({ courseTitle: "text" });
courseSchema.index({ educator: 1 });
courseSchema.index({ isPublished: 1, isDeleted: 1 });

const Course = mongoose.model("Course", courseSchema);
export default Course;
