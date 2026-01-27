import mongoose from "mongoose";

const purchaseSchema = new mongoose.Schema(
  {
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
      index: true,
    },

    userId: {
      type: String,
      ref: "User",
      required: true,
      index: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    currency: {
      type: String,
      required: true,
      default: "INR",
    },

    paymentProvider: {
      type: String,
      enum: ["razorpay", "stripe"],
      required: true,
    },

    paymentIntentId: {
      type: String,
      required: true,
      unique: true,
    },

    status: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "pending",
      index: true,
    },

    isRefunded: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    minimize: false,
  }
);

purchaseSchema.index({ userId: 1, createdAt: -1 });
purchaseSchema.index({ courseId: 1, status: 1 });

export const Purchase = mongoose.model("Purchase", purchaseSchema);
