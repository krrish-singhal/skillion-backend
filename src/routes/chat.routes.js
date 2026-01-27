import express from 'express';
import { chatController } from '../controllers/chatController.js';

const chatRouter = express.Router();

// POST /api/chat - Send message to chatbot
chatRouter.post('/', chatController);

export default chatRouter;
