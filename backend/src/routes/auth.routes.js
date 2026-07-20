import { Router } from 'express';
import {
  handleGoogleCallback,
  startGoogleAuth,
  getCurrentUser,
  logout,
} from '../controllers/auth.controller.js';

const router = Router();

router.get('/google', startGoogleAuth);
router.get('/google/callback', handleGoogleCallback);
router.get('/current', getCurrentUser);
router.post('/logout', logout);

export default router;
