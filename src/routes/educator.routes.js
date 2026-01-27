import express from 'express';
import {updateRoleToEducator, addCourse, getCourseData, educatorDashboardData, getEnrolledStudentsData, deleteCourse, getCourseById, updateCourse, togglePublishStatus} from  '../controllers/educatorController.js'
import { requireAuth } from '@clerk/express';
import upload from '../config/multer.js';
import { protectEducator } from '../middlewares/authMiddleware.js';

const educatorRouter =express.Router();

educatorRouter.post("/update-role", requireAuth(), updateRoleToEducator);
educatorRouter.post("/add-course", requireAuth(), upload.single('image'), protectEducator, addCourse);
educatorRouter.get("/courses",requireAuth(),protectEducator,getCourseData);
educatorRouter.get("/dashboard",requireAuth(),protectEducator,educatorDashboardData);
educatorRouter.get("/enrolled-students",requireAuth(),protectEducator,getEnrolledStudentsData);
educatorRouter.get("/course/:courseId", requireAuth(), protectEducator, getCourseById);
educatorRouter.put("/course/:courseId", requireAuth(), upload.single('image'), protectEducator, updateCourse);
educatorRouter.patch("/course/:courseId/publish", requireAuth(), protectEducator, togglePublishStatus);
educatorRouter.delete("/course/:courseId", requireAuth(), protectEducator, deleteCourse);



export default educatorRouter