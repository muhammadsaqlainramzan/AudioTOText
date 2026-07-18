import fs from 'node:fs';
import AppError from '../utils/AppError.js';
import { getOpenAIClient } from './openaiClient.js';

const model = process.env.OPENAI_TRANSCRIPTION_MODEL || 'gpt-4o-transcribe';

export async function transcribeAudio({ filePath, originalName, languageCode, signal }) {
  const client = getOpenAIClient();
  const request = {
    file: fs.createReadStream(filePath),
    model,
  };

  if (languageCode) {
    request.language = languageCode;
  }

  try {
    const transcription = await client.audio.transcriptions.create(request, { signal });

    return {
      ...transcription,
      model,
      originalName,
    };
  } catch (error) {
    if (signal?.aborted || error?.name === 'AbortError') {
      throw new AppError('Transcription was cancelled.', 499);
    }

    const message = error?.error?.message || error?.message || 'Transcription provider request failed.';
    const statusCode = error?.status || 502;

    throw new AppError(message, statusCode, {
      provider: 'OpenAI',
      model,
    });
  }
}
