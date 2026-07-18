import AppError from '../utils/AppError.js';
import { hasOpenAIApiKey, getOpenAIClient } from './openaiClient.js';
import { normalizeTranscriptForLanguage } from '../utils/transcriptNormalization.js';

const correctionModel = process.env.OPENAI_CORRECTION_MODEL || 'gpt-4o-mini';
const missingCorrectionApiKeyCode = 'CORRECTION_API_KEY_MISSING';
export const correctionDisclaimer = 'AI may make mistakes. Please review the transcript before using it.';

function getLanguageInstruction(language) {
  if (language?.correctionLanguage) {
    return language.correctionLanguage;
  }

  if (language?.label && !language.detectLanguage) {
    return language.label;
  }

  return 'the detected source language';
}

function getScriptInstruction(language) {
  if (language?.outputScript === 'shahmukhi') {
    return 'Use Punjabi Shahmukhi script only.';
  }

  if (language?.outputScript === 'gurmukhi') {
    return 'Use Punjabi Gurmukhi script only.';
  }

  return 'Keep the same language and writing system as the input.';
}

function normalizeSegments(segments = []) {
  if (!Array.isArray(segments)) return [];

  return segments.map((segment, index) => ({
    index,
    speakerLabel: segment.speakerLabel || null,
    start: segment.start ?? null,
    end: segment.end ?? null,
    transcript: segment.transcript || '',
  }));
}

function buildCorrectionPrompt({ transcript, segments, language }) {
  return JSON.stringify({
    language: getLanguageInstruction(language),
    scriptInstruction: getScriptInstruction(language),
    transcript,
    segments: normalizeSegments(segments),
  });
}

function parseCorrectionResponse(content) {
  try {
    const parsed = JSON.parse(content);

    return {
      correctedTranscript: typeof parsed.correctedTranscript === 'string' ? parsed.correctedTranscript : '',
      correctedSegments: Array.isArray(parsed.correctedSegments) ? parsed.correctedSegments : [],
    };
  } catch {
    throw new AppError('AI correction returned an invalid response.', 502);
  }
}

function mergeCorrectedSegments(rawSegments, correctedSegments) {
  if (!Array.isArray(rawSegments) || rawSegments.length === 0) return [];

  return rawSegments.map((segment, index) => {
    const correctedSegment = correctedSegments.find((item) => Number(item.index) === index) || correctedSegments[index];

    return {
      ...segment,
      transcript: typeof correctedSegment?.transcript === 'string' && correctedSegment.transcript.trim()
        ? correctedSegment.transcript.trim()
        : segment.transcript,
    };
  });
}

function formatSegmentTranscript(segments, fallbackTranscript) {
  if (!Array.isArray(segments) || segments.length === 0) {
    return fallbackTranscript;
  }

  return segments
    .map((segment) => `${segment.speakerLabel || 'Speaker'}: ${segment.transcript}`)
    .join('\n\n');
}

function buildFallbackCorrection({ rawTranscript, rawSegments, language, reason, code = null }) {
  const fallbackTranscript = formatSegmentTranscript(rawSegments, rawTranscript);
  const normalized = normalizeTranscriptForLanguage(
    {
      text: fallbackTranscript,
      rawText: rawTranscript,
      segments: rawSegments,
    },
    language,
  );

  return {
    correctedTranscript: normalized.text || rawTranscript,
    correctedSegments: normalized.segments || rawSegments,
    correction: {
      applied: false,
      provider: 'OpenAI',
      model: correctionModel,
      disclaimer: correctionDisclaimer,
      code,
      error: reason,
    },
  };
}

export async function improveTranscriptText({ rawTranscript, rawSegments = [], language, signal }) {
  const transcript = String(rawTranscript || '').trim();

  if (!transcript) {
    return buildFallbackCorrection({
      rawTranscript: '',
      rawSegments,
      language,
      reason: 'No transcript text was available to improve.',
    });
  }

  if (!hasOpenAIApiKey()) {
    return buildFallbackCorrection({
      rawTranscript: transcript,
      rawSegments,
      language,
      code: missingCorrectionApiKeyCode,
      reason:
        'AI transcript improvement is not configured. Deepgram transcription still works; add OPENAI_API_KEY only if you want AI cleanup.',
    });
  }

  const client = getOpenAIClient();

  try {
    const completion = await client.chat.completions.create(
      {
        model: correctionModel,
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: [
              'You are a conservative transcript editor.',
              'Correct spelling, grammar, punctuation, and duplicated ASR words.',
              'Preserve the original meaning. Do not translate.',
              'Preserve mixed-language conversations and keep each phrase in its original language.',
              'Preserve names, numbers, dates, addresses, phone numbers, brands, and technical terms exactly unless clearly misspelled.',
              'Fix obvious speech-recognition mistakes only when confidence is high.',
              'If a word is uncertain, leave it unchanged.',
              'Return only valid JSON with keys correctedTranscript and correctedSegments.',
              'correctedSegments must preserve the same indexes and order as the input segments.',
            ].join(' '),
          },
          {
            role: 'user',
            content: buildCorrectionPrompt({
              transcript,
              segments: rawSegments,
              language,
            }),
          },
        ],
      },
      { signal },
      );
    const content = completion.choices?.[0]?.message?.content || '';
    const parsed = parseCorrectionResponse(content);
    const mergedSegments = mergeCorrectedSegments(rawSegments, parsed.correctedSegments);
    const correctedText = mergedSegments.length
      ? formatSegmentTranscript(mergedSegments, parsed.correctedTranscript.trim() || transcript)
      : parsed.correctedTranscript.trim();
    const normalized = normalizeTranscriptForLanguage(
      {
        text: correctedText,
        rawText: transcript,
        segments: mergedSegments,
      },
      language,
    );

    return {
      correctedTranscript: normalized.text || correctedText,
      correctedSegments: normalized.segments || mergedSegments,
      correction: {
        applied: true,
        provider: 'OpenAI',
        model: correctionModel,
        disclaimer: correctionDisclaimer,
        code: null,
        error: null,
      },
    };
  } catch (error) {
    if (signal?.aborted || error?.name === 'AbortError') {
      throw new AppError('Transcript improvement was cancelled.', 499);
    }

    return buildFallbackCorrection({
      rawTranscript: transcript,
      rawSegments,
      language,
      reason: error?.error?.message || error?.message || 'AI correction failed.',
    });
  }
}
