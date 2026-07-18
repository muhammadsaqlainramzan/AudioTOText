import { Router } from 'express';
import { answerWordMeaning } from '../controllers/assistant.controller.js';

const router = Router();

router.post('/word-meaning', answerWordMeaning);

export default router;
