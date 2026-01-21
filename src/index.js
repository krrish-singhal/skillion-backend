import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();
import connectToDB from './config/db.js';
import { clerkWebhookController } from './controllers/clerkWebhookController.js';


const app=express();


app.use(cors());

await connectToDB();

app.get('/',(req,res)=>{
    res.send("API Working");
})

// Webhook route needs raw body for signature verification
app.post('/clerk',
    express.raw({type: 'application/json'}),
    clerkWebhookController);



const PORT=process.env.PORT || 5000

app.listen(PORT,()=>{
    console.log("Server is running on port 5000");
})
