# 🎓 Skillion Backend API Documentation

A comprehensive learning management system (LMS) backend built with Node.js, Express, MongoDB, and integrated with Clerk authentication and Stripe payment processing.

---

## 📋 Table of Contents
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [Database Models](#-database-models)
- [API Endpoints](#-api-endpoints)
- [Authentication & Authorization](#-authentication--authorization)
- [Webhooks](#-webhooks)
- [API Flow Diagrams](#-api-flow-diagrams)
- [Error Handling](#-error-handling)

---

## 🛠 Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js 5.2.1
- **Database:** MongoDB (Mongoose 9.1.4)
- **Authentication:** Clerk Express SDK 1.7.63
- **Payment:** Stripe 20.2.0
- **File Upload:** Multer 2.0.2
- **Cloud Storage:** Cloudinary 2.9.0
- **Webhooks:** Svix 1.42.0

---

## 🚀 Getting Started

### Installation

```bash
# Navigate to Backend directory
cd Backend

# Install dependencies
npm install

# Start development server
npm run dev

# Start production server
npm start
```

### Server Configuration
- **Development:** `http://localhost:5000`
- **Port:** 5000 (configurable via environment variables)

---

## 🔐 Environment Variables

Create a `.env` file in the Backend directory:

```env
# Server Configuration
PORT=5000
FRONTEND_URL=http://localhost:5173

# Database
MONGODB_URI=your_mongodb_connection_string

# Clerk Authentication
CLERK_PUBLISHABLE_KEY=pk_test_xxxxx
CLERK_SECRET_KEY=sk_test_xxxxx
CLERK_WEBHOOK_SECRET=whsec_xxxxx

# Stripe Payment
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
CURRENCY=INR

# Cloudinary (Image Upload)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

---

## 📊 Database Models

### 1. User Model
**Collection:** `users`

```javascript
{
  _id: String,                    // Clerk User ID (Primary Key)
  name: {
    firstName: String,            // Required, Trimmed
    lastName: String              // Optional, Trimmed
  },
  email: String,                  // Required, Unique, Lowercase, Validated
  imageUrl: String,               // Required (from Clerk)
  enrolledCourses: [ObjectId]     // References Course Model
}
```

**Indexes:**
- `email` (unique)

---

### 2. Course Model
**Collection:** `courses`

```javascript
{
  courseTitle: String,            // Required, Trimmed
  courseDescription: String,      // Required, Trimmed
  courseThumbnail: String,        // Cloudinary URL
  coursePrice: Number,            // Required, Min: 0
  discount: Number,               // Default: 0, Min: 0, Max: 100
  isPublished: Boolean,           // Default: false
  isDeleted: Boolean,             // Default: false
  
  courseContent: [                // Array of Chapters
    {
      chapterId: String,          // Required
      chapterOrder: Number,       // Required, Min: 1
      chapterTitle: String,       // Required, Trimmed
      chapterContent: [           // Array of Lectures
        {
          lectureId: String,      // Required
          lectureTitle: String,   // Required, Trimmed
          lectureDuration: Number,// Required, Min: 1 (in minutes)
          lectureUrl: String,     // Required (Video URL)
          isPreviewFree: Boolean, // Default: false
          lectureOrder: Number    // Required, Min: 1
        }
      ]
    }
  ],
  
  courseRatings: [
    {
      userId: String,             // Required (Clerk User ID)
      rating: Number              // Required, Min: 1, Max: 5
    }
  ],
  
  averageRating: Number,          // Default: 0
  ratingCount: Number,            // Default: 0
  
  educator: String,               // Required, References User (Clerk ID)
  enrolledStudents: [String],     // Array of User IDs (Clerk IDs)
  
  createdAt: Date,                // Auto-generated
  updatedAt: Date                 // Auto-generated
}
```

**Indexes:**
- `courseTitle` (text search)
- `educator`
- `isPublished` + `isDeleted` (compound)

---

### 3. Purchase Model
**Collection:** `purchases`

```javascript
{
  courseId: ObjectId,             // Required, References Course, Indexed
  userId: String,                 // Required, References User, Indexed
  amount: Number,                 // Required, Min: 0
  currency: String,               // Required, Default: "INR"
  paymentProvider: String,        // Required, Enum: ["razorpay", "stripe"]
  paymentIntentId: String,        // Required, Unique (Stripe Session ID)
  status: String,                 // Enum: ["pending", "completed", "failed"]
  isRefunded: Boolean,            // Default: false
  
  createdAt: Date,                // Auto-generated
  updatedAt: Date                 // Auto-generated
}
```

**Indexes:**
- `userId` + `createdAt` (compound)
- `courseId` + `status` (compound)
- `paymentIntentId` (unique)

---

### 4. CourseProgress Model
**Collection:** `courseprogresses`

```javascript
{
  userId: String,                 // Required, References User, Indexed
  courseId: ObjectId,             // Required, References Course, Indexed
  completed: Boolean,             // Default: false
  
  lecturesCompleted: [
    {
      lectureId: String,          // Required
      completedAt: Date           // Default: Date.now
    }
  ],
  
  progressPercent: Number,        // Default: 0, Min: 0, Max: 100
  
  createdAt: Date,                // Auto-generated
  updatedAt: Date                 // Auto-generated
}
```

**Indexes:**
- `userId` + `courseId` (compound, unique)

---

## 🌐 API Endpoints

### Base URL
```
http://localhost:5000
```

---

## 📌 Public Routes

### Health Check
```http
GET /
```
**Response:**
```
"API Working"
```

---

## 🎯 Course Routes

### 1. Get All Courses
```http
GET /api/course/all
```

**Description:** Fetches all published and non-deleted courses.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)

**Response:**
```json
{
  "success": true,
  "courses": [
    {
      "_id": "course_id",
      "courseTitle": "Complete Web Development",
      "courseDescription": "Learn full stack development",
      "courseThumbnail": "https://cloudinary.com/...",
      "coursePrice": 4999,
      "discount": 20,
      "educator": {
        "_id": "user_clerk_id",
        "name": {
          "firstName": "John",
          "lastName": "Doe"
        },
        "imageUrl": "https://..."
      },
      "averageRating": 4.5,
      "ratingCount": 120
    }
  ]
}
```

**Notes:**
- Excludes `courseContent` and `enrolledStudents` for performance
- Populates educator information (name, imageUrl)
- Only returns published and active courses

---

### 2. Get Course by ID
```http
GET /api/course/:id
```

**Description:** Fetches detailed course information including course content.

**URL Parameters:**
- `id`: Course ObjectId

**Response:**
```json
{
  "success": true,
  "courseData": {
    "_id": "course_id",
    "courseTitle": "Complete Web Development",
    "courseDescription": "Detailed description...",
    "courseThumbnail": "https://...",
    "coursePrice": 4999,
    "discount": 20,
    "educator": {
      "_id": "user_clerk_id",
      "name": {
        "firstName": "John",
        "lastName": "Doe"
      },
      "imageUrl": "https://..."
    },
    "courseContent": [
      {
        "chapterId": "chapter_1",
        "chapterOrder": 1,
        "chapterTitle": "Introduction to Web Development",
        "chapterContent": [
          {
            "lectureId": "lecture_1",
            "lectureTitle": "What is Web Development?",
            "lectureDuration": 15,
            "lectureUrl": "https://..." or "",  // Empty if not preview-free
            "isPreviewFree": true,
            "lectureOrder": 1
          }
        ]
      }
    ],
    "courseRatings": [...],
    "averageRating": 4.5
  }
}
```

**Notes:**
- Lecture URLs are only shown for `isPreviewFree: true` lectures
- Non-preview lectures return empty `lectureUrl` for non-enrolled users

---

## 👤 User Routes (Protected)

All user routes require Clerk authentication via `requireAuth()` middleware.

**Headers Required:**
```http
Authorization: Bearer <clerk_session_token>
```

---

### 1. Get User Data
```http
GET /api/user/data
```

**Description:** Fetches current authenticated user's data. Auto-creates user in MongoDB if not exists.

**Response:**
```json
{
  "success": true,
  "user": {
    "name": {
      "firstName": "John",
      "lastName": "Doe"
    },
    "imageUrl": "https://...",
    "enrolledCourses": ["course_id_1", "course_id_2"]
  }
}
```

**Flow:**
1. Extracts userId from Clerk auth token
2. Searches user in MongoDB
3. If not found, fetches from Clerk API and creates in MongoDB
4. Returns user data

---

### 2. Get Enrolled Courses
```http
GET /api/user/enrolled-courses
```

**Description:** Fetches all courses the user is enrolled in.

**Response:**
```json
{
  "success": true,
  "enrolledCourses": [
    {
      "_id": "course_id",
      "courseTitle": "Complete Web Development",
      "courseThumbnail": "https://...",
      "educator": {
        "_id": "educator_id",
        "name": {
          "firstName": "Jane",
          "lastName": "Smith"
        },
        "imageUrl": "https://..."
      }
    }
  ]
}
```

---

### 3. Purchase Course (Initiate Payment)
```http
POST /api/user/purchase
```

**Description:** Creates a Stripe checkout session for course purchase.

**Request Body:**
```json
{
  "courseId": "course_object_id"
}
```

**Response:**
```json
{
  "success": true,
  "session_url": "https://checkout.stripe.com/..."
}
```

**Flow:**
1. Validates user and course existence
2. Calculates discounted price
3. Creates Stripe checkout session
4. Creates Purchase record with status "pending"
5. Returns checkout URL for frontend redirect

**Stripe Session Metadata:**
```json
{
  "courseId": "course_id",
  "userId": "clerk_user_id"
}
```

---

### 4. Update Course Progress
```http
POST /api/user/update-course-progress
```

**Description:** Marks a lecture as completed and updates progress percentage.

**Request Body:**
```json
{
  "courseId": "course_object_id",
  "lectureId": "lecture_1"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Progress updated",
  "progressPercent": 25,
  "completed": false
}
```

**Flow:**
1. Validates courseId and lectureId
2. Fetches course to calculate total lectures
3. Updates CourseProgress document (upsert if not exists)
4. Adds lectureId to lecturesCompleted array (no duplicates)
5. Calculates progress percentage
6. Marks course as completed if 100%

---

### 5. Get Course Progress
```http
GET /api/user/get-course-progress?courseId=<course_id>
```

**Description:** Retrieves user's progress for a specific course.

**Query Parameters:**
- `courseId`: Course ObjectId

**Response:**
```json
{
  "success": true,
  "progressData": {
    "lecturesCompleted": [
      {
        "lectureId": "lecture_1",
        "completedAt": "2026-01-20T10:30:00.000Z"
      },
      {
        "lectureId": "lecture_2",
        "completedAt": "2026-01-21T14:20:00.000Z"
      }
    ],
    "progressPercent": 25,
    "completed": false
  }
}
```

---

### 6. Add/Update Course Rating
```http
POST /api/user/add-rating
```

**Description:** Allows enrolled users to rate a course (1-5 stars).

**Request Body:**
```json
{
  "courseId": "course_object_id",
  "rating": 5
}
```

**Response:**
```json
{
  "success": true,
  "message": "Rating saved successfully",
  "averageRating": 4.7
}
```

**Flow:**
1. Validates rating (1-5) and courseId
2. Checks if user is enrolled in the course
3. Updates existing rating or adds new rating
4. Recalculates average rating
5. Saves updated course

**Validation:**
- User must be enrolled in the course
- Rating must be between 1-5

---

## 👨‍🏫 Educator Routes (Protected)

All educator routes require:
1. Clerk authentication (`requireAuth()`)
2. Educator role verification (`protectEducator` middleware)

**Headers Required:**
```http
Authorization: Bearer <clerk_session_token>
```

---

### 1. Update Role to Educator
```http
GET /api/educator/update-role
```

**Description:** Updates user's Clerk metadata to grant educator privileges.

**Response:**
```json
{
  "success": true,
  "message": "You can publish courses as a educator"
}
```

**Flow:**
1. Extracts userId from Clerk token
2. Updates Clerk user's publicMetadata:
   ```json
   {
     "publicMetadata": {
       "role": "educator"
     }
   }
   ```
3. Returns success message

**Note:** This grants access to all educator-protected routes.

---

### 2. Add New Course
```http
POST /api/educator/add-course
```

**Description:** Creates a new course with thumbnail upload.

**Content-Type:** `multipart/form-data`

**Request Body:**
- `image`: File (Course Thumbnail)
- `courseData`: JSON String

**courseData Structure:**
```json
{
  "courseTitle": "Advanced React Patterns",
  "courseDescription": "Master advanced React concepts",
  "coursePrice": 5999,
  "discount": 15,
  "isPublished": false,
  "courseContent": [
    {
      "chapterId": "chapter_1",
      "chapterOrder": 1,
      "chapterTitle": "Hooks Deep Dive",
      "chapterContent": [
        {
          "lectureId": "lec_1",
          "lectureTitle": "useState Hook",
          "lectureDuration": 20,
          "lectureUrl": "https://youtube.com/...",
          "isPreviewFree": true,
          "lectureOrder": 1
        }
      ]
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Course Added Successfully",
  "course": {
    "_id": "new_course_id",
    "courseTitle": "Advanced React Patterns",
    "courseThumbnail": "https://res.cloudinary.com/...",
    "educator": "educator_clerk_id",
    ...
  }
}
```

**Flow:**
1. Validates thumbnail attachment
2. Parses courseData JSON
3. Sets educator field from auth token
4. Creates course in MongoDB
5. Uploads thumbnail to Cloudinary
6. Updates course with Cloudinary URL
7. Returns created course

---

### 3. Get Educator's Courses
```http
GET /api/educator/courses
```

**Description:** Fetches all courses created by the authenticated educator.

**Response:**
```json
{
  "success": true,
  "courses": [
    {
      "_id": "course_id",
      "courseTitle": "Advanced React Patterns",
      "courseDescription": "...",
      "courseThumbnail": "https://...",
      "coursePrice": 5999,
      "discount": 15,
      "isPublished": true,
      "isDeleted": false,
      "courseContent": [...],
      "enrolledStudents": ["user_1", "user_2"],
      "averageRating": 4.8,
      "createdAt": "2026-01-10T..."
    }
  ]
}
```

---

### 4. Get Educator Dashboard Data
```http
GET /api/educator/dashboard
```

**Description:** Fetches comprehensive dashboard statistics.

**Response:**
```json
{
  "success": true,
  "dashboardData": {
    "totalCourses": 5,
    "totalEarnings": 125000.00,
    "enrolledStudentsData": [
      {
        "student": {
          "_id": "user_clerk_id",
          "name": {
            "firstName": "Alice",
            "lastName": "Johnson"
          },
          "imageUrl": "https://..."
        },
        "courseTitle": "Advanced React Patterns",
        "purchaseDate": "2026-01-15T10:30:00.000Z"
      }
    ]
  }
}
```

**Calculation:**
- Fetches all educator's courses (excluding deleted)
- Finds all completed purchases for those courses
- Sums total earnings
- Populates student and course information

---

### 5. Get Enrolled Students Data
```http
GET /api/educator/enrolled-students
```

**Description:** Fetches detailed list of students enrolled in educator's courses.

**Response:**
```json
{
  "success": true,
  "enrolledStudents": [
    {
      "student": {
        "_id": "user_clerk_id",
        "name": {
          "firstName": "Bob",
          "lastName": "Williams"
        },
        "imageUrl": "https://..."
      },
      "courseTitle": "Complete Web Development",
      "purchaseDate": "2026-01-12T14:20:00.000Z"
    }
  ]
}
```

**Flow:**
1. Fetches educator's course IDs
2. Finds completed purchases for those courses
3. Populates student and course details
4. Returns formatted list

---

## 🔔 Webhooks

### 1. Clerk Webhook
```http
POST /clerk
```

**Description:** Handles Clerk user events (create, update, delete).

**Content-Type:** `application/json` (raw body)

**Required Headers:**
```http
svix-id: msg_xxxxx
svix-timestamp: 1234567890
svix-signature: v1,signature_hash
```

**Events Handled:**

#### user.created
```json
{
  "type": "user.created",
  "data": {
    "id": "user_clerk_id",
    "first_name": "John",
    "last_name": "Doe",
    "email_addresses": [
      {
        "email_address": "john@example.com"
      }
    ],
    "image_url": "https://..."
  }
}
```
**Action:** Creates user in MongoDB

---

#### user.updated
```json
{
  "type": "user.updated",
  "data": {
    "id": "user_clerk_id",
    "first_name": "John Updated",
    "last_name": "Doe",
    "email_addresses": [...],
    "image_url": "https://..."
  }
}
```
**Action:** Updates user in MongoDB

---

#### user.deleted
```json
{
  "type": "user.deleted",
  "data": {
    "id": "user_clerk_id"
  }
}
```
**Action:** Deletes user from MongoDB

---

**Setup Instructions:**
1. Go to Clerk Dashboard → Webhooks
2. Add endpoint: `https://yourdomain.com/clerk`
3. Select events: `user.created`, `user.updated`, `user.deleted`
4. Copy webhook secret to `.env` as `CLERK_WEBHOOK_SECRET`

---

### 2. Stripe Webhook
```http
POST /stripe
```

**Description:** Handles Stripe payment events.

**Content-Type:** `application/json` (raw body)

**Required Headers:**
```http
stripe-signature: t=timestamp,v1=signature_hash
```

**Events Handled:**

#### checkout.session.completed
```json
{
  "type": "checkout.session.completed",
  "data": {
    "object": {
      "id": "cs_test_xxxxx",
      "metadata": {
        "courseId": "course_object_id",
        "userId": "clerk_user_id"
      },
      "payment_status": "paid"
    }
  }
}
```

**Action Flow:**
1. Verifies Stripe signature
2. Starts MongoDB transaction
3. Updates Purchase status to "completed"
4. Adds course to user's `enrolledCourses` array
5. Adds user to course's `enrolledStudents` array
6. Commits transaction

**Setup Instructions:**
1. Go to Stripe Dashboard → Webhooks
2. Add endpoint: `https://yourdomain.com/stripe`
3. Select event: `checkout.session.completed`
4. Copy webhook secret to `.env` as `STRIPE_WEBHOOK_SECRET`

---

## 🔐 Authentication & Authorization

### Clerk Authentication Flow

```
1. User signs in via Clerk (Frontend)
   ↓
2. Clerk returns JWT session token
   ↓
3. Frontend includes token in Authorization header
   ↓
4. Backend clerkMiddleware() validates token
   ↓
5. Token payload available in req.auth.userId
```

### Middleware Chain

#### Public Routes
```javascript
app.get('/api/course/all', getAllCourse)
// No authentication required
```

#### Protected Routes (User)
```javascript
app.get('/api/user/data', requireAuth(), getUserData)
// Requires valid Clerk session
```

#### Protected Routes (Educator)
```javascript
app.post('/api/educator/add-course', 
  requireAuth(),           // Step 1: Validate Clerk token
  upload.single('image'),  // Step 2: Handle file upload
  protectEducator,         // Step 3: Verify educator role
  addCourse                // Step 4: Execute controller
)
```

### protectEducator Middleware

```javascript
// Checks if user has educator role in Clerk metadata
const protectEducator = async (req, res, next) => {
  const userId = req.auth.userId
  const user = await clerkClient.users.getUser(userId)
  
  if (user.publicMetadata.role !== 'educator') {
    return res.status(403).json({
      success: false, 
      message: "Unauthorized Access!"
    })
  }
  
  next()
}
```

---

## 📈 API Flow Diagrams

### Course Purchase Flow

```
Student (Frontend)
    ↓
[1] POST /api/user/purchase
    {courseId: "xxx"}
    ↓
Backend validates user & course
    ↓
Creates Purchase record (status: "pending")
    ↓
Creates Stripe Checkout Session
    ↓
Returns session_url
    ↓
Student redirected to Stripe Checkout
    ↓
[2] Student completes payment
    ↓
Stripe sends webhook → POST /stripe
    {type: "checkout.session.completed"}
    ↓
Backend Transaction Begins
    ├─ Update Purchase status → "completed"
    ├─ Add course to user.enrolledCourses
    └─ Add user to course.enrolledStudents
    ↓
Transaction Committed
    ↓
Student redirected to success page
```

---

### Course Progress Tracking Flow

```
Student watches lecture
    ↓
[1] POST /api/user/update-course-progress
    {courseId: "xxx", lectureId: "yyy"}
    ↓
Backend finds/creates CourseProgress document
    ↓
Adds lectureId to lecturesCompleted array
    ↓
Calculates: progressPercent = (completed / total) * 100
    ↓
If progressPercent === 100:
    Set completed = true
    ↓
Returns updated progress
    ↓
[2] Frontend displays progress bar
    ↓
[3] GET /api/user/get-course-progress?courseId=xxx
    ↓
Returns complete progress data
```

---

### User Creation Flow (Clerk + MongoDB)

```
User signs up on Frontend
    ↓
Clerk creates user account
    ↓
Clerk sends webhook → POST /clerk
    {type: "user.created", data: {...}}
    ↓
Backend receives webhook
    ↓
Validates Svix signature
    ↓
Creates User in MongoDB:
    {
      _id: clerkUserId,
      name: {firstName, lastName},
      email: email,
      imageUrl: imageUrl,
      enrolledCourses: []
    }
    ↓
Returns success
    ↓
User can now access protected routes
```

---

### Educator Course Creation Flow

```
Educator clicks "Add Course"
    ↓
[1] GET /api/educator/update-role
    (One-time role upgrade)
    ↓
Backend updates Clerk metadata:
    publicMetadata.role = "educator"
    ↓
[2] POST /api/educator/add-course
    FormData:
      - image: File
      - courseData: JSON
    ↓
Middleware Chain:
    ├─ requireAuth() → Validates Clerk token
    ├─ upload.single('image') → Handles file upload
    └─ protectEducator → Verifies educator role
    ↓
Backend creates course in MongoDB
    ↓
Uploads thumbnail to Cloudinary
    ↓
Updates course.courseThumbnail with Cloudinary URL
    ↓
Returns created course
    ↓
[3] GET /api/educator/courses
    ↓
Returns all educator's courses
```

---

## ⚠️ Error Handling

### Standard Error Response Format

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message (optional)"
}
```

### Common HTTP Status Codes

| Code | Description | When Used |
|------|-------------|-----------|
| `200` | OK | Successful GET/POST requests |
| `201` | Created | Resource successfully created |
| `400` | Bad Request | Invalid input validation |
| `401` | Unauthorized | Missing/invalid authentication |
| `403` | Forbidden | Insufficient permissions (e.g., not educator) |
| `404` | Not Found | Resource doesn't exist |
| `500` | Internal Server Error | Server-side errors |

---

### Error Examples

#### Invalid Course ID
```json
{
  "success": false,
  "message": "Invalid course ID"
}
```

#### Unauthorized Access (Not Educator)
```json
{
  "success": false,
  "message": "Unauthorized Access!"
}
```

#### User Not Enrolled
```json
{
  "success": false,
  "message": "User has not purchased this course"
}
```

#### Invalid Rating
```json
{
  "success": false,
  "message": "Invalid courseId or rating"
}
```

---

## 🧪 Testing with Postman/Thunder Client

### Example: Test Course Purchase

**Step 1: Get Clerk Session Token**
- Sign in on your frontend
- Open DevTools → Application → Cookies
- Copy the `__session` cookie value

**Step 2: Create Purchase Request**
```http
POST http://localhost:5000/api/user/purchase
Authorization: Bearer <clerk_session_token>
Content-Type: application/json

{
  "courseId": "67890abcdef12345"
}
```

**Step 3: Verify Response**
```json
{
  "success": true,
  "session_url": "https://checkout.stripe.com/c/pay/cs_test_xxxxx"
}
```

---

## 🔧 Middleware Configuration

### CORS Settings
```javascript
app.use(cors())
// Allows all origins (configure for production)
```

### Body Parser Settings
```javascript
// For JSON routes
app.use('/api/educator', express.json(), educatorRouter)

// For Webhooks (raw body needed for signature verification)
app.post('/clerk', express.raw({type: 'application/json'}), clerkWebhookController)
app.post('/stripe', express.raw({type: 'application/json'}), stripeWebhookHandler)
```

### File Upload Settings (Multer)
```javascript
// Configured in config/multer.js
upload.single('image')  // Single file field named 'image'
```

---

## 📝 Notes for Frontend Integration

### 1. Authentication Headers
Always include Clerk session token:
```javascript
const token = await getToken();
headers: {
  'Authorization': `Bearer ${token}`
}
```

### 2. Course Purchase Flow
```javascript
// Step 1: Initiate purchase
const response = await axios.post('/api/user/purchase', { courseId })
// Step 2: Redirect to Stripe
window.location.href = response.data.session_url
// Step 3: Stripe redirects back to: /loading/my-enrollments
```

### 3. Progress Tracking
```javascript
// Mark lecture complete
await axios.post('/api/user/update-course-progress', {
  courseId: currentCourse._id,
  lectureId: currentLecture.lectureId
})
```

### 4. Educator Course Upload
```javascript
const formData = new FormData()
formData.append('image', thumbnailFile)
formData.append('courseData', JSON.stringify(courseObject))

await axios.post('/api/educator/add-course', formData, {
  headers: {
    'Content-Type': 'multipart/form-data',
    'Authorization': `Bearer ${token}`
  }
})
```

---

## 🚨 Important Security Notes

1. **Never expose sensitive keys** in frontend code
2. **Always verify Stripe/Clerk signatures** in webhooks
3. **Use HTTPS** in production
4. **Validate all user inputs** server-side
5. **Implement rate limiting** for production
6. **Set proper CORS origins** for production
7. **Use MongoDB transactions** for critical operations (purchases)

---

## 📞 Support & Contribution

For issues or questions:
- Check the API_TESTING_GUIDE.md for detailed testing instructions
- Review error messages in server logs
- Ensure environment variables are correctly configured

---

## 📜 License

This project is part of the Skillion Learning Platform.

---

**Last Updated:** January 22, 2026
**Version:** 1.0.0
