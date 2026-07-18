import { Router } from 'express';
import {
  createTranscription,
  exportTranscription,
  improveTranscription,
} from '../controllers/transcription.controller.js';
import { upload } from '../config/upload.js';
import { removeFile } from '../utils/removeFile.js';

const router = Router();

function singleAudioUpload(request, response, next) {
  upload.single('audio')(request, response, (error) => {
    if (!error) {
      next();
      return;
    }

    removeFile(request.file?.path).finally(() => next(error));
  });
}

router.post('/improve', improveTranscription);
router.post('/export', exportTranscription);
router.post('/', singleAudioUpload, createTranscription);

export default router;
