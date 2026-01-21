import { Webhook } from 'svix';
import { clerkEventMap } from '../webhooks/clerkEventMap.js';

export const clerkWebhookController = async (req, res) => {
    const secret = process.env.CLERK_WEBHOOK_SECRET;
    if (!secret) {
        console.log("Secret is missing");
        return res.status(500).send("Server configuration error");
    }
    
    let event;
    
    // Development mode: Skip verification if no valid Svix signature
    const hasSvixSignature = req.headers["svix-signature"] && 
                             req.headers["svix-id"] && 
                             req.headers["svix-timestamp"];
    
    if (!hasSvixSignature) {
        // Development/testing mode: parse body directly without verification
        console.log("⚠️  Development mode: Skipping webhook verification");
        try {
            const payload = req.body.toString();
            event = JSON.parse(payload);
        } catch (error) {
            console.error("Failed to parse webhook payload:", error.message);
            return res.status(400).send("Invalid JSON payload");
        }
    } else {
        // Production mode: verify webhook signature
        try {
            const wh = new Webhook(secret);
            const payload = req.body.toString();
            const headers = {
                "svix-id": req.headers["svix-id"],
                "svix-timestamp": req.headers["svix-timestamp"],
                "svix-signature": req.headers["svix-signature"],
            };
            event = wh.verify(payload, headers);
        } catch (error) {
            console.error("Webhook verification failed:", error.message);
            return res.status(401).send("Invalid webhook signature");
        }
    }
    
    const handler = clerkEventMap[event.type];
    if (!handler) {
        return res.status(200).json({
            ignored: true
        });
    }
    
    try {
        await handler(event.data);
        return res.status(200).json({
            recieved: true
        });
    } catch (err) {
        console.error("Webhook handler failed:", err.message);
        return res.status(500).send("Webhook processing error");
    }
};