import {
  MAX_AUDIO_DURATION_SECONDS,
  MAX_UPLOAD_SIZE_BYTES,
  MAX_UPLOAD_SIZE_LABEL,
  MAX_VIDEO_DURATION_SECONDS,
} from '../../../shared/uploadLimits.js';

export const errorMessages = {
  maxFileSize: `Maximum file size is ${MAX_UPLOAD_SIZE_LABEL}.`,
  maxAudioDuration: 'Maximum audio duration is 30 minutes.',
  maxVideoDuration: 'Maximum video duration is 15 minutes.',
  unsupportedFormat: 'Unsupported file format.',
};

export {
  MAX_AUDIO_DURATION_SECONDS,
  MAX_UPLOAD_SIZE_BYTES,
  MAX_UPLOAD_SIZE_LABEL,
  MAX_VIDEO_DURATION_SECONDS,
};

export const audioExtensions = new Set(['.mp3', '.wav', '.m4a', '.aac', '.flac', '.ogg']);
export const videoExtensions = new Set(['.mp4', '.mov', '.avi', '.mkv', '.webm']);
export const supportedExtensions = new Set([...audioExtensions, ...videoExtensions]);

export const supportedMimeTypes = new Set([
  '',
  'application/octet-stream',
  'application/x-matroska',
  'application/ogg',
  'application/mp4',
  'audio/aac',
  'audio/flac',
  'audio/m4a',
  'audio/mp3',
  'audio/mp4',
  'audio/mpeg',
  'audio/ogg',
  'audio/wav',
  'audio/wave',
  'audio/webm',
  'audio/x-aac',
  'audio/x-flac',
  'audio/x-mp3',
  'audio/x-mpeg',
  'audio/x-m4a',
  'audio/x-ogg',
  'audio/x-wav',
  'audio/vnd.wave',
  'video/avi',
  'video/msvideo',
  'video/mp4',
  'video/ogg',
  'video/quicktime',
  'video/webm',
  'video/x-m4v',
  'video/x-matroska',
  'video/x-msvideo',
]);

export function getMediaKind(extension) {
  if (audioExtensions.has(extension)) return 'audio';
  if (videoExtensions.has(extension)) return 'video';
  return null;
}
