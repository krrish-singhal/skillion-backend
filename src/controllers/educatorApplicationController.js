import EducatorApplication from '../models/EducatorApplication.js';
import User from '../models/User.js';
import { sendAdminNotificationEmail, sendApprovalEmail, sendRejectionEmail, sendPendingEmail } from '../config/nodemailer.js';
import { clerkClient } from '@clerk/express';

// Submit educator application
export const submitApplication = async (req, res) => {
  try {
    const userId = req.auth.userId;
    const {
      fullName,
      email,
      professionalEmail,
      domains,
      customDomain,
      skills,
      experienceLevel,
      proofLinks,
      motivation,
      targetAudience,
      availability,
      commitmentAccepted
    } = req.body;

    // Validate required fields
    if (!fullName || !email || !professionalEmail || !domains || domains.length === 0 || !skills || skills.length === 0 || 
        !experienceLevel || !motivation || !targetAudience || !commitmentAccepted) {
      return res.status(400).json({
        success: false,
        message: 'All required fields must be filled'
      });
    }

    // Check if at least one proof link is provided
    if (!proofLinks.github && !proofLinks.portfolio && !proofLinks.linkedin) {
      return res.status(400).json({
        success: false,
        message: 'At least one proof of expertise link is required'
      });
    }

    // Check for existing pending or approved application
    const existingApplication = await EducatorApplication.findOne({
      userId,
      status: { $in: ['pending', 'approved'] }
    });

    if (existingApplication) {
      return res.status(400).json({
        success: false,
        message: existingApplication.status === 'approved' 
          ? 'You are already an approved educator' 
          : 'You already have a pending application'
      });
    }

    // Create new application
    const application = new EducatorApplication({
      userId,
      fullName,
      email,
      professionalEmail,
      domains,
      customDomain,
      skills,
      experienceLevel,
      proofLinks,
      motivation,
      targetAudience,
      availability,
      commitmentAccepted
    });

    await application.save();

    // Send email notification to admin FROM applicant's professional email
    try {
      await sendAdminNotificationEmail({
        fullName,
        email,
        professionalEmail,
        domains: customDomain ? [...domains, customDomain] : domains,
        skills,
        experienceLevel,
        proofLinks,
        motivation,
        targetAudience,
        availability
      });
    } catch (emailError) {
      console.error('Failed to send admin notification email:', emailError);
      // Don't fail the request if email fails
    }

    res.status(201).json({
      success: true,
      message: 'Your application has been submitted successfully and is under review',
      data: application
    });
  } catch (error) {
    console.error('Error submitting educator application:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit application',
      error: error.message
    });
  }
};

// Get all applications (Admin only - with passcode verification)
export const getAllApplications = async (req, res) => {
  try {
    const { passcode } = req.body;

    // Verify admin passcode
    if (passcode !== '1234') {
      return res.status(403).json({
        success: false,
        message: 'Invalid admin passcode'
      });
    }

    const applications = await EducatorApplication.find()
      .sort({ appliedAt: -1 });

    res.status(200).json({
      success: true,
      data: applications
    });
  } catch (error) {
    console.error('Error fetching applications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch applications',
      error: error.message
    });
  }
};

// Get single application by ID
export const getApplicationById = async (req, res) => {
  try {
    const { id } = req.params;
    const { passcode } = req.body;

    // Verify admin passcode
    if (passcode !== '1234') {
      return res.status(403).json({
        success: false,
        message: 'Invalid admin passcode'
      });
    }

    const application = await EducatorApplication.findById(id);

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    res.status(200).json({
      success: true,
      data: application
    });
  } catch (error) {
    console.error('Error fetching application:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch application',
      error: error.message
    });
  }
};

// Update application status (Admin only)
export const updateApplicationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, passcode, adminNotes } = req.body;

    // Verify admin passcode
    if (passcode !== '1234') {
      return res.status(403).json({
        success: false,
        message: 'Invalid admin passcode'
      });
    }

    // Validate status
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be pending, approved, or rejected'
      });
    }

    const application = await EducatorApplication.findById(id);

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    // Update application status
    application.status = status;
    application.reviewedAt = new Date();
    if (adminNotes) {
      application.adminNotes = adminNotes;
    }
    await application.save();

    // If approved, update user role to educator
    if (status === 'approved') {
      // Update MongoDB User model
      await User.findOneAndUpdate(
        { _id: application.userId },
        { role: 'educator' },
        { upsert: false }
      );

      // CRITICAL: Update Clerk's publicMetadata to grant educator access
      try {
        await clerkClient.users.updateUserMetadata(application.userId, {
          publicMetadata: {
            role: 'educator'
          }
        });
        console.log(`Successfully updated role to educator for user: ${application.userId}`);
      } catch (clerkError) {
        console.error('Failed to update Clerk metadata:', clerkError);
        // Continue with the process even if Clerk update fails
      }

      // Send approval email
      try {
        await sendApprovalEmail(application.email, application.fullName);
      } catch (emailError) {
        console.error('Failed to send approval email:', emailError);
      }
    }

    // If rejected, send rejection email
    if (status === 'rejected') {
      try {
        await sendRejectionEmail(application.email, application.fullName);
      } catch (emailError) {
        console.error('Failed to send rejection email:', emailError);
      }
    }

    // If pending, send pending email
    if (status === 'pending') {
      try {
        await sendPendingEmail(application.email, application.fullName);
      } catch (emailError) {
        console.error('Failed to send pending email:', emailError);
      }
    }

    res.status(200).json({
      success: true,
      message: `Application ${status} successfully`,
      data: application
    });
  } catch (error) {
    console.error('Error updating application status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update application status',
      error: error.message
    });
  }
};

// Get user's own application
export const getMyApplication = async (req, res) => {
  try {
    const userId = req.auth.userId;

    const application = await EducatorApplication.findOne({ userId })
      .sort({ appliedAt: -1 });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'No application found'
      });
    }

    res.status(200).json({
      success: true,
      data: application
    });
  } catch (error) {
    console.error('Error fetching user application:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch application',
      error: error.message
    });
  }
};

// Verify admin passcode
export const verifyPasscode = async (req, res) => {
  try {
    const { passcode } = req.body;

    if (passcode !== '1234') {
      return res.status(403).json({
        success: false,
        message: 'Invalid passcode'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Passcode verified'
    });
  } catch (error) {
    console.error('Error verifying passcode:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify passcode'
    });
  }
};
