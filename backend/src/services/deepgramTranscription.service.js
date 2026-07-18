import fs from 'node:fs';
import { languages, nova3LanguageCodes } from '../config/languages.js';
import AppError from '../utils/AppError.js';
import { createSpeakerMapper } from '../utils/speakerMapping.js';

const endpoint = 'https://api.deepgram.com/v1/listen';
const defaultModel = process.env.DEEPGRAM_MODEL || 'nova-3';
const autoDetectModel = process.env.DEEPGRAM_AUTO_DETECT_MODEL || 'nova-3-general';
const fallbackModel = process.env.DEEPGRAM_FALLBACK_MODEL || 'whisper';
const lowConfidenceThreshold = Number(process.env.TRANSCRIPT_LOW_CONFIDENCE_THRESHOLD || 0.65);
const requestTimeoutMs = Number(process.env.DEEPGRAM_REQUEST_TIMEOUT_MS || 600000);
const languagesWithoutSmartFormat = new Set(['pa', 'ur']);

function getApiKey() {
  const apiKey = process.env.DEEPGRAM_API_KEY?.trim();

  if (!apiKey) {
    throw new AppError(
      'Deepgram API key is missing. Add DEEPGRAM_API_KEY to backend/.env and restart the backend server.',
      500,
    );
  }

  return apiKey;
}

function getTranscript(responseBody) {
  return responseBody?.results?.channels?.[0]?.alternatives?.[0]?.transcript || '';
}

function getPrimaryAlternative(responseBody) {
  return responseBody?.results?.channels?.[0]?.alternatives?.[0] || {};
}

function getModel(language) {
  if (language?.detectLanguage) {
    return autoDetectModel;
  }

  if (!language?.detectLanguage && nova3LanguageCodes.has(language?.code)) {
    return 'nova-3';
  }

  return language?.deepgramModel || defaultModel || fallbackModel;
}

function shouldUseSmartFormat(language) {
  if (language?.detectLanguage) return true;
  return Boolean(language?.code) && !languagesWithoutSmartFormat.has(language.code);
}

function resolveDetectedLanguage(languageCode) {
  if (!languageCode) return null;

  const normalizedCode = String(languageCode).toLowerCase();

  return languages.find((language) =>
    !language.detectLanguage &&
    [language.code, language.deepgramCode].filter(Boolean).some((code) => String(code).toLowerCase() === normalizedCode),
  ) || null;
}

function getConfidence(values) {
  const confidences = values
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value));

  if (!confidences.length) return null;

  return confidences.reduce((sum, value) => sum + value, 0) / confidences.length;
}

function normalizeWord(word = {}, speaker = word.speaker, mapSpeaker = createSpeakerMapper()) {
  const confidence = Number(word.confidence);
  const normalizedConfidence = Number.isFinite(confidence) ? confidence : null;
  const mappedSpeaker = mapSpeaker(speaker);

  return {
    text: word.punctuated_word || word.word || '',
    raw: word.word || '',
    start: word.start ?? null,
    end: word.end ?? null,
    confidence: normalizedConfidence,
    speaker: mappedSpeaker.speaker,
    originalSpeaker: mappedSpeaker.originalSpeaker,
    speakerLabel: mappedSpeaker.speakerLabel,
    isUncertain: normalizedConfidence !== null && normalizedConfidence < lowConfidenceThreshold,
  };
}

function getWords(responseBody, mapSpeaker = createSpeakerMapper()) {
  const utteranceWords = responseBody?.results?.utterances
    ?.flatMap((utterance) =>
      Array.isArray(utterance.words)
        ? utterance.words.map((word) => normalizeWord(word, word.speaker ?? utterance.speaker, mapSpeaker))
        : [],
    );

  if (Array.isArray(utteranceWords) && utteranceWords.length > 0) {
    return utteranceWords.filter((word) => word.text);
  }

  const words = getPrimaryAlternative(responseBody)?.words;

  if (!Array.isArray(words)) return [];

  return words.map((word) => normalizeWord(word, word.speaker, mapSpeaker)).filter((word) => word.text);
}

function getUncertainWordCount(words = []) {
  return words.filter((word) => word.isUncertain).length;
}

function getTranscriptSegments(responseBody, mapSpeaker = createSpeakerMapper()) {
  const utterances = responseBody?.results?.utterances;

  if (Array.isArray(utterances) && utterances.length > 0) {
    return utterances
      .filter((utterance) => utterance?.transcript)
      .map((utterance) => {
        const mappedSpeaker = mapSpeaker(utterance.speaker);
        const words = Array.isArray(utterance.words)
          ? utterance.words.map((word) => normalizeWord(word, word.speaker ?? utterance.speaker, mapSpeaker))
          : [];

        return {
          speaker: mappedSpeaker.speaker,
          originalSpeaker: mappedSpeaker.originalSpeaker,
          speakerLabel: mappedSpeaker.speakerLabel,
          start: utterance.start ?? null,
          end: utterance.end ?? null,
          confidence: utterance.confidence ?? getConfidence(words.map((word) => word.confidence)),
          transcript: utterance.transcript,
          words,
          uncertainWordCount: getUncertainWordCount(words),
        };
      });
  }

  const words = getWords(responseBody, mapSpeaker);

  if (!Array.isArray(words) || words.length === 0 || words.every((word) => word.speaker === undefined)) {
    return [];
  }

  return words.reduce((segments, word) => {
    const speaker = word.speaker ?? null;
    const token = word.text || word.raw;

    if (!token) return segments;

    const current = segments.at(-1);

    if (current && current.speaker === speaker) {
      current.transcript = `${current.transcript} ${token}`.trim();
      current.end = word.end ?? current.end;
      current.words.push(word);
      current.confidence = getConfidence(current.words.map((item) => item.confidence));
      current.uncertainWordCount = getUncertainWordCount(current.words);
      return segments;
    }

    segments.push({
      speaker,
      originalSpeaker: word.originalSpeaker ?? null,
      speakerLabel: word.speakerLabel,
      start: word.start ?? null,
      end: word.end ?? null,
      confidence: word.confidence,
      transcript: token,
      words: [word],
      uncertainWordCount: word.isUncertain ? 1 : 0,
    });

    return segments;
  }, []);
}

function getSentences(responseBody, segments = []) {
  const paragraphGroups = getPrimaryAlternative(responseBody)?.paragraphs?.paragraphs;

  if (Array.isArray(paragraphGroups) && paragraphGroups.length > 0) {
    return paragraphGroups.flatMap((paragraph) =>
      (paragraph.sentences || []).map((sentence) => {
        const overlappingSegment = segments.find((segment) =>
          Number.isFinite(Number(sentence.start)) &&
          Number.isFinite(Number(sentence.end)) &&
          Number(segment.start) <= Number(sentence.end) &&
          Number(segment.end) >= Number(sentence.start),
        );

        return {
          text: sentence.text || '',
          start: sentence.start ?? null,
          end: sentence.end ?? null,
          speaker: overlappingSegment?.speaker ?? null,
          speakerLabel: overlappingSegment?.speakerLabel || null,
          confidence: overlappingSegment?.confidence ?? null,
        };
      }),
    );
  }

  return segments.map((segment) => ({
    text: segment.transcript,
    start: segment.start ?? null,
    end: segment.end ?? null,
    speaker: segment.speaker ?? null,
    speakerLabel: segment.speakerLabel || null,
    confidence: segment.confidence ?? null,
  }));
}

function formatSegmentTranscript(segments, fallbackTranscript) {
  if (!segments.length) return fallbackTranscript;

  return segments
    .map((segment) => `${segment.speakerLabel}: ${segment.transcript}`)
    .join('\n\n');
}

function throwIfCancelled(signal) {
  if (signal?.aborted) {
    throw new AppError('Transcription was cancelled.', 499);
  }
}

function createRequestSignal(parentSignal) {
  const controller = new AbortController();
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, requestTimeoutMs);
  const abortFromParent = () => controller.abort();

  if (parentSignal?.aborted) {
    abortFromParent();
  } else {
    parentSignal?.addEventListener('abort', abortFromParent, { once: true });
  }

  return {
    signal: controller.signal,
    didTimeout: () => timedOut,
    cleanup() {
      clearTimeout(timeout);
      parentSignal?.removeEventListener('abort', abortFromParent);
    },
  };
}

async function requestTranscription({ apiKey, filePath, mimeType, params, signal }) {
  throwIfCancelled(signal);
  const requestSignal = createRequestSignal(signal);

  try {
    const response = await fetch(`${endpoint}?${params.toString()}`, {
      method: 'POST',
      headers: {
        Authorization: `Token ${apiKey}`,
        'Content-Type': mimeType || 'application/octet-stream',
      },
      body: fs.createReadStream(filePath),
      duplex: 'half',
      signal: requestSignal.signal,
    });
    const responseBody = await response.json().catch(() => ({}));

    return { response, responseBody };
  } catch (error) {
    if (requestSignal.didTimeout()) {
      throw new AppError('The transcription provider timed out. Please try again with a shorter or clearer file.', 504, {
        provider: 'Deepgram',
      });
    }

    throw error;
  } finally {
    requestSignal.cleanup();
  }
}

function isDiarizationError(responseBody) {
  const message = `${responseBody?.err_msg || ''} ${responseBody?.message || ''}`.toLowerCase();
  return message.includes('diar');
}

function buildDeepgramParams({ model, language }) {
  const smartFormat = shouldUseSmartFormat(language);
  const params = new URLSearchParams({
    model,
    punctuate: 'true',
    utterances: 'true',
    paragraphs: 'true',
  });
  const deepgramLanguage = language?.deepgramCode || language?.code;

  if (smartFormat) {
    params.set('smart_format', 'true');
  } else {
    params.set('smart_format', 'false');
    params.set('numerals', 'false');
  }

  params.set('diarize_model', 'latest');

  if (language?.detectLanguage) {
    params.set('detect_language', 'true');
  } else if (deepgramLanguage) {
    params.set('language', deepgramLanguage);
  }

  return params;
}

async function requestWithDiarizationFallback({ apiKey, filePath, mimeType, params, signal }) {
  let response;
  let responseBody;

  ({ response, responseBody } = await requestTranscription({
    apiKey,
    filePath,
    mimeType,
    params,
    signal,
  }));

  if (!response.ok && isDiarizationError(responseBody)) {
    params.delete('diarize_model');
    ({ response, responseBody } = await requestTranscription({
      apiKey,
      filePath,
      mimeType,
      params,
      signal,
    }));
  }

  return { response, responseBody };
}

function getDetectedLanguage(responseBody) {
  const channel = responseBody?.results?.channels?.[0] || {};
  const alternative = getPrimaryAlternative(responseBody);
  const detectedLanguage = channel.detected_language || alternative.detected_language || null;
  const languageConfidence = channel.language_confidence || alternative.language_confidence || null;

  return {
    language: detectedLanguage,
    confidence: languageConfidence,
  };
}

export async function transcribeWithDeepgram({ filePath, mimeType, language, signal }) {
  const apiKey = getApiKey();
  let model = getModel(language);
  let params = buildDeepgramParams({ model, language });
  let response;
  let responseBody;

  try {
    ({ response, responseBody } = await requestWithDiarizationFallback({
      apiKey,
      filePath,
      mimeType,
      params,
      signal,
    }));
  } catch (error) {
    if (signal?.aborted || error?.name === 'AbortError') {
      throw new AppError('Transcription was cancelled.', 499);
    }

    throw error;
  }

  if (!response.ok) {
    const message =
      responseBody.err_msg ||
      responseBody.message ||
      `Deepgram transcription request failed with status ${response.status}.`;

    throw new AppError(message, response.status || 502, {
      provider: 'Deepgram',
      model,
    });
  }

  const rawTranscript = getTranscript(responseBody);
  const mapSpeaker = createSpeakerMapper();
  const segments = getTranscriptSegments(responseBody, mapSpeaker);
  const words = getWords(responseBody, mapSpeaker);
  const sentences = getSentences(responseBody, segments);
  const alternative = getPrimaryAlternative(responseBody);
  const detectedLanguage = getDetectedLanguage(responseBody);
  const detectedLanguageConfig = resolveDetectedLanguage(detectedLanguage.language);
  const transcriptConfidence = Number.isFinite(Number(alternative.confidence))
    ? Number(alternative.confidence)
    : getConfidence(words.map((word) => word.confidence));
  const uncertainWordCount = getUncertainWordCount(words);

  if (!rawTranscript.trim() && words.length === 0) {
    throw new AppError('No speech was detected. Try a recording with clearer audio.', 422);
  }

  return {
    text: formatSegmentTranscript(segments, rawTranscript),
    rawText: rawTranscript,
    segments,
    sentences,
    words,
    confidence: {
      transcript: transcriptConfidence,
      wordCount: words.length,
      uncertainWordCount,
      lowConfidenceThreshold,
    },
    detectedLanguage,
    usage: null,
    model,
    provider: 'Deepgram',
    metadata: responseBody.metadata || null,
    detectionPass: language?.detectLanguage
      ? {
          model,
          detectedLanguage: detectedLanguage.language,
          confidence: detectedLanguage.confidence,
          resolvedLanguage: detectedLanguageConfig?.label || null,
        }
      : null,
    request: {
      parameters: Object.fromEntries(params.entries()),
    },
  };
}
