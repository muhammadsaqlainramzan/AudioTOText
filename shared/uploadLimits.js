const bytesPerMegabyte = 1024 * 1024;

export const MAX_UPLOAD_SIZE_BYTES = 500 * bytesPerMegabyte;
export const MAX_AUDIO_DURATION_SECONDS = 30 * 60;
export const MAX_VIDEO_DURATION_SECONDS = 15 * 60;

export function formatUploadSize(bytes = MAX_UPLOAD_SIZE_BYTES) {
  const megabytes = bytes / bytesPerMegabyte;
  return `${Number.isInteger(megabytes) ? megabytes : megabytes.toFixed(1)} MB`;
}

export const MAX_UPLOAD_SIZE_LABEL = formatUploadSize(MAX_UPLOAD_SIZE_BYTES);
