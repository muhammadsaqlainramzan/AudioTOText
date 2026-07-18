import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import AppError from '../utils/AppError.js';

const execFileAsync = promisify(execFile);
const ffmpegPath = process.env.FFMPEG_PATH || ffmpegInstaller.path;
const targetSampleRate = Number(process.env.TRANSCRIPTION_SAMPLE_RATE || 16000);
const volumeNormalizeMode = (process.env.AUDIO_NORMALIZE || 'auto').trim().toLowerCase();
const enableDenoise = process.env.AUDIO_DENOISE === 'true';
const silenceMaxVolumeDb = Number(process.env.SILENCE_MAX_VOLUME_DB || -55);

function ensureFfmpeg() {
  if (!ffmpegPath || !fs.existsSync(ffmpegPath)) {
    throw new AppError('Audio preprocessing tools are not available on the backend.', 500);
  }
}

function throwIfCancelled(signal) {
  if (signal?.aborted) {
    throw new AppError('Transcription was cancelled.', 499);
  }
}

function getNullOutput() {
  return process.platform === 'win32' ? 'NUL' : '/dev/null';
}

function parseVolumeStats(output = '') {
  const meanMatch = output.match(/mean_volume:\s*(-?(?:\d+(?:\.\d+)?|inf))\s*dB/i);
  const maxMatch = output.match(/max_volume:\s*(-?(?:\d+(?:\.\d+)?|inf))\s*dB/i);

  const parseDb = (value) => {
    if (!value || value.toLowerCase() === '-inf') return Number.NEGATIVE_INFINITY;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };

  return {
    meanVolumeDb: parseDb(meanMatch?.[1]),
    maxVolumeDb: parseDb(maxMatch?.[1]),
  };
}

async function getVolumeStats(filePath, signal) {
  ensureFfmpeg();
  throwIfCancelled(signal);

  try {
    const { stdout, stderr } = await execFileAsync(
      ffmpegPath,
      [
        '-hide_banner',
        '-nostdin',
        '-i',
        filePath,
        '-af',
        'volumedetect',
        '-f',
        'null',
        getNullOutput(),
      ],
      {
        maxBuffer: 1024 * 1024,
        windowsHide: true,
        signal,
      },
    );
    return parseVolumeStats(`${stdout || ''}\n${stderr || ''}`);
  } catch (error) {
    if (signal?.aborted || error?.name === 'AbortError' || error?.code === 'ABORT_ERR') {
      throw new AppError('Transcription was cancelled.', 499);
    }

    const output = `${error.stdout || ''}\n${error.stderr || ''}`;
    const stats = parseVolumeStats(output);

    if (stats.meanVolumeDb !== null || stats.maxVolumeDb !== null) {
      return stats;
    }

    throw new AppError('The uploaded media could not be decoded. Try a clearer audio or video file.', 400);
  }
}

function shouldNormalizeVolume(stats) {
  if (volumeNormalizeMode === 'always') return true;
  if (volumeNormalizeMode === 'never') return false;
  if (!stats) return false;

  const { meanVolumeDb, maxVolumeDb } = stats;
  const isVeryQuiet =
    (Number.isFinite(maxVolumeDb) && maxVolumeDb <= -12) ||
    (Number.isFinite(meanVolumeDb) && meanVolumeDb <= -32);
  const isNearClipping = Number.isFinite(maxVolumeDb) && maxVolumeDb >= -1;

  return isVeryQuiet || isNearClipping;
}

function getAudioFilters(stats) {
  const filters = [];

  if (enableDenoise) {
    filters.push('afftdn=nf=-25');
  }

  filters.push(`aresample=${targetSampleRate}`);

  if (shouldNormalizeVolume(stats)) {
    filters.push('loudnorm=I=-16:LRA=11:TP=-1.5');
  }

  return filters.join(',');
}

export async function preprocessAudioForTranscription(file, media, signal) {
  ensureFfmpeg();
  throwIfCancelled(signal);

  const beforeStats = await getVolumeStats(file.path, signal);

  if (beforeStats.maxVolumeDb !== null && beforeStats.maxVolumeDb <= silenceMaxVolumeDb) {
    throw new AppError('No speech was detected. Try a recording with clearer audio.', 422);
  }

  const directory = path.dirname(file.path);
  const baseName = path.basename(file.path, path.extname(file.path));
  const outputPath = path.join(directory, `${baseName}-preprocessed.wav`);

  try {
    await execFileAsync(
      ffmpegPath,
      [
        '-hide_banner',
        '-loglevel',
        'error',
        '-nostdin',
        '-y',
        '-i',
        file.path,
        '-map',
        '0:a:0',
        '-vn',
        '-acodec',
        'pcm_s16le',
        '-ac',
        '1',
        '-ar',
        String(targetSampleRate),
        '-af',
        getAudioFilters(beforeStats),
        outputPath,
      ],
      {
        maxBuffer: 1024 * 1024,
        windowsHide: true,
        signal,
      },
    );
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

    throw new AppError('The uploaded media could not be prepared for transcription.', 400);
  }

  const afterStats = await getVolumeStats(outputPath, signal).catch(() => null);

  return {
    filePath: outputPath,
    mimeType: 'audio/wav',
    originalName: `${path.basename(file.originalname, path.extname(file.originalname))}.wav`,
    temporaryFiles: [outputPath],
    preprocessing: {
      sourceType: media.kind,
      normalizedVolume: shouldNormalizeVolume(beforeStats),
      volumeNormalizeMode,
      denoiseApplied: enableDenoise,
      channels: 1,
      sampleRate: targetSampleRate,
      codec: 'pcm_s16le',
      before: beforeStats,
      after: afterStats,
    },
  };
}
