import { Router } from 'express';
import { languages } from '../config/languages.js';

const router = Router();

router.get('/', (_request, response) => {
  response.json({
    success: true,
    languages,
  });
});

export default router;
