import Stripe from "stripe";
import mongoose from "mongoose";
import { Purchase } from "../models/Purchase.js";
import User from "../models/User.js";
import Course from "../models/Course.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const stripeWebhookHandler = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;
  
  console.log("Stripe webhook received");
  
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET || process.env.STRIPE_SECRET_KEY,
    );
    console.log("Webhook verified successfully, event type:", event.type);
  } catch (error) {
    console.error("Webhook signature verification failed:", error.message);
    return res.status(400).send(`Webhook Error ${error.message}`);
  }

  if (event.type !== "checkout.session.completed") {
    console.log("Ignoring event type:", event.type);
    return res.status(200).json({
      recieved: true,
    });
  }

  const session = event.data.object;
  const { courseId, userId } = session.metadata;
  
  console.log("Processing checkout.session.completed for:", { courseId, userId, sessionId: session.id });

  const dbSession = mongoose.startSession();
  (await dbSession).startTransaction();

  try {
    const purchase = await Purchase.findOne(
      {
        paymentIntentId: session.id,
      },
      null,
      { session: dbSession },
    );

    console.log("Purchase found:", purchase ? { id: purchase._id, status: purchase.status } : "null");

    if (!purchase) {
      console.error("No purchase found with paymentIntentId:", session.id);
      (await dbSession).abortTransaction();
      (await dbSession).endSession();
      return res.status(200).json({
        recieved: true,
        message: "Purchase not found"
      });
    }
    
    if (purchase.status === "completed") {
      console.log("Purchase already completed, skipping");
      (await dbSession).abortTransaction();
      (await dbSession).endSession();
      return res.status(200).json({
        recieved: true,
        message: "Already processed"
      });
    }
    
    console.log("Updating purchase status to completed");
    await Purchase.updateOne(
      { _id: purchase._id },
      { status: "completed" },
      { session: dbSession },
    );

    console.log("Adding course to user's enrolledCourses");
    await User.updateOne(
      { _id: userId, enrolledCourses: { $ne: courseId } },
      { $push: { enrolledCourses: courseId } },
      { session: dbSession },
    );
    
    console.log("Adding user to course's enrolledStudents");
    await Course.updateOne(
      { _id: courseId, enrolledStudents: { $ne: userId } },
      { $push: { enrolledStudents: userId } },
      { session: dbSession },
    );

    (await dbSession).commitTransaction();
    (await dbSession).endSession();
    
    console.log("Transaction committed successfully");
    
    res.status(200).json({
      recieved: true,
      message: "Enrollment successful"
    });
  } catch (error) {
    console.error("Webhook processing error:", error);
    (await dbSession).abortTransaction();
    (await dbSession).endSession();
    res.status(500).json({ error: "Webhook processing failed" });
  }
};
