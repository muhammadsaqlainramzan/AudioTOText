import OpenAI from 'openai';
import AppError from '../utils/AppError.js';

export function hasOpenAIApiKey() {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

export function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    throw new AppError(
      'OpenAI API key is missing. Add OPENAI_API_KEY to backend/.env and restart the backend server.',
      500,
    );
  }

  return new OpenAI({
    apiKey,
  });
}
