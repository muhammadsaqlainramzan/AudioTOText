import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import AppError from '../utils/AppError.js';
import {
  MAX_UPLOAD_SIZE_BYTES,
  errorMessages,
  supportedExtensions,
  supportedMimeTypes,
} from './media.js';

const uploadDir = path.resolve(process.cwd(), 'uploads');

fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination(_request, _file, callback) {
    callback(null, uploadDir);
  },
  filename(_request, file, callback) {
    const extension = path.extname(file.originalname).toLowerCase();
    const safeName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`;
    callback(null, safeName);
  },
});

function fileFilter(_request, file, callback) {
  const extension = path.extname(file.originalname).toLowerCase();
  const originalName = (file.originalname || '').trim();
  const containsDangerousPathChars = /[\\/]/.test(originalName) || /[<>:"|?*]/.test(originalName);
  const containsSuspiciousControlChars = /[\u0000-\u001f\u007f]/.test(originalName);

  if (containsDangerousPathChars || containsSuspiciousControlChars) {
    callback(new AppError('Invalid file name.', 400));
    return;
  }

  if (!supportedExtensions.has(extension) || !supportedMimeTypes.has(file.mimetype || '')) {
    callback(new AppError(errorMessages.unsupportedFormat, 400));
    return;
  }

  callback(null, true);
}

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_UPLOAD_SIZE_BYTES,
    files: 1,
  },
});
