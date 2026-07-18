import AppError from '../utils/AppError.js';
import { buildWordMeaningAnswer, isVocabularyQuestion } from '../services/wordMeaning.service.js';

export async function answerWordMeaning(request, response, next) {
  try {
    const question = String(request.body?.question || '').trim();

    if (!question) {
      throw new AppError('Question is required.', 400);
    }

    if (!isVocabularyQuestion(question)) {
      throw new AppError('This endpoint only handles word meaning and vocabulary questions.', 400);
    }

    const result = await buildWordMeaningAnswer({
      question,
      transcriptRows: request.body?.transcriptRows,
      language: request.body?.language,
    });

    response.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
}
