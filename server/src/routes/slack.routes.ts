import { Router } from 'express';
import {
  getSlackStatus,
  saveSlackWebhook,
  disconnectSlack,
  testSlack,
  handleSlackOAuth,
} from '../controllers/slack.controller';

const router = Router();

router.get('/status', getSlackStatus);
router.post('/webhook', saveSlackWebhook);
router.post('/disconnect', disconnectSlack);
router.post('/test', testSlack);
router.post('/oauth/callback', handleSlackOAuth);

export default router;
