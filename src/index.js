import dotenv from 'dotenv';
dotenv.config();

import express, { application, json } from 'express';
import cors from 'cors';
import connectToDB from './config/db.js';
import { clerkWebhookController } from './controllers/clerkWebhookController.js';
import educatorRouter from './routes/educator.routes.js';
import { clerkMiddleware } from '@clerk/express';
import connectToCloudinary from './config/cloudinary.js';
import courseRouter from './routes/course.routes.js';
import userRouter from './routes/user.routes.js';
import chatRouter from './routes/chat.routes.js';
import skillTrackerRouter from './routes/skillTracker.routes.js';
import educatorApplicationRouter from './routes/educatorApplication.routes.js';
import certificateRouter from './routes/certificate.routes.js';
import { stripeWebhookHandler } from './webhooks/stripeWebhooksHandlers.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app=express();

// Serve static files from assets folder
app.use('/assets', express.static(path.join(__dirname, 'assets')));

app.use(cors());
app.use(clerkMiddleware())

await connectToDB();
await connectToCloudinary();


app.get('/',(req,res)=>{
    res.send("API Working");
})

// Webhook route needs raw body for signature verification
app.post('/clerk',
    express.raw({type: 'application/json'}),
    clerkWebhookController);

app.use('/api/educator',express.json(),educatorRouter);
app.use('/api/course',express.json(),courseRouter);
app.use('/api/user',express.json(),userRouter);
app.use('/api/chat',express.json(),chatRouter);
app.use('/api/skill-tracker',express.json(),skillTrackerRouter);
app.use('/api/educator-application',express.json(),educatorApplicationRouter);
app.use('/api/certificate',express.json(),certificateRouter);
app.post('/stripe',express.raw({type:'application/json'}),stripeWebhookHandler)



const PORT=process.env.PORT || 5000

app.listen(PORT,()=>{
    console.log("Server is running on port 5000");
})
