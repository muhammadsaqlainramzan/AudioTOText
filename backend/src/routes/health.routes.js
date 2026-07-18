import { Router } from 'express';

const router = Router();

router.get('/', (_request, response) => {
  response.json({
    success: true,
    service: 'AT2 Transcriber API',
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

export default router;
