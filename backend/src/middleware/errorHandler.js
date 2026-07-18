import multer from 'multer';
import AppError from '../utils/AppError.js';
import { errorMessages } from '../config/media.js';

export function notFoundHandler(request, _response, next) {
  next(new AppError(`Route not found: ${request.method} ${request.originalUrl}`, 404));
}

export function errorHandler(error, _request, response, _next) {
  if (response.headersSent || response.destroyed) {
    return;
  }

  if (error instanceof multer.MulterError) {
    const message = error.code === 'LIMIT_FILE_SIZE' ? errorMessages.maxFileSize : error.message;
    response.status(400).json({
      success: false,
      message,
    });
    return;
  }

  const statusCode = error.statusCode || 500;

  response.status(statusCode).json({
    success: false,
    message: error.isOperational ? error.message : 'Something went wrong while processing the request.',
    details: error.details || undefined,
  });
}
