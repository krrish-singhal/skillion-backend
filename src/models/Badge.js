import mongoose from 'mongoose';

const badgeSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  courseName: {
    type: String,
    required: true
  },
  badgeName: {
    type: String,
    required: true
  },
  badgeIcon: {
    type: String,
    default: '🏆'
  },
  badgeColor: {
    type: String,
    default: '#6366f1'
  },
  verificationId: {
    type: String,
    required: true,
    unique: true
  },
  earnedAt: {
    type: Date,
    default: Date.now
  },
  description: {
    type: String
  }
}, {
  timestamps: true
});

// Static method to generate badge
badgeSchema.statics.generateBadge = async function(userId, courseId, courseName) {
  console.log(`[Badge Generation] Starting for userId: ${userId}, course: "${courseName}"`);
  
  // Check if badge already exists for this specific course
  const existingBadge = await this.findOne({ userId, courseId });
  if (existingBadge) {
    console.log(`[Badge Generation] Badge already exists for this course, returning existing badge`);
    return existingBadge;
  }

  // Generate verification ID
  const verificationId = `SKL-BADGE-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 100000)).padStart(5, '0')}`;
  
  // Define badge colors and icons based on course name
  const badgeConfig = {
    html: { icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/html5/html5-original.svg', color: '#e34c26' },
    css: { icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/css3/css3-original.svg', color: '#264de4' },
    javascript: { icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/javascript/javascript-original.svg', color: '#f0db4f' },
    react: { icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/react/react-original.svg', color: '#61dafb' },
    node: { icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nodejs/nodejs-original.svg', color: '#68a063' },
    python: { icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/python/python-original.svg', color: '#3776ab' },
    java: { icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/java/java-original.svg', color: '#007396' },
    database: { icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/postgresql/postgresql-original.svg', color: '#336791' },
    mongodb: { icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/mongodb/mongodb-original.svg', color: '#47A248' },
    typescript: { icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/typescript/typescript-original.svg', color: '#3178c6' },
    tailwind: { icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/tailwindcss/tailwindcss-original.svg', color: '#06b6d4' },
    express: { icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/express/express-original.svg', color: '#000000' },
    figma: { icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/figma/figma-original.svg', color: '#F24E1E' },
    git: { icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/git/git-original.svg', color: '#f05032' },
    docker: { icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/docker/docker-original.svg', color: '#2496ed' },
    default: { icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/devicon/devicon-original.svg', color: '#6366f1' }
  };

  // Determine badge style based on course name
  let badgeStyle = badgeConfig.default;
  const lowerCourseName = courseName.toLowerCase();
  
  for (const [key, value] of Object.entries(badgeConfig)) {
    if (lowerCourseName.includes(key)) {
      badgeStyle = value;
      break;
    }
  }

  console.log(`[Badge Generation] Creating badge with style:`, { icon: badgeStyle.icon, color: badgeStyle.color });

  const badge = await this.create({
    userId,
    courseId,
    courseName,
    badgeName: `Skillion ${courseName} Badge`,
    badgeIcon: badgeStyle.icon,
    badgeColor: badgeStyle.color,
    verificationId,
    description: `Successfully completed ${courseName} with 100% progress`
  });

  console.log(`[Badge Generation] Badge created successfully:`, { 
    badgeId: badge._id, 
    badgeName: badge.badgeName,
    verificationId: badge.verificationId 
  });

  return badge;
};

export default mongoose.model('Badge', badgeSchema);
