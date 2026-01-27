import express from 'express';
import {
  checkEnrollment,
  createSkillTracker,
  getSkillTracker,
  updateSkillProgress,
  getUserBadges,
  getDashboardStats,
  getKnowledgeOptions,
  markSkillComplete,
  uploadProofImage,
  syncExistingBadges,
  generateMissingBadges,
  forceCreateBadgeForCourse,
  refreshTracker,
  updateBadgeLogos
} from '../controllers/skillTrackerController.js';
import { requireAuth } from '@clerk/express';
import upload from '../config/multer.js';
import SkillTracker from '../models/SkillTracker.js';

const router = express.Router();

// Apply authentication to all routes
router.use(requireAuth());

// Delete tracker (for resetting)
router.delete('/reset', async (req, res) => {
  try {
    const userId = req.auth.userId;
    await SkillTracker.findOneAndDelete({ userId });
    res.status(200).json({
      success: true,
      message: 'Tracker deleted successfully. Please create a new one.'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete tracker'
    });
  }
});

// Check if user has enrollment
router.get('/check-enrollment', checkEnrollment);

// Get knowledge options based on career goal
router.get('/knowledge-options', getKnowledgeOptions);

// Create or update skill tracker
router.post('/create', createSkillTracker);

// Get user's skill tracker
router.get('/tracker', getSkillTracker);

// Update skill progress
router.put('/progress', updateSkillProgress);

// Mark skill as complete with proof
router.post('/mark-complete', markSkillComplete);

// Upload proof image
router.post('/upload-proof', upload.single('proofImage'), uploadProofImage);

// Get user's badges
router.get('/badges', getUserBadges);

// Get dashboard stats
router.get('/dashboard-stats', getDashboardStats);

// Sync existing badges with skills
router.post('/sync-badges', syncExistingBadges);

// Generate missing badges for completed courses
router.post('/generate-missing-badges', generateMissingBadges);

// Force create badge for all enrolled courses (manual fix)
router.post('/force-create-badges', forceCreateBadgeForCourse);

// Refresh tracker (unlock all + sync badges)
router.post('/refresh-tracker', refreshTracker);

// Update existing badges with official logos
router.post('/update-badge-logos', updateBadgeLogos);

export default router;
