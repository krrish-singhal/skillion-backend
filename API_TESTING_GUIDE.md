# API Testing Guide for Skillion Backend

## Prerequisites
- Install [Postman](https://www.postman.com/downloads/) or [Thunder Client](https://www.thunderclient.com/) VS Code extension
- Install [ngrok](https://ngrok.com/) for webhook testing

## 1️⃣ Test Basic API Endpoint

### Start the Server
```bash
cd Backend
npm run dev
```

### Test GET Request
**Endpoint:** `http://localhost:5000/`
**Method:** GET
**Expected Response:** "API Working"

---

## 2️⃣ Test Clerk Webhook (POST /clerk)

### Option A: Using Postman/Thunder Client (Local Testing)

1. **Setup Request:**
   - Method: `POST`
   - URL: `http://localhost:5000/clerk`
   - Headers:
     ```
     Content-Type: application/json
     svix-id: msg_test123
     svix-timestamp: 1234567890
     svix-signature:  1234567890
     ```
   - Body (Raw JSON):
     ```json
     {
       "type": "user.created",
       "data": {
         "id": "user_test123",
         "first_name": "John",
         "last_name": "Doe",
         "email_addresses": [{
           "email_address": "john@example.com"
         }],
         "image_url": "https://example.com/image.jpg"
       }
     }
     ```

2. **Expected Response:** 
   - Without valid Clerk signature: `401 Invalid webhook signature` (This is expected!)
   - With valid signature: `200 { "received": true }`

---

### Option B: Using Clerk Dashboard (Real Testing)

#### Step 1: Expose Local Server to Internet
```bash
# Install ngrok if not installed
# Then run:
ngrok http 5000
```
This will give you a public URL like: `https://abc123.ngrok.io`

#### Step 2: Configure Clerk Webhook

1. Go to [Clerk Dashboard](https://dashboard.clerk.com/)
2. Select your application
3. Navigate to **Webhooks** section
4. Click **Add Endpoint**
5. Enter your ngrok URL: `https://abc123.ngrok.io/clerk`
6. Select events to listen to:
   - ✅ user.created
   - ✅ user.updated
   - ✅ user.deleted
7. Copy the **Signing Secret** and add it to your `.env` file:
   ```env
   CLERK_WEBHOOK_SECRET=whsec_your_secret_here
   ```

#### Step 3: Test Webhook

1. **Create a User:**
   - Go to Clerk Dashboard → Users
   - Click "Create User"
   - Fill in details and create
   - Check your MongoDB database - user should be created!

2. **Update a User:**
   - Edit user details in Clerk Dashboard
   - Check MongoDB - user should be updated!

3. **Delete a User:**
   - Delete user from Clerk Dashboard
   - Check MongoDB - user should be deleted!

---

## 3️⃣ Verify Database Changes

### Using MongoDB Compass
1. Open MongoDB Compass
2. Connect to your database
3. Navigate to your database → users collection
4. You should see created/updated/deleted users

### Using MongoDB Shell
```bash
mongosh "your_connection_string"
use your_database_name
db.users.find().pretty()
```

---

## 4️⃣ Testing Checklist

- [ ] Server starts without errors
- [ ] GET `/` returns "API Working"
- [ ] Webhook endpoint accepts POST requests
- [ ] Invalid signatures are rejected (401)
- [ ] User creation works (creates document in MongoDB)
- [ ] User update works (updates existing document)
- [ ] User deletion works (removes document from MongoDB)
- [ ] Error logs appear in console for debugging

---

## 5️⃣ Troubleshooting

### Common Issues:

**Issue:** `401 Invalid webhook signature`
- **Solution:** This is expected when testing manually. Use Clerk Dashboard for real testing.

**Issue:** Database connection fails
- **Solution:** Check your MongoDB connection string in `.env` file

**Issue:** `CLERK_WEBHOOK_SECRET` not found
- **Solution:** Add the secret from Clerk Dashboard to your `.env` file

**Issue:** Webhook not triggered
- **Solution:** Make sure ngrok is running and webhook URL is correct in Clerk Dashboard

---

## 6️⃣ Environment Variables Required

Create a `.env` file in Backend folder:
```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
CLERK_WEBHOOK_SECRET=whsec_your_webhook_secret
```

---

## 📝 Tips for Testing

1. **Use ngrok** for webhook testing - it's the easiest way
2. **Check console logs** - Your server logs will show what's happening
3. **Use MongoDB Compass** - Visual tool to verify database changes
4. **Test incrementally** - Test each webhook event (create, update, delete) separately
5. **Keep Clerk Dashboard open** - Watch webhook events in real-time in the Webhooks section
