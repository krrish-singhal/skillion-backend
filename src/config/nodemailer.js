import nodemailer from 'nodemailer';

// Create reusable transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'your-email@gmail.com',
    pass: process.env.EMAIL_PASSWORD || 'your-app-password'
  }
});

// Email to admin when new educator application is submitted
export const sendAdminNotificationEmail = async (applicationData) => {
  const { fullName, email, professionalEmail, domains, skills, experienceLevel, proofLinks, motivation, targetAudience, availability } = applicationData;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 30px;
          border-radius: 10px 10px 0 0;
          text-align: center;
        }
        .content {
          background: #f8f9fa;
          padding: 30px;
          border-radius: 0 0 10px 10px;
        }
        .section {
          background: white;
          padding: 20px;
          margin-bottom: 20px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .section h3 {
          color: #667eea;
          margin-top: 0;
          border-bottom: 2px solid #667eea;
          padding-bottom: 10px;
        }
        .info-row {
          padding: 8px 0;
          border-bottom: 1px solid #eee;
        }
        .info-row:last-child {
          border-bottom: none;
        }
        .label {
          font-weight: bold;
          color: #555;
          display: inline-block;
          width: 150px;
        }
        .value {
          color: #333;
        }
        .badge {
          display: inline-block;
          padding: 4px 12px;
          margin: 4px;
          background: #667eea;
          color: white;
          border-radius: 20px;
          font-size: 14px;
        }
        .link {
          color: #667eea;
          text-decoration: none;
        }
        .footer {
          text-align: center;
          margin-top: 30px;
          color: #888;
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🎓 New Educator Application</h1>
        <p>A new user has applied to become an educator on Skillion</p>
      </div>
      
      <div class="content">
        <div class="section">
          <h3>👤 Personal Information</h3>
          <div class="info-row">
            <span class="label">Full Name:</span>
            <span class="value">${fullName}</span>
          </div>
          <div class="info-row">
            <span class="label">Personal Email:</span>
            <span class="value">${email}</span>
          </div>
          <div class="info-row">
            <span class="label">Professional Email:</span>
            <span class="value">${professionalEmail}</span>
          </div>
          <div class="info-row">
            <span class="label">Experience Level:</span>
            <span class="value">${experienceLevel}</span>
          </div>
        </div>

        <div class="section">
          <h3>📚 Teaching Domains</h3>
          ${domains.map(domain => `<span class="badge">${domain}</span>`).join('')}
        </div>

        <div class="section">
          <h3>💡 Skills</h3>
          ${skills.map(skill => `<span class="badge">${skill}</span>`).join('')}
        </div>

        <div class="section">
          <h3>🔗 Proof of Expertise</h3>
          ${proofLinks.github ? `<div class="info-row"><span class="label">GitHub:</span> <a class="link" href="${proofLinks.github}" target="_blank">${proofLinks.github}</a></div>` : ''}
          ${proofLinks.portfolio ? `<div class="info-row"><span class="label">Portfolio:</span> <a class="link" href="${proofLinks.portfolio}" target="_blank">${proofLinks.portfolio}</a></div>` : ''}
          ${proofLinks.linkedin ? `<div class="info-row"><span class="label">LinkedIn:</span> <a class="link" href="${proofLinks.linkedin}" target="_blank">${proofLinks.linkedin}</a></div>` : ''}
        </div>

        <div class="section">
          <h3>✍️ Motivation</h3>
          <p>${motivation}</p>
        </div>

        <div class="section">
          <h3>🎯 Target Audience</h3>
          <p>${targetAudience}</p>
        </div>

        <div class="section">
          <h3>📅 Availability</h3>
          <div class="info-row">
            <span class="value">${availability}</span>
          </div>
        </div>

        <div class="footer">
          <p>Please review this application in the Skillion Admin Panel</p>
          <p>© 2026 Skillion Learning Platform</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const mailOptions = {
    from: `"${fullName}" <${professionalEmail}>`,
    to: process.env.ADMIN_EMAIL || 'krrishsinghal42@gmail.com',
    replyTo: professionalEmail,
    subject: `New Educator Application from ${fullName}`,
    html: htmlContent
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Admin notification email sent successfully');
  } catch (error) {
    console.error('Error sending admin notification email:', error);
    throw error;
  }
};

// Email to user when application is approved
export const sendApprovalEmail = async (userEmail, userName) => {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          padding: 40px;
          border-radius: 10px 10px 0 0;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 32px;
        }
        .content {
          background: #f8f9fa;
          padding: 40px;
          border-radius: 0 0 10px 10px;
        }
        .success-icon {
          font-size: 80px;
          text-align: center;
          margin: 20px 0;
        }
        .message {
          background: white;
          padding: 30px;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          margin-bottom: 20px;
        }
        .message p {
          margin: 15px 0;
          font-size: 16px;
        }
        .cta-button {
          display: inline-block;
          padding: 15px 40px;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          text-decoration: none;
          border-radius: 30px;
          font-weight: bold;
          margin: 20px 0;
          text-align: center;
        }
        .benefits {
          background: white;
          padding: 20px;
          border-radius: 8px;
          margin-top: 20px;
        }
        .benefits h3 {
          color: #10b981;
          margin-top: 0;
        }
        .benefits ul {
          list-style-type: none;
          padding: 0;
        }
        .benefits li {
          padding: 10px 0;
          padding-left: 30px;
          position: relative;
        }
        .benefits li:before {
          content: "✓";
          position: absolute;
          left: 0;
          color: #10b981;
          font-weight: bold;
          font-size: 20px;
        }
        .footer {
          text-align: center;
          margin-top: 30px;
          color: #888;
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🎉 Congratulations!</h1>
      </div>
      
      <div class="content">
        <div class="success-icon">✅</div>
        
        <div class="message">
          <h2 style="color: #10b981; text-align: center;">Welcome to Skillion Educators!</h2>
          <p>Dear ${userName},</p>
          <p>We are thrilled to inform you that your application to become a Skillion Educator has been <strong>approved</strong>!</p>
          <p>You are now officially part of the Skillion teaching community. Your passion for education and expertise in your field will help shape the future of countless learners.</p>
          
          <div style="text-align: center;">
            <a href="${process.env.FRONTEND_URL}/educator/dashboard" class="cta-button">Go to Educator Dashboard</a>
          </div>
        </div>

        <div class="benefits">
          <h3>What's Next?</h3>
          <ul>
            <li>Access your Educator Dashboard to create your first course</li>
            <li>Set up your instructor profile and showcase your expertise</li>
            <li>Start building engaging course content with videos, assignments, and projects</li>
            <li>Reach thousands of students eager to learn from you</li>
            <li>Earn revenue from your courses</li>
          </ul>
        </div>

        <div class="message">
          <p><strong>Need Help Getting Started?</strong></p>
          <p>Check out our Educator Guide or contact our support team at <a href="mailto:support@skillion.com">support@skillion.com</a></p>
        </div>

        <div class="footer">
          <p>Welcome aboard! We can't wait to see what you'll create.</p>
          <p>© 2026 Skillion Learning Platform</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const mailOptions = {
    from: `"Skillion Admin" <${process.env.EMAIL_USER || 'krrishsinghal42@gmail.com'}>`,
    to: userEmail,
    subject: '🎉 Your Skillion Educator Application Has Been Approved!',
    html: htmlContent
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Approval email sent successfully to:', userEmail);
  } catch (error) {
    console.error('Error sending approval email:', error);
    throw error;
  }
};

// Email to user when application is rejected
export const sendRejectionEmail = async (userEmail, userName) => {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          color: white;
          padding: 40px;
          border-radius: 10px 10px 0 0;
          text-align: center;
        }
        .content {
          background: #f8f9fa;
          padding: 40px;
          border-radius: 0 0 10px 10px;
        }
        .message {
          background: white;
          padding: 30px;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          margin-bottom: 20px;
        }
        .message p {
          margin: 15px 0;
          font-size: 16px;
        }
        .suggestions {
          background: white;
          padding: 20px;
          border-radius: 8px;
          margin-top: 20px;
        }
        .suggestions h3 {
          color: #ef4444;
          margin-top: 0;
        }
        .suggestions ul {
          list-style-type: none;
          padding: 0;
        }
        .suggestions li {
          padding: 10px 0;
          padding-left: 30px;
          position: relative;
        }
        .suggestions li:before {
          content: "→";
          position: absolute;
          left: 0;
          color: #ef4444;
          font-weight: bold;
        }
        .footer {
          text-align: center;
          margin-top: 30px;
          color: #888;
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Application Update</h1>
      </div>
      
      <div class="content">
        <div class="message">
          <h2 style="color: #ef4444;">Application Status</h2>
          <p>Dear ${userName},</p>
          <p>Thank you for your interest in becoming a Skillion Educator. After careful review of your application, we regret to inform you that we are unable to approve your educator application at this time.</p>
          <p>This decision doesn't reflect on your abilities or potential as an educator. We receive many applications and have specific criteria for our current needs.</p>
        </div>

        <div class="suggestions">
          <h3>What You Can Do:</h3>
          <ul>
            <li>Continue building your portfolio and gaining more experience</li>
            <li>Contribute to open-source projects to showcase your skills</li>
            <li>Take advanced courses on Skillion to expand your expertise</li>
            <li>Reapply in the future when you've gained more experience</li>
            <li>Connect with us on LinkedIn to stay updated on opportunities</li>
          </ul>
        </div>

        <div class="message">
          <p>We encourage you to continue learning and growing. Feel free to reapply in the future when you feel ready!</p>
          <p>If you have any questions, please reach out to us at <a href="mailto:support@skillion.com">support@skillion.com</a></p>
        </div>

        <div class="footer">
          <p>Thank you for your interest in Skillion.</p>
          <p>© 2026 Skillion Learning Platform</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const mailOptions = {
    from: `"Skillion Admin" <${process.env.EMAIL_USER || 'krrishsinghal42@gmail.com'}>`,
    to: userEmail,
    subject: 'Skillion Educator Application Update',
    html: htmlContent
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Rejection email sent successfully to:', userEmail);
  } catch (error) {
    console.error('Error sending rejection email:', error);
    throw error;
  }
};

// Email to user when application is set to pending (future consideration)
export const sendPendingEmail = async (userEmail, userName) => {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          color: white;
          padding: 40px;
          border-radius: 10px 10px 0 0;
          text-align: center;
        }
        .content {
          background: #f8f9fa;
          padding: 40px;
          border-radius: 0 0 10px 10px;
        }
        .message {
          background: white;
          padding: 30px;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          margin-bottom: 20px;
        }
        .message p {
          margin: 15px 0;
          font-size: 16px;
        }
        .info-box {
          background: #fef3c7;
          border-left: 4px solid #f59e0b;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
        }
        .footer {
          text-align: center;
          margin-top: 30px;
          color: #888;
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>⏳ Application Under Review</h1>
      </div>
      
      <div class="content">
        <div class="message">
          <h2 style="color: #f59e0b;">Application Status: Pending</h2>
          <p>Dear ${userName},</p>
          <p>Thank you for your application to become a Skillion Educator. We have reviewed your submission and appreciate your interest in joining our teaching community.</p>
          
          <div class="info-box">
            <strong>⏰ What This Means:</strong>
            <p style="margin: 10px 0 0 0;">Your application shows promise, but we don't have an immediate fit at this time. Your profile doesn't fully align with our current curriculum needs, but we'd like to keep your application on file for future opportunities.</p>
          </div>

          <p>We'll reach out to you if a suitable position opens up that matches your expertise. In the meantime, we encourage you to:</p>
          <ul>
            <li>Continue developing your skills</li>
            <li>Build more projects to showcase</li>
            <li>Stay engaged with the Skillion community</li>
          </ul>
        </div>

        <div class="message">
          <p>We truly value your interest and hope to potentially work together in the future.</p>
          <p>If you have any questions, feel free to contact us at <a href="mailto:support@skillion.com">support@skillion.com</a></p>
        </div>

        <div class="footer">
          <p>Thank you for your patience and understanding.</p>
          <p>© 2026 Skillion Learning Platform</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const mailOptions = {
    from: `"Skillion Admin" <${process.env.EMAIL_USER || 'krrishsinghal42@gmail.com'}>`,
    to: userEmail,
    subject: '⏳ Your Skillion Educator Application - Under Review',
    html: htmlContent
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Pending email sent successfully to:', userEmail);
  } catch (error) {
    console.error('Error sending pending email:', error);
    throw error;
  }
};

export default transporter;
