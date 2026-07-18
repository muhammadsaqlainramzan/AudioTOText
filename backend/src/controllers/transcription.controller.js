import AppError from '../utils/AppError.js';
import { removeFile } from '../utils/removeFile.js';
import { resolveLanguage } from '../config/languages.js';
import { transcribeAudio } from '../services/transcription.service.js';
import { prepareMediaForTranscription } from '../services/media.service.js';
import { improveTranscriptText } from '../services/textCorrection.service.js';
import { buildTranscriptExport } from '../services/export.service.js';
import { remapSpeakerSegments } from '../utils/speakerMapping.js';

export async function createTranscription(request, response, next) {
  const file = request.file;
  const temporaryFiles = [];
  const abortController = new AbortController();
  const abortRequest = () => abortController.abort();
  const abortOnClosedResponse = () => {
    if (!response.writableEnded) {
      abortRequest();
    }
  };

  request.on('aborted', abortRequest);
  response.on('close', abortOnClosedResponse);

  try {
    if (!file) {
      throw new AppError('Upload an audio or video file using the audio field.', 400);
    }

    temporaryFiles.push(file.path);

    const language = resolveLanguage(request.body.language);

    if (!language) {
      throw new AppError('Unsupported language option.', 400);
    }

    const preparedMedia = await prepareMediaForTranscription(file, {
      signal: abortController.signal,
    });
    temporaryFiles.push(...preparedMedia.temporaryFiles);

    const transcription = await transcribeAudio({
      filePath: preparedMedia.filePath,
      originalName: preparedMedia.originalName,
      mimeType: preparedMedia.mimeType,
      language,
      signal: abortController.signal,
    });
    const rawTranscript = transcription.rawText || transcription.text || '';
    const rawTranscriptSegments = remapSpeakerSegments(transcription.segments || []);
    const transcriptSentences = transcription.sentences || [];
    const transcriptWords = transcription.words || [];
    const improved = await improveTranscriptText({
      rawTranscript,
      rawSegments: rawTranscriptSegments,
      language,
      signal: abortController.signal,
    });

    response.status(201).json({
      success: true,
      transcript: improved.correctedTranscript,
      rawTranscript,
      correctedTranscript: improved.correctedTranscript,
      rawTranscriptSegments,
      correctedTranscriptSegments: improved.correctedSegments,
      transcriptSegments: improved.correctedSegments,
      sentences: transcriptSentences,
      words: transcriptWords,
      confidence: transcription.confidence || null,
      detectedLanguage: transcription.detectedLanguage || null,
      detectionPass: transcription.detectionPass || null,
      correction: improved.correction,
      language,
      file: {
        originalName: file.originalname,
        size: file.size,
        mimeType: file.mimetype,
      },
      media: {
        type: preparedMedia.media.kind,
        duration: preparedMedia.media.duration,
        transcribedMimeType: preparedMedia.mimeType,
        preprocessing: preparedMedia.media.preprocessing,
      },
      usage: transcription.usage || null,
      provider: {
        name: transcription.provider,
        model: transcription.model,
      },
    });
  } catch (error) {
    if (abortController.signal.aborted && response.destroyed) {
      return;
    }

    next(error);
  } finally {
    request.off('aborted', abortRequest);
    response.off('close', abortOnClosedResponse);
    await Promise.all([...new Set(temporaryFiles)].map((filePath) => removeFile(filePath)));
  }
}

export async function improveTranscription(request, response, next) {
  const abortController = new AbortController();
  const abortRequest = () => abortController.abort();
  const abortOnClosedResponse = () => {
    if (!response.writableEnded) {
      abortRequest();
    }
  };

  request.on('aborted', abortRequest);
  response.on('close', abortOnClosedResponse);

  try {
    const language = resolveLanguage(request.body.language);

    if (!language) {
      throw new AppError('Unsupported language option.', 400);
    }

    const rawTranscript = String(request.body.rawTranscript || request.body.transcript || '').trim();

    if (!rawTranscript) {
      throw new AppError('Raw transcript is required.', 400);
    }

    const improved = await improveTranscriptText({
      rawTranscript,
      rawSegments: remapSpeakerSegments(
        Array.isArray(request.body.rawTranscriptSegments) ? request.body.rawTranscriptSegments : [],
      ),
      language,
      signal: abortController.signal,
    });

    response.status(200).json({
      success: true,
      rawTranscript,
      correctedTranscript: improved.correctedTranscript,
      correctedTranscriptSegments: improved.correctedSegments,
      transcript: improved.correctedTranscript,
      transcriptSegments: improved.correctedSegments,
      correction: improved.correction,
      language,
    });
  } catch (error) {
    if (abortController.signal.aborted && response.destroyed) {
      return;
    }

    next(error);
  } finally {
    request.off('aborted', abortRequest);
    response.off('close', abortOnClosedResponse);
  }
}

export async function exportTranscription(request, response, next) {
  try {
    const exported = await buildTranscriptExport(request.body || {});

    response.setHeader('Content-Type', exported.contentType);
    response.setHeader('Content-Disposition', `attachment; filename="${exported.filename}"`);
    response.status(200).send(exported.buffer);
  } catch (error) {
    next(error);
  }
}
