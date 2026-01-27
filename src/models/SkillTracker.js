import mongoose from 'mongoose';

const skillTrackerSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  careerGoal: {
    type: String,
    required: true,
    enum: ['frontend', 'backend', 'fullstack', 'dataanalyst', 'datascientist', 'cybersecurity', 'custom']
  },
  careerGoalLabel: {
    type: String,
    required: true
  },
  currentSkillLevel: {
    type: String,
    required: true,
    enum: ['beginner', 'intermediate', 'advanced']
  },
  learningIntensity: {
    type: String,
    enum: ['3-5', '6-10', '10+']
  },
  goalTimeline: {
    type: String,
    enum: ['1-2', '3-4', 'no-deadline']
  },
  existingKnowledge: [{
    type: String
  }],
  roadmap: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  overallProgress: {
    type: Number,
    default: 0
  },
  completedSkills: [{
    skillName: String,
    completedAt: Date,
    source: {
      type: String,
      enum: ['skillion', 'other'],
      required: true
    },
    sourceDescription: String,
    proofImageUrl: String,
    verifiedBadgeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Badge'
    }
  }],
  isCompleted: {
    type: Boolean,
    default: false
  },
  completedAt: Date,
  cardGenerated: {
    type: Boolean,
    default: false
  },
  verificationId: String
}, {
  timestamps: true
});

// Method to initialize roadmap based on career goal
skillTrackerSchema.methods.initializeRoadmap = function() {
  const roadmaps = {
    frontend: [
      { name: 'HTML', description: 'HyperText Markup Language', status: 'unlocked', progress: 0 },
      { name: 'CSS', description: 'Cascading Style Sheets', status: 'unlocked', progress: 0 },
      { name: 'JavaScript', description: 'Programming Language', status: 'unlocked', progress: 0 },
      { name: 'React', description: 'JavaScript Library', status: 'unlocked', progress: 0 },
      { name: 'TypeScript', description: 'Typed JavaScript', status: 'unlocked', progress: 0 },
      { name: 'Tailwind CSS', description: 'Utility-First CSS Framework', status: 'unlocked', progress: 0 }
    ],
    backend: [
      { name: 'JavaScript', description: 'Programming Language', status: 'unlocked', progress: 0 },
      { name: 'Node.js', description: 'JavaScript Runtime', status: 'unlocked', progress: 0 },
      { name: 'Express.js', description: 'Backend Framework', status: 'unlocked', progress: 0 },
      { name: 'MongoDB', description: 'NoSQL Database', status: 'unlocked', progress: 0 },
      { name: 'PostgreSQL', description: 'SQL Database', status: 'unlocked', progress: 0 },
      { name: 'Redis', description: 'In-Memory Database', status: 'unlocked', progress: 0 }
    ],
    fullstack: [
      { name: 'HTML', description: 'Markup Language', status: 'unlocked', progress: 0 },
      { name: 'CSS', description: 'Styling Language', status: 'unlocked', progress: 0 },
      { name: 'JavaScript', description: 'Programming Language', status: 'unlocked', progress: 0 },
      { name: 'React', description: 'Frontend Library', status: 'unlocked', progress: 0 },
      { name: 'Node.js', description: 'Backend Runtime', status: 'unlocked', progress: 0 },
      { name: 'MongoDB', description: 'Database', status: 'unlocked', progress: 0 }
    ],
    dataanalyst: [
      { name: 'Python', description: 'Programming Language', status: 'unlocked', progress: 0 },
      { name: 'SQL', description: 'Query Language', status: 'unlocked', progress: 0 },
      { name: 'Pandas', description: 'Data Analysis Library', status: 'unlocked', progress: 0 },
      { name: 'NumPy', description: 'Numerical Computing', status: 'unlocked', progress: 0 },
      { name: 'Matplotlib', description: 'Visualization Library', status: 'unlocked', progress: 0 },
      { name: 'Power BI', description: 'Business Intelligence', status: 'unlocked', progress: 0 }
    ],
    datascientist: [
      { name: 'Python', description: 'Programming Language', status: 'unlocked', progress: 0 },
      { name: 'TensorFlow', description: 'ML Framework', status: 'unlocked', progress: 0 },
      { name: 'PyTorch', description: 'Deep Learning Framework', status: 'unlocked', progress: 0 },
      { name: 'Scikit-learn', description: 'Machine Learning Library', status: 'unlocked', progress: 0 },
      { name: 'Keras', description: 'Neural Network API', status: 'unlocked', progress: 0 },
      { name: 'Jupyter', description: 'Interactive Computing', status: 'unlocked', progress: 0 }
    ],
    cybersecurity: [
      { name: 'Linux', description: 'Operating System', status: 'unlocked', progress: 0 },
      { name: 'Python', description: 'Scripting Language', status: 'unlocked', progress: 0 },
      { name: 'Wireshark', description: 'Network Analyzer', status: 'unlocked', progress: 0 },
      { name: 'Kali Linux', description: 'Security Platform', status: 'unlocked', progress: 0 },
      { name: 'Metasploit', description: 'Penetration Testing', status: 'unlocked', progress: 0 },
      { name: 'Burp Suite', description: 'Web Security Testing', status: 'unlocked', progress: 0 }
    ],
    custom: []
  };

  this.roadmap = roadmaps[this.careerGoal] || [];
  
  // All skills start unlocked - no sequential locking
};

// Method to update progress
skillTrackerSchema.methods.updateProgress = function(skillName, progress) {
  const skill = this.roadmap.find(s => s.name === skillName);
  if (skill) {
    skill.progress = progress;
    if (progress === 100) {
      skill.status = 'completed';
      // Note: completedSkills entry will be added when user provides proof
      
      // Unlock next skill
      const currentIndex = this.roadmap.findIndex(s => s.name === skillName);
      if (currentIndex < this.roadmap.length - 1) {
        this.roadmap[currentIndex + 1].status = 'unlocked';
      }
    }
    
    // Calculate overall progress
    const completedCount = this.roadmap.filter(s => s.status === 'completed').length;
    this.overallProgress = Math.round((completedCount / this.roadmap.length) * 100);
    
    // Check if fully completed
    if (this.overallProgress === 100) {
      this.isCompleted = true;
      this.completedAt = new Date();
      this.verificationId = `SKL-${this.careerGoal.toUpperCase()}-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
    }
  }
};

// Method to mark skill as complete with proof
skillTrackerSchema.methods.markSkillComplete = async function(skillName, source, sourceDescription, proofImageUrl, badgeId) {
  const skill = this.roadmap.find(s => s.name === skillName);
  if (!skill) {
    throw new Error('Skill not found');
  }
  
  if (skill.status === 'completed') {
    throw new Error('Skill already completed');
  }
  
  // Mark as complete
  skill.status = 'completed';
  skill.progress = 100;
  
  // Add to completed skills with proof
  const existingCompletion = this.completedSkills.find(cs => cs.skillName === skillName);
  if (!existingCompletion) {
    this.completedSkills.push({
      skillName: skillName,
      completedAt: new Date(),
      source: source,
      sourceDescription: sourceDescription || '',
      proofImageUrl: proofImageUrl || '',
      verifiedBadgeId: badgeId || null
    });
  }
  
  // Unlock next skill
  const currentIndex = this.roadmap.findIndex(s => s.name === skillName);
  if (currentIndex < this.roadmap.length - 1) {
    this.roadmap[currentIndex + 1].status = 'unlocked';
  }
  
  // Calculate overall progress
  const completedCount = this.roadmap.filter(s => s.status === 'completed').length;
  this.overallProgress = Math.round((completedCount / this.roadmap.length) * 100);
  
  // Check if fully completed
  if (this.overallProgress === 100) {
    this.isCompleted = true;
    this.completedAt = new Date();
    this.verificationId = `SKL-${this.careerGoal.toUpperCase()}-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
  }
  
  await this.save();
  return this;
};

// Method to auto-complete skill when badge is earned from Skillion course
skillTrackerSchema.methods.autoCompleteSkill = async function(badgeName, badgeId) {
  console.log(`[Skill Tracker] Attempting to auto-complete skill for badge: "${badgeName}"`);
  console.log(`[Skill Tracker] Available skills in roadmap:`, this.roadmap.map(s => s.name));
  
  // Find matching skill in roadmap with more flexible matching
  const skillIndex = this.roadmap.findIndex(skill => {
    const skillLower = skill.name.toLowerCase().replace(/\s+/g, '');
    const badgeLower = badgeName.toLowerCase().replace(/\s+/g, '').replace(/-/g, '');
    
    // Extract key technology names from badge
    const techKeywords = ['html', 'css', 'javascript', 'react', 'node', 'express', 'mongodb', 'typescript', 'tailwind', 'python', 'java'];
    
    // Check direct matches
    for (const tech of techKeywords) {
      if (badgeLower.includes(tech) && skillLower.includes(tech)) {
        console.log(`[Skill Tracker] Matched skill "${skill.name}" with badge "${badgeName}" via keyword: ${tech}`);
        return true;
      }
    }
    
    // Check if badge contains skill name or vice versa
    const match = badgeLower.includes(skillLower) || skillLower.includes(badgeLower);
    
    if (match) {
      console.log(`[Skill Tracker] Matched skill "${skill.name}" with badge "${badgeName}"`);
    }
    return match;
  });

  if (skillIndex === -1) {
    console.log(`[Skill Tracker] No matching skill found for badge: "${badgeName}"`);
    return false;
  }

  const skill = this.roadmap[skillIndex];
  
  // Check if already completed
  if (skill.status === 'completed') {
    console.log(`[Skill Tracker] Skill "${skill.name}" already completed, skipping`);
    return false;
  }
  
  console.log(`[Skill Tracker] Marking skill "${skill.name}" as completed`);
  
  // Mark skill as completed
  skill.status = 'completed';
  skill.progress = 100;

  // Add to completedSkills (avoid duplicates)
  const alreadyInCompleted = this.completedSkills.find(cs => cs.skillName === skill.name);
  if (!alreadyInCompleted) {
    this.completedSkills.push({
      skillName: skill.name,
      completedAt: new Date(),
      source: 'skillion',
      sourceDescription: `Completed via Skillion course: ${badgeName}`,
      verifiedBadgeId: badgeId
    });
  }

  // All skills are unlocked, no need to unlock next

  // Calculate overall progress
  const completedCount = this.roadmap.filter(s => s.status === 'completed').length;
  this.overallProgress = Math.round((completedCount / this.roadmap.length) * 100);
  console.log(`[Skill Tracker] Overall progress: ${this.overallProgress}% (${completedCount}/${this.roadmap.length})`);

  // Check if fully completed
  if (this.overallProgress === 100) {
    this.isCompleted = true;
    this.completedAt = new Date();
    this.cardGenerated = false; // Will be set to true when card is generated
    this.verificationId = `SKL-${this.careerGoal.toUpperCase()}-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
    console.log(`[Skill Tracker] All skills completed! Verification ID: ${this.verificationId}`);
  }

  await this.save();
  return true;
};

export default mongoose.model('SkillTracker', skillTrackerSchema);
