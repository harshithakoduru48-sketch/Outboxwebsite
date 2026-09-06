import { Router } from 'express';
import multer from 'multer';
import {
  scheduleEmails,
  listScheduled,
  listSent,
  getStats,
  searchEmails,
  uploadLeadFile,
  cancelEmail,
} from '../controllers/email.controller';

const upload = multer({ storage: multer.memoryStorage() });
const router = Router();

router.post('/schedule', scheduleEmails);
router.get('/scheduled', listScheduled);
router.get('/sent', listSent);
router.get('/stats', getStats);
router.get('/search', searchEmails);
router.post('/upload-leads', upload.single('file'), uploadLeadFile);
router.delete('/:id', cancelEmail);

export default router;
