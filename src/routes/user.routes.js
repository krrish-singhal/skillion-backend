import express from "express";
import { addUserRating, getUserCourseProgress, getUserData, purchaseCourse, updateUserCourseProgress, userEnrolledCourses, verifyPayment } from "../controllers/userController.js";
import { requireAuth } from "@clerk/express";


const userRouter = express.Router();

userRouter.get('/data', requireAuth(), getUserData);
userRouter.get('/enrolled-courses', requireAuth(), userEnrolledCourses);
userRouter.post('/purchase',requireAuth(),purchaseCourse);
userRouter.post('/verify-payment', requireAuth(), verifyPayment);
userRouter.post("/update-course-progress",requireAuth(),updateUserCourseProgress);
userRouter.get("/course-progress/:courseId",requireAuth(),getUserCourseProgress);
userRouter.post("/add-rating",requireAuth(),addUserRating);






export default userRouter