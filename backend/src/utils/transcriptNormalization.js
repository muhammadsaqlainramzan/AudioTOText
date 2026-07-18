import { transliteratePunjabiToShahmukhi } from './shahmukhi.js';

const devanagariToGurmukhiPairs = [
  ['\u0915\u093c', '\u0a15\u0a3c'],
  ['\u0916\u093c', '\u0a59'],
  ['\u0917\u093c', '\u0a5a'],
  ['\u091c\u093c', '\u0a5b'],
  ['\u0921\u093c', '\u0a5c'],
  ['\u0922\u093c', '\u0a5c\u0a4d\u0a39'],
  ['\u092b\u093c', '\u0a5e'],
  ['\u0915', '\u0a15'],
  ['\u0916', '\u0a16'],
  ['\u0917', '\u0a17'],
  ['\u0918', '\u0a18'],
  ['\u0919', '\u0a19'],
  ['\u091a', '\u0a1a'],
  ['\u091b', '\u0a1b'],
  ['\u091c', '\u0a1c'],
  ['\u091d', '\u0a1d'],
  ['\u091e', '\u0a1e'],
  ['\u091f', '\u0a1f'],
  ['\u0920', '\u0a20'],
  ['\u0921', '\u0a21'],
  ['\u0922', '\u0a22'],
  ['\u0923', '\u0a23'],
  ['\u0924', '\u0a24'],
  ['\u0925', '\u0a25'],
  ['\u0926', '\u0a26'],
  ['\u0927', '\u0a27'],
  ['\u0928', '\u0a28'],
  ['\u092a', '\u0a2a'],
  ['\u092b', '\u0a2b'],
  ['\u092c', '\u0a2c'],
  ['\u092d', '\u0a2d'],
  ['\u092e', '\u0a2e'],
  ['\u092f', '\u0a2f'],
  ['\u0930', '\u0a30'],
  ['\u0932', '\u0a32'],
  ['\u0935', '\u0a35'],
  ['\u0936', '\u0a36'],
  ['\u0937', '\u0a36'],
  ['\u0938', '\u0a38'],
  ['\u0939', '\u0a39'],
  ['\u0905', '\u0a05'],
  ['\u0906', '\u0a06'],
  ['\u0907', '\u0a07'],
  ['\u0908', '\u0a08'],
  ['\u0909', '\u0a09'],
  ['\u090a', '\u0a0a'],
  ['\u090f', '\u0a0f'],
  ['\u0910', '\u0a10'],
  ['\u0913', '\u0a13'],
  ['\u0914', '\u0a14'],
  ['\u093e', '\u0a3e'],
  ['\u093f', '\u0a3f'],
  ['\u0940', '\u0a40'],
  ['\u0941', '\u0a41'],
  ['\u0942', '\u0a42'],
  ['\u0947', '\u0a47'],
  ['\u0948', '\u0a48'],
  ['\u094b', '\u0a4b'],
  ['\u094c', '\u0a4c'],
  ['\u0902', '\u0a70'],
  ['\u0901', '\u0a02'],
  ['\u094d', '\u0a4d'],
  ['\u093c', '\u0a3c'],
  ['\u0964', '\u0964'],
  ['\u0965', '\u0964'],
];

const devanagariPattern = /[\u0900-\u097F]/;
const gurmukhiWordFixes = [
  [/\u0a39\u0a1c\u0a3e\u0a30/g, '\u0a39\u0a5b\u0a3e\u0a30'],
  [/\u0a1c\u0a30\u0a42\u0a30/g, '\u0a5b\u0a30\u0a42\u0a30'],
  [/\u0a1c\u0a3f\u0a06\u0a26\u0a3e/g, '\u0a5b\u0a3f\u0a06\u0a26\u0a3e'],
];

function transliteratePunjabiToGurmukhi(text = '') {
  const source = String(text || '');

  if (!devanagariPattern.test(source)) {
    return source;
  }

  const converted = devanagariToGurmukhiPairs.reduce(
    (current, [sourceText, replacement]) => current.replaceAll(sourceText, replacement),
    source,
  );

  return gurmukhiWordFixes.reduce((current, [pattern, replacement]) => current.replace(pattern, replacement), converted);
}

function normalizeTextForLanguage(text, language) {
  if (language?.outputScript === 'shahmukhi') {
    return transliteratePunjabiToShahmukhi(text);
  }

  if (language?.outputScript === 'gurmukhi') {
    return transliteratePunjabiToGurmukhi(text);
  }

  return text;
}

export function normalizeTranscriptForLanguage(transcription, language) {
  const text = normalizeTextForLanguage(transcription.text || '', language);
  const rawText = transcription.rawText || transcription.text || '';
  const segments = Array.isArray(transcription.segments)
    ? transcription.segments.map((segment) => ({
        ...segment,
        transcript: normalizeTextForLanguage(segment.transcript || '', language),
      }))
    : transcription.segments;

  return {
    ...transcription,
    text,
    rawText,
    segments,
  };
}

export { transliteratePunjabiToGurmukhi };
