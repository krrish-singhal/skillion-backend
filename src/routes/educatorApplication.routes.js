import express from 'express';
import { ClerkExpressRequireAuth } from '@clerk/clerk-sdk-node';
import {
  submitApplication,
  getAllApplications,
  getApplicationById,
  updateApplicationStatus,
  getMyApplication,
  verifyPasscode
} from '../controllers/educatorApplicationController.js';

const router = express.Router();

// Public routes (with auth)
router.post('/apply', ClerkExpressRequireAuth(), submitApplication);
router.get('/my-application', ClerkExpressRequireAuth(), getMyApplication);

// Admin routes (require passcode in request body)
router.post('/verify-passcode', verifyPasscode);
router.post('/applications', getAllApplications);
router.post('/applications/:id', getApplicationById);
router.put('/applications/:id/status', updateApplicationStatus);

export default router;
