import express from 'express';
import { requireAuth } from '@clerk/express';
import { 
  generateCertificate, 
  getUserCertificates, 
  getCertificateById, 
  verifyCertificate 
} from '../controllers/certificateController.js';

const router = express.Router();

// All routes require authentication except verification
router.post('/generate', requireAuth(), generateCertificate);
router.get('/my-certificates', requireAuth(), getUserCertificates);
router.get('/:certificateId', getCertificateById);
router.get('/verify/:certificateId', verifyCertificate);

export default router;
