import { userWebHookhandlers } from "./userWebhookHandlers.js";

export const clerkEventMap= {
    "user.created":userWebHookhandlers.onUserCreated,
    "user.updated":userWebHookhandlers.onUserUpdated,
    "user.deleted":userWebHookhandlers.onUserDeleted
}