import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import ffprobeStatic from 'ffprobe-static';
import {
  MAX_AUDIO_DURATION_SECONDS,
  MAX_UPLOAD_SIZE_BYTES,
  MAX_VIDEO_DURATION_SECONDS,
  errorMessages,
  getMediaKind,
  supportedExtensions,
  supportedMimeTypes,
} from '../config/media.js';
import AppError from '../utils/AppError.js';
import { preprocessAudioForTranscription } from './audioPreprocessing.service.js';

const execFileAsync = promisify(execFile);
const ffmpegPath = process.env.FFMPEG_PATH || ffmpegInstaller.path;
const ffprobePath = process.env.FFPROBE_PATH || ffprobeStatic.path;

function ensureMediaTools() {
  if (!ffmpegPath || !fs.existsSync(ffmpegPath) || !ffprobePath || !fs.existsSync(ffprobePath)) {
    throw new AppError('Media validation tools are not available on the backend.', 500);
  }
}

function throwIfCancelled(signal) {
  if (signal?.aborted) {
    throw new AppError('Transcription was cancelled.', 499);
  }
}

function parseDuration(probeResult) {
  const formatDuration = Number(probeResult?.format?.duration);

  if (Number.isFinite(formatDuration) && formatDuration > 0) {
    return formatDuration;
  }

  const streamDurations = (probeResult?.streams || [])
    .map((stream) => Number(stream.duration))
    .filter((duration) => Number.isFinite(duration) && duration > 0);

  return streamDurations.length ? Math.max(...streamDurations) : null;
}

async function probeMedia(filePath, signal) {
  ensureMediaTools();
  throwIfCancelled(signal);

  try {
    const { stdout } = await execFileAsync(
      ffprobePath,
      [
        '-v',
        'error',
        '-show_entries',
        'format=duration,format_name:stream=codec_type,codec_name,duration',
        '-of',
        'json',
        filePath,
      ],
      {
        maxBuffer: 1024 * 1024,
        windowsHide: true,
        signal,
      },
    );

    return JSON.parse(stdout);
  } catch (error) {
    if (signal?.aborted || error?.name === 'AbortError' || error?.code === 'ABORT_ERR') {
      throw new AppError('Transcription was cancelled.', 499);
    }

    throw new AppError(errorMessages.unsupportedFormat, 400);
  }
}

export async function validateUploadedMedia(file, signal) {
  throwIfCancelled(signal);

  const extension = path.extname(file.originalname).toLowerCase();
  const kind = getMediaKind(extension);

  if (!kind || !supportedExtensions.has(extension) || !supportedMimeTypes.has(file.mimetype || '')) {
    throw new AppError(errorMessages.unsupportedFormat, 400);
  }

  if (file.size > MAX_UPLOAD_SIZE_BYTES) {
    throw new AppError(errorMessages.maxFileSize, 400);
  }

  const probeResult = await probeMedia(file.path, signal);
  const streams = probeResult.streams || [];
  const hasAudio = streams.some((stream) => stream.codec_type === 'audio');
  const hasVideo = streams.some((stream) => stream.codec_type === 'video');
  const duration = parseDuration(probeResult);

  if (!hasAudio || (kind === 'video' && !hasVideo) || !duration) {
    throw new AppError(errorMessages.unsupportedFormat, 400);
  }

  if (kind === 'audio' && duration > MAX_AUDIO_DURATION_SECONDS) {
    throw new AppError(errorMessages.maxAudioDuration, 400);
  }

  if (kind === 'video' && duration > MAX_VIDEO_DURATION_SECONDS) {
    throw new AppError(errorMessages.maxVideoDuration, 400);
  }

  return {
    duration,
    extension,
    kind,
  };
}

export async function extractAudioFromVideo(filePath, signal) {
  ensureMediaTools();
  throwIfCancelled(signal);

  const directory = path.dirname(filePath);
  const baseName = path.basename(filePath, path.extname(filePath));
  const outputPath = path.join(directory, `${baseName}-audio.wav`);

  try {
    await execFileAsync(
      ffmpegPath,
      [
        '-hide_banner',
        '-loglevel',
        'error',
        '-y',
        '-i',
        filePath,
        '-vn',
        '-acodec',
        'pcm_s16le',
        '-ac',
        '1',
        '-ar',
        '16000',
        outputPath,
      ],
      {
        maxBuffer: 1024 * 1024,
        windowsHide: true,
        signal,
      },
    );

    return outputPath;
  } catch (error) {
    try {
      if (fs.existsSync(outputPath)) {
        fs.unlinkSync(outputPath);
      }
    } catch {
      // The request cleanup path will still handle known temporary files.
    }

    if (signal?.aborted || error?.name === 'AbortError' || error?.code === 'ABORT_ERR') {
      throw new AppError('Transcription was cancelled.', 499);
    }

    throw new AppError(errorMessages.unsupportedFormat, 400);
  }
}

export async function prepareMediaForTranscription(file, { signal } = {}) {
  const media = await validateUploadedMedia(file, signal);
  const preparedAudio = await preprocessAudioForTranscription(file, media, signal);

  return {
    ...preparedAudio,
    media: {
      ...media,
      preprocessing: preparedAudio.preprocessing,
    },
  };
}
