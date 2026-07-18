import AppError from '../utils/AppError.js';
import { transcribeWithDeepgram } from './deepgramTranscription.service.js';
import { transcribeAudio as transcribeWithOpenAI } from './openaiTranscription.service.js';

function getProvider() {
  return (process.env.TRANSCRIPTION_PROVIDER || (process.env.DEEPGRAM_API_KEY ? 'deepgram' : 'openai'))
    .trim()
    .toLowerCase();
}

export async function transcribeAudio({ filePath, originalName, mimeType, language, signal }) {
  const provider = getProvider();

  if (provider === 'deepgram') {
    return transcribeWithDeepgram({
      filePath,
      originalName,
      mimeType,
      language,
      signal,
    });
  }

  if (provider === 'openai') {
    return transcribeWithOpenAI({
      filePath,
      originalName,
      mimeType,
      languageCode: language?.code,
      signal,
    });
  }

  throw new AppError(`Unsupported transcription provider: ${provider}`, 500);
}
