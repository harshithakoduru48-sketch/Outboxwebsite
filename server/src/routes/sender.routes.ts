import { Router } from 'express';
import {
  listSenders,
  createSender,
  updateSenderLimit,
} from '../controllers/sender.controller';

const router = Router();

router.get('/', listSenders);
router.post('/', createSender);
router.patch('/:id/limit', updateSenderLimit);

export default router;
