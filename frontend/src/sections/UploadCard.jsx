import { useCallback, useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import {
  FiCheckCircle,
  FiChevronDown,
  FiDownload,
  FiEdit3,
  FiGlobe,
  FiMessageSquare,
  FiPause,
  FiPlay,
  FiRefreshCw,
  FiSend,
  FiUploadCloud,
  FiVideo,
  FiVolume2,
  FiVolumeX,
  FiXCircle,
} from 'react-icons/fi';
import {
  MAX_AUDIO_DURATION_SECONDS,
  MAX_UPLOAD_SIZE_BYTES,
  MAX_UPLOAD_SIZE_LABEL,
  MAX_VIDEO_DURATION_SECONDS,
} from '../../../shared/uploadLimits.js';
import { useApp } from '../context/AppContext.jsx';
import { askWordMeaning, exportTranscript, uploadAudioFile } from '../lib/api.js';
import {
  clearPersistedTranscription,
  getPersistedTranscription,
  savePersistedTranscription,
} from '../lib/persistedTranscription.js';

const audioFormats = ['MP3', 'WAV', 'M4A', 'AAC', 'FLAC', 'OGG'];
const videoFormats = ['MP4', 'MOV', 'AVI', 'MKV', 'WEBM'];
const supportedFormats = [...audioFormats, ...videoFormats];
const supportedTypes = [
  '',
  'application/octet-stream',
  'application/ogg',
  'application/mp4',
  'application/x-matroska',
  'audio/aac',
  'audio/flac',
  'audio/m4a',
  'audio/mp3',
  'audio/mp4',
  'audio/mpeg',
  'audio/ogg',
  'audio/wav',
  'audio/wave',
  'audio/webm',
  'audio/x-aac',
  'audio/x-flac',
  'audio/x-mp3',
  'audio/x-mpeg',
  'audio/x-m4a',
  'audio/x-ogg',
  'audio/x-wav',
  'audio/vnd.wave',
  'video/avi',
  'video/msvideo',
  'video/mp4',
  'video/ogg',
  'video/quicktime',
  'video/webm',
  'video/x-m4v',
  'video/x-matroska',
  'video/x-msvideo',
];
const formatHint = 'MP3, WAV, M4A, AAC, FLAC, OGG, MP4, MOV, AVI, MKV or WEBM';

function getGoogleAuthUrl() {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
  return import.meta.env.VITE_GOOGLE_AUTH_URL || `${apiBaseUrl.replace(/\/+$|\/$/, '')}/auth/google`;
}
const validationMessages = {
  maxFile: `Maximum file size is ${MAX_UPLOAD_SIZE_LABEL}.`,
  maxAudioDuration: 'Maximum audio duration is 30 minutes.',
  maxVideoDuration: 'Maximum video duration is 15 minutes.',
  unsupported: 'Unsupported file format.',
};
const exportFormats = ['TXT', 'DOCX', 'PDF', 'SRT', 'VTT', 'JSON'];
const englishStopWords = new Set([
  'about',
  'after',
  'again',
  'also',
  'and',
  'because',
  'been',
  'before',
  'being',
  'from',
  'have',
  'into',
  'that',
  'their',
  'there',
  'these',
  'they',
  'this',
  'those',
  'with',
  'would',
  'your',
]);
const meaningIntentTokens = [
  'meaning',
  'mean',
  'means',
  'matlab',
  'definition',
  'define',
  'significado',
  'significa',
  'signification',
  'sens',
  'bedeutung',
  'significato',
  'anlam',
  'значение',
  'مطلب',
  'معنی',
  'معنى',
  'अर्थ',
  'मतलब',
  'মানে',
  'அர்த்தம்',
  'అర్థం',
  'અર્થ',
  'अर्थ',
];
const assistantLanguageNames = [
  'english',
  'urdu',
  'punjabi',
  'hindi',
  'arabic',
  'chinese',
  'japanese',
  'korean',
  'korian',
  'french',
  'francais',
  'german',
  'deutsch',
  'spanish',
  'espanol',
  'italian',
  'italiano',
  'portuguese',
  'portugues',
  'turkish',
  'turkce',
  'russian',
  'pyccknn',
  'bengali',
  'tamil',
  'telugu',
  'gujarati',
  'marathi',
  'indonesian',
  'indonesia',
  'malay',
  'bahasa melayu',
];
const assistantLanguagePattern = assistantLanguageNames
  .map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  .join('|');
const knownMeanings = {
  actor: {
    partOfSpeech: 'Noun',
    definition: 'An actor is a person who performs in movies, television shows, or plays.',
    contextual: 'the people who are performing or acting, usually in movies, television shows, or plays.',
    example: 'The actors often speak fast.',
    urduExample: 'فلم کے اداکار اکثر تیزی سے بولتے ہیں۔',
    translations: {
      Urdu: 'اداکار',
      'Punjabi (Shahmukhi)': 'اداکار',
      'Punjabi (Gurmukhi)': 'ਅਦਾਕਾਰ',
      Hindi: 'अभिनेता / कलाकार',
      Arabic: 'ممثل',
      French: 'acteur',
      German: 'Schauspieler',
      Spanish: 'actor',
      Turkish: 'oyuncu',
    },
  },
  actress: {
    partOfSpeech: 'Noun',
    definition: 'An actress is a female actor who performs in movies, television shows, or plays.',
    contextual: 'a female performer in a movie, television show, or play.',
    example: 'The actress performed the scene beautifully.',
    translations: {
      Urdu: 'اداکارہ',
      Hindi: 'अभिनेत्री',
      Arabic: 'ممثلة',
      French: 'actrice',
      German: 'Schauspielerin',
      Spanish: 'actriz',
      Turkish: 'kadın oyuncu',
    },
  },
  difficult: {
    partOfSpeech: 'Adjective',
    definition: 'Hard to do, understand, or deal with.',
    contextual: 'something that is hard to understand, follow, or manage.',
    example: 'This exam is difficult.',
    urduExample: 'یہ امتحان مشکل ہے۔',
    transcriptContext: 'that understanding English movies without subtitles is hard.',
    translations: {
      Urdu: 'مشکل',
      'Punjabi (Shahmukhi)': 'اوکھا / مشکل',
      Hindi: 'कठिन / मुश्किल',
      Arabic: 'صعب',
      French: 'difficile',
      German: 'schwierig',
      Spanish: 'difícil',
      Turkish: 'zor',
    },
  },
  exciting: {
    partOfSpeech: 'Adjective',
    definition: 'Making you feel interested, happy, or full of energy.',
    contextual: 'something enjoyable or interesting in the transcript.',
    example: 'Watching movies can be exciting.',
    translations: {
      Urdu: 'دلچسپ / پرجوش',
      'Punjabi (Shahmukhi)': 'دلچسپ / جوش بھرا',
      Hindi: 'रोमांचक',
      Arabic: 'مثير',
      French: 'passionnant',
      German: 'spannend',
      Spanish: 'emocionante',
      Turkish: 'heyecan verici',
    },
  },
  conversation: {
    partOfSpeech: 'Noun',
    definition: 'A talk between two or more people.',
    contextual: 'people speaking with each other in the transcript.',
    example: 'Their conversation was easy to understand.',
    translations: {
      Urdu: 'گفتگو',
      'Punjabi (Shahmukhi)': 'گل بات',
      Hindi: 'बातचीत',
      Arabic: 'محادثة',
      French: 'conversation',
      German: 'Gespräch',
      Spanish: 'conversación',
      Turkish: 'konuşma',
    },
  },
  understand: {
    partOfSpeech: 'Verb',
    definition: 'To know the meaning of something.',
    contextual: 'being able to follow the spoken words or idea.',
    example: 'I can understand the sentence.',
    translations: {
      Urdu: 'سمجھنا',
      'Punjabi (Shahmukhi)': 'سمجھنا',
      Hindi: 'समझना',
      Arabic: 'يفهم',
      French: 'comprendre',
      German: 'verstehen',
      Spanish: 'entender',
      Turkish: 'anlamak',
    },
  },
  subtitle: {
    partOfSpeech: 'Noun',
    definition: 'Words shown on a screen that translate or write what people are saying.',
    contextual: 'written help for understanding speech in a movie or video.',
    example: 'I watched the movie with subtitles.',
    translations: {
      Urdu: 'سب ٹائٹل / ترجمہ',
      'Punjabi (Shahmukhi)': 'سب ٹائٹل',
      Hindi: 'उपशीर्षक',
      Arabic: 'ترجمة مكتوبة',
      French: 'sous-titre',
      German: 'Untertitel',
      Spanish: 'subtítulo',
      Turkish: 'altyazı',
    },
  },
  movie: {
    partOfSpeech: 'Noun',
    definition: 'A movie is a story or event recorded with moving images and sound, usually watched for entertainment.',
    contextual: 'a film or video production being discussed by the speaker.',
    example: 'The movie has several famous actors.',
    translations: {
      Urdu: 'فلم',
      Hindi: 'फ़िल्म',
      Arabic: 'فيلم',
      French: 'film',
      German: 'Film',
      Spanish: 'película',
      Turkish: 'film',
    },
  },
  fast: {
    definition: 'Fast means moving, happening, or speaking quickly.',
    contextual: 'something happening quickly, such as rapid speech.',
    example: 'The actors often speak fast.',
    urduExample: 'اداکار اکثر تیزی سے بولتے ہیں۔',
    translations: {
      Urdu: 'تیز',
      Hindi: 'तेज़',
      Arabic: 'سريع',
      French: 'rapide',
      German: 'schnell',
      Spanish: 'rápido',
      Turkish: 'hızlı',
    },
  },
  speak: {
    definition: 'To speak means to say words aloud or communicate by talking.',
    contextual: 'the act of talking in the recording or transcript.',
    example: 'The actors often speak fast.',
    translations: {
      Urdu: 'بولنا',
      Hindi: 'बोलना',
      Arabic: 'يتكلم',
      French: 'parler',
      German: 'sprechen',
      Spanish: 'hablar',
      Turkish: 'konuşmak',
    },
  },
  often: {
    definition: 'Often means many times or frequently.',
    contextual: 'something that happens many times or is common.',
    example: 'The actors often speak fast.',
    translations: {
      Urdu: 'اکثر',
      Hindi: 'अक्सर',
      Arabic: 'غالبًا',
      French: 'souvent',
      German: 'oft',
      Spanish: 'a menudo',
      Turkish: 'sık sık',
    },
  },
  moment: {
    definition: 'A very short period of time, or a particular point in time.',
    contextual: 'it refers to a brief point or short period in the situation being discussed.',
    example: 'Please wait a moment while I check the file.',
    translations: {
      Urdu: 'لمحہ',
      'Punjabi (Shahmukhi)': 'لمحہ',
      'Punjabi (Gurmukhi)': 'ਪਲ',
      Hindi: 'पल / क्षण',
      Arabic: 'لحظة',
      Bengali: 'মুহূর্ত',
      Chinese: '时刻 / 瞬间',
      French: 'moment',
      German: 'Moment / Augenblick',
      Spanish: 'momento',
      Italian: 'momento',
      Japanese: '瞬間',
      Korean: '순간',
      Portuguese: 'momento',
      Russian: 'момент',
      Turkish: 'an',
    },
  },
  audio: {
    definition: 'Sound, especially recorded sound that can be played or processed.',
    contextual: 'it refers to the sound file or recording being transcribed.',
    example: 'The audio is clear enough for transcription.',
    translations: {
      Urdu: 'آڈیو',
      Hindi: 'ऑडियो',
      Arabic: 'صوت',
      French: 'audio',
      German: 'Audio',
      Spanish: 'audio',
      Turkish: 'ses',
    },
  },
  text: {
    definition: 'Written or typed words.',
    contextual: 'it refers to the written transcript created from speech.',
    example: 'The meeting audio was converted into text.',
    translations: {
      Urdu: 'متن',
      Hindi: 'पाठ',
      Arabic: 'نص',
      French: 'texte',
      German: 'Text',
      Spanish: 'texto',
      Turkish: 'metin',
    },
  },
  transcript: {
    definition: 'A written version of spoken words.',
    contextual: 'it refers to the written output generated from the uploaded audio or video.',
    example: 'The transcript includes speaker labels and timestamps.',
    translations: {
      Urdu: 'تحریری نقل',
      Hindi: 'प्रतिलेख',
      Arabic: 'نص مفرغ',
      French: 'transcription',
      German: 'Transkript',
      Spanish: 'transcripción',
      Turkish: 'transkript',
    },
  },
  transcription: {
    definition: 'The process of turning speech or audio into written text.',
    contextual: 'it refers to converting the uploaded recording into readable text.',
    example: 'AI transcription saved hours of manual typing.',
  },
  speaker: {
    definition: 'A person who is talking.',
    contextual: 'it refers to one of the voices detected in the transcript.',
    example: 'Speaker 1 asked the first question.',
  },
  language: {
    definition: 'A system of words used by people to communicate.',
    contextual: 'it refers to the spoken language selected or detected for transcription.',
    example: 'Choose Urdu as the transcription language.',
  },
  sentence: {
    definition: 'A group of words that expresses a complete thought.',
    contextual: 'it refers to one timed line or statement in the transcript.',
    example: 'The sentence starts at seven seconds.',
  },
  word: {
    definition: 'A single unit of language with meaning.',
    contextual: 'it refers to one recognized term in the transcript.',
    example: 'The highlighted word is currently being spoken.',
  },
  phrase: {
    definition: 'A small group of words that works together as a unit.',
    contextual: 'it refers to a short expression from the transcript.',
    example: 'The phrase explains what the speaker wanted.',
  },
  context: {
    definition: 'The surrounding words or situation that help explain meaning.',
    contextual: 'it refers to the nearby transcript sentence where the word appears.',
    example: 'The context makes the meaning clearer.',
  },
  summary: {
    definition: 'A short version that gives the main ideas.',
    contextual: 'it refers to the main points of the transcript in brief form.',
    example: 'The summary explains the meeting in three sentences.',
  },
  topic: {
    definition: 'The subject being discussed.',
    contextual: 'it refers to an important theme in the transcript.',
    example: 'The main topic was project planning.',
  },
  action: {
    definition: 'Something that someone does or needs to do.',
    contextual: 'it refers to a task or next step mentioned in the transcript.',
    example: 'The action item is to send the report.',
  },
  upload: {
    definition: 'To send a file from your device to an app or server.',
    contextual: 'it refers to adding your audio or video file for transcription.',
    example: 'Upload the recording before starting transcription.',
  },
  download: {
    definition: 'To save a file from an app or server onto your device.',
    contextual: 'it refers to saving the transcript as TXT, PDF, DOCX, SRT, VTT, or JSON.',
    example: 'Download the transcript after reviewing it.',
  },
  file: {
    definition: 'A saved item on a computer, such as an audio, video, or document.',
    contextual: 'it refers to the uploaded media being transcribed.',
    example: 'Choose a different file if the first one is incorrect.',
  },
  video: {
    definition: 'A recording that includes moving images, usually with sound.',
    contextual: 'it refers to an uploaded recording whose audio is transcribed.',
    example: 'The video contains several speakers.',
  },
  meeting: {
    definition: 'A planned discussion between people.',
    contextual: 'it refers to a conversation or discussion captured in the recording.',
    example: 'The meeting started at noon.',
  },
  interview: {
    definition: 'A conversation where one person asks questions and another answers.',
    contextual: 'it refers to a Q&A style recording in the transcript.',
    example: 'The interview was transcribed with speaker labels.',
  },
  podcast: {
    definition: 'An audio program or episode, often published online.',
    contextual: 'it refers to recorded spoken content that can be transcribed.',
    example: 'The podcast transcript is useful for searching quotes.',
  },
  accuracy: {
    definition: 'How correct or exact something is.',
    contextual: 'it refers to how closely the transcript matches the spoken audio.',
    example: 'Clear audio improves transcription accuracy.',
  },
  confidence: {
    definition: 'A measure of how sure the system is about a result.',
    contextual: 'it refers to how certain the transcription model is about words or lines.',
    example: 'Low-confidence words should be reviewed.',
  },
  volume: {
    definition: 'How loud or quiet sound is.',
    contextual: 'it refers to playback loudness for the uploaded audio.',
    example: 'Increase the volume to hear the speaker clearly.',
  },
  play: {
    definition: 'To start audio or video playback.',
    contextual: 'it refers to listening to the uploaded recording.',
    example: 'Press play to follow the transcript highlight.',
  },
  pause: {
    definition: 'To temporarily stop playback.',
    contextual: 'it refers to stopping the audio while keeping your place.',
    example: 'Pause the recording before editing the transcript.',
  },
  question: {
    definition: 'A sentence or phrase used to ask for information.',
    contextual: 'it refers to something you ask the transcript assistant.',
    example: 'Ask a question about any speaker or topic.',
  },
  answer: {
    definition: 'A response to a question.',
    contextual: 'it refers to the assistant reply based on the transcript.',
    example: 'The answer includes transcript context.',
  },
  edit: {
    definition: 'To change or improve text.',
    contextual: 'it refers to correcting the transcript manually.',
    example: 'Edit the transcript before downloading it.',
  },
  review: {
    definition: 'To check something carefully.',
    contextual: 'it refers to reading the transcript and fixing uncertain words.',
    example: 'Please review the transcript before using it.',
  },
  hello: {
    definition: 'A greeting used when meeting someone or starting a conversation.',
    contextual: 'it is used as a friendly opening.',
    example: 'Hello everyone, welcome to the meeting.',
  },
  welcome: {
    definition: 'A polite greeting used to receive someone or start an event.',
    contextual: 'it is used to greet listeners or participants.',
    example: "Welcome to today's meeting.",
  },
  today: {
    definition: 'The present day.',
    contextual: 'it refers to the day being discussed in the recording.',
    example: 'Today we will review the plan.',
  },
  important: {
    definition: 'Having great value, meaning, or effect.',
    contextual: 'it marks something the speaker wants listeners to notice.',
    example: 'This is an important point.',
  },
  clear: {
    definition: 'Easy to understand, hear, or see.',
    contextual: 'it may refer to audio quality or an understandable statement.',
    example: 'The speaker’s voice is clear.',
  },
  minute: {
    definition: 'A unit of time equal to sixty seconds.',
    contextual: 'it refers to a short amount of time in the recording or workflow.',
    example: 'The file finished in one minute.',
  },
  hour: {
    definition: 'A unit of time equal to sixty minutes.',
    contextual: 'it refers to a longer period of time.',
    example: 'The interview lasted one hour.',
  },
};

function formatFileSize(size) {
  if (!size) return '';
  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
}

function toSeconds(value) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) && numericValue >= 0 ? numericValue : null;
}

function formatPlaybackTime(value) {
  const seconds = Math.max(0, Math.floor(Number(value) || 0));
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`;
}

function formatPercent(value) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return null;
  return `${Math.round(numericValue * 100)}%`;
}

function getDownloadFileName(response, fallbackName) {
  const disposition = response.headers?.['content-disposition'];
  const match = disposition?.match(/filename="?([^"]+)"?/i);
  return match?.[1] || fallbackName;
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function formatEditableTranscript(segments = [], fallback = '') {
  if (!Array.isArray(segments) || segments.length === 0) {
    return fallback || '';
  }

  return segments
    .filter((segment) => segment?.transcript)
    .map((segment) => `${segment.speakerLabel || 'Speaker'}: ${segment.transcript}`)
    .join('\n\n') || fallback || '';
}

function parseTranscriptLine(line = '', index = 0) {
  const match = line.match(/^\s*([^:\n]{2,40}):\s*(.+)$/);

  if (!match) {
    return {
      speakerLabel: index === 0 ? 'Speaker 1' : 'Speaker',
      text: line.trim(),
    };
  }

  return {
    speakerLabel: match[1].trim(),
    text: match[2].trim(),
  };
}

function buildTranscriptRows({ segments = [], sentences = [], transcript = '' }) {
  const timedSegments = Array.isArray(segments)
    ? segments
        .filter((segment) => segment?.transcript)
        .map((segment, index) => ({
          id: `segment-${index}`,
          speakerLabel: segment.speakerLabel || `Speaker ${segment.speaker || index + 1}`,
          start: toSeconds(segment.start),
          end: toSeconds(segment.end),
          text: segment.transcript,
          words: Array.isArray(segment.words) ? segment.words : [],
        }))
    : [];

  if (timedSegments.length) {
    return timedSegments.map((row, index, rows) => ({
      ...row,
      end: row.end ?? rows[index + 1]?.start ?? (row.start !== null ? row.start + 4 : null),
    }));
  }

  const sentenceRows = Array.isArray(sentences)
    ? sentences
        .filter((sentence) => sentence?.text)
        .map((sentence, index) => ({
          id: `sentence-${index}`,
          speakerLabel: sentence.speakerLabel || `Speaker ${sentence.speaker || 1}`,
          start: toSeconds(sentence.start),
          end: toSeconds(sentence.end),
          text: sentence.text,
          words: [],
        }))
    : [];

  if (sentenceRows.length) {
    return sentenceRows;
  }

  return String(transcript || '')
    .split(/\n{2,}|\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const parsed = parseTranscriptLine(line, index);

      return {
        id: `line-${index}`,
        speakerLabel: parsed.speakerLabel,
        start: null,
        end: null,
        text: parsed.text,
        words: [],
      };
    });
}

function getActiveTranscriptIndex(rows = [], currentTime = 0) {
  return rows.findIndex((row) => {
    if (row.start === null) return false;

    const end = row.end ?? row.start + 4;
    return currentTime >= row.start && currentTime < end;
  });
}

function getWordIsActive(word = {}, currentTime = 0) {
  const start = toSeconds(word.start);
  const end = toSeconds(word.end);

  if (start === null || end === null) return false;

  return currentTime >= start && currentTime < end;
}

function getTranscriptText(rows = []) {
  return rows.map((row) => row.text).join(' ').replace(/\s+/g, ' ').trim();
}

function buildSummary(rows = []) {
  const meaningfulRows = rows.filter((row) => row.text);

  if (!meaningfulRows.length) {
    return 'No transcript text is available yet.';
  }

  return meaningfulRows
    .slice(0, 4)
    .map((row) => row.text)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildSpeakerInsight(rows = []) {
  const speakers = rows.reduce((summary, row) => {
    const label = row.speakerLabel || 'Speaker';
    const current = summary.get(label) || { lines: 0, seconds: 0 };
    const start = toSeconds(row.start);
    const end = toSeconds(row.end);

    summary.set(label, {
      lines: current.lines + 1,
      seconds: current.seconds + (start !== null && end !== null ? Math.max(0, end - start) : 0),
    });

    return summary;
  }, new Map());

  if (!speakers.size) {
    return 'No speaker labels were detected in this transcript.';
  }

  return Array.from(speakers.entries())
    .map(([label, details]) => {
      const duration = details.seconds ? `, about ${formatPlaybackTime(details.seconds)}` : '';
      return `${label}: ${details.lines} transcript line${details.lines === 1 ? '' : 's'}${duration}`;
    })
    .join('\n');
}

function buildKeyTopics(rows = []) {
  const words = getTranscriptText(rows)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 3 && !englishStopWords.has(word));
  const counts = words.reduce((items, word) => {
    items.set(word, (items.get(word) || 0) + 1);
    return items;
  }, new Map());
  const topics = Array.from(counts.entries())
    .sort((first, second) => second[1] - first[1])
    .slice(0, 8)
    .map(([word]) => word);

  return topics.length ? topics.join(', ') : 'No clear repeated topics were detected.';
}

function buildActionItems(rows = []) {
  const actionPattern = /\b(need|needs|should|must|will|please|todo|action|follow|send|call|review|complete|schedule|prepare)\b/i;
  const actions = rows
    .filter((row) => actionPattern.test(row.text))
    .slice(0, 6)
    .map((row) => `- ${row.text}`);

  return actions.length ? actions.join('\n') : 'No clear action items were detected in this transcript.';
}

function cleanMeaningTerm(value = '') {
  return value
    .replace(/[?!.,"'“”‘’]/g, ' ')
    .replace(/\b(the|this|that|word|phrase|text|transcript|meaning|mean|means|of|in|from|ka|matlab)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getMeaningTerm(prompt = '') {
  const patterns = [
    /meaning\s+of\s+(.+)/i,
    /what\s+(?:is|does)\s+(.+?)\s+mean/i,
    /(.+?)\s+(?:ka\s+matlab|means?)\b/i,
  ];

  for (const pattern of patterns) {
    const match = prompt.match(pattern);
    const term = cleanMeaningTerm(match?.[1] || '');

    if (term) return term;
  }

  return '';
}

function getMeaningContext(term = '', rows = []) {
  const normalizedTerm = term.toLowerCase();

  if (!normalizedTerm) return [];

  return rows
    .filter((row) => row.text.toLowerCase().includes(normalizedTerm))
    .slice(0, 3);
}

function buildMeaningReply(prompt = '', rows = []) {
  const term = getMeaningTerm(prompt);

  if (!term) {
    return 'Please type the exact word or phrase you want explained, for example: "meaning of transcript".';
  }

  const contextRows = getMeaningContext(term, rows);
  const context = contextRows
    .map((row) => {
      const time = row.start !== null ? ` at ${formatPlaybackTime(row.start)}` : '';
      return `${row.speakerLabel || 'Speaker'}${time}: ${row.text}`;
    })
    .join('\n');

  if (!contextRows.length) {
    return [
      `I could not find "${term}" in this transcript.`,
      'Check the spelling or copy the exact word from the transcript row and ask again.',
    ].join('\n');
  }

  return [
    `Word or phrase: "${term}"`,
    'Transcript context:',
    context,
    'Meaning help: this word/phrase should be understood from the transcript context above.',
  ].join('\n');
}

function normalizeMeaningLookupKey(value = '') {
  return String(value)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeRegExp(value = '') {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getMeaningLookupVariants(term = '') {
  const key = normalizeMeaningLookupKey(term);
  const variants = new Set();

  if (!key) return [];

  variants.add(key);

  if (key.endsWith('ies') && key.length > 3) {
    variants.add(`${key.slice(0, -3)}y`);
  }

  if (key.endsWith('es') && key.length > 3) {
    variants.add(key.slice(0, -2));
  }

  if (key.endsWith('s') && key.length > 2) {
    variants.add(key.slice(0, -1));
  } else {
    variants.add(`${key}s`);
    variants.add(`${key}es`);

    if (key.endsWith('y') && key.length > 2) {
      variants.add(`${key.slice(0, -1)}ies`);
    }
  }

  return Array.from(variants).filter(Boolean);
}

function isReadableEnglishTerm(term = '') {
  return /^[a-z][a-z\s-]{1,60}$/i.test(String(term).trim());
}

function inferPartOfSpeech(term = '') {
  const key = normalizeMeaningLookupKey(term);

  if (/\b(able|ible|al|ful|ic|ive|less|ous|y)$/.test(key)) return 'Adjective';
  if (/\b(ing|ed|en|ify|ise|ize)$/.test(key)) return 'Verb';
  if (/\b(ly)$/.test(key)) return 'Adverb';
  if (/\b(tion|sion|ment|ness|ity|er|or|ist|ian)$/.test(key)) return 'Noun';

  return 'Common word';
}

function cleanMeaningLookupTerm(value = '') {
  return String(value)
    .replace(/[?!.,"'`]/g, ' ')
    .replace(/[“”‘’]/g, ' ')
    .replace(/\b(the|this|that|word|phrase|text|transcript|meaning|mean|means|define|definition|of|in|from|ka|matlab)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractMeaningLookupTerm(prompt = '') {
  const promptText = String(prompt);
  const quotedTerm = promptText.match(/["'“”‘’]([^"'“”‘’]{1,80})["'“”‘’]/);

  if (quotedTerm?.[1]) {
    return cleanMeaningLookupTerm(quotedTerm[1]);
  }

  const languageSuffix = `(?:\\s+(?:to|in)\\s+(?:${assistantLanguagePattern}))?`;
  const simpleVocabularyPatterns = [
    new RegExp(`translate\\s+(.+?)${languageSuffix}\\??$`, 'i'),
    new RegExp(`what\\s+is\\s+(.+?)${languageSuffix}\\??$`, 'i'),
    new RegExp(`what\\s+does\\s+(.+?)\\s+mean${languageSuffix}\\??$`, 'i'),
    new RegExp(`(.+?)\\s+(?:to|in)\\s+(?:${assistantLanguagePattern})\\??$`, 'i'),
    /what\s+is\s+(.+)/i,
  ];

  for (const pattern of simpleVocabularyPatterns) {
    const match = promptText.match(pattern);
    const term = cleanMeaningLookupTerm(match?.[1] || '');

    if (term && term.split(/\s+/).length <= 4) return term;
  }

  const patterns = [
    new RegExp(`define\\s+(.+?)${languageSuffix}\\??$`, 'i'),
    new RegExp(`definition\\s+of\\s+(.+?)${languageSuffix}\\??$`, 'i'),
    new RegExp(`meaning\\s+of\\s+(.+?)${languageSuffix}\\??$`, 'i'),
    new RegExp(`(.+?)\\s+(?:meaning|definition|translation)${languageSuffix}\\??$`, 'i'),
    /what\s+(?:is|does)\s+(.+?)\s+mean/i,
    /(.+?)\s+(?:ka\s+matlab|کا\s+مطلب|ਦਾ\s+ਮਤਲਬ|کا\s+معنی|का\s+मतलब|का\s+अर्थ|means?)\b/i,
  ];

  for (const pattern of patterns) {
    const match = promptText.match(pattern);
    const term = cleanMeaningLookupTerm(match?.[1] || '');

    if (term) return term;
  }

  return '';
}

function getKnownMeaningEntry(term = '') {
  const variants = getMeaningLookupVariants(term);
  const key = variants.find((variant) => knownMeanings[variant]);

  return key ? knownMeanings[key] : null;
}

function getImprovedMeaningContext(term = '', rows = []) {
  const variants = getMeaningLookupVariants(term);

  if (!variants.length) return [];

  return rows
    .filter((row) => {
      const normalizedText = normalizeMeaningLookupKey(row.text);

      return variants.some((variant) => {
        const boundaryPattern = new RegExp(`(^|\\s)${escapeRegExp(variant)}($|\\s)`, 'i');
        return boundaryPattern.test(normalizedText) || normalizedText.includes(variant);
      });
    })
    .slice(0, 3);
}

function getMatchedTranscriptTerm(term = '', text = '') {
  const variants = getMeaningLookupVariants(term).sort((first, second) => second.length - first.length);

  for (const variant of variants) {
    const match = String(text).match(new RegExp(`\\b${escapeRegExp(variant)}\\b`, 'i'));

    if (match?.[0]) return match[0];
  }

  return term;
}

function buildCommonEnglishFallbackEntry(term = '') {
  const key = normalizeMeaningLookupKey(term);

  if (!isReadableEnglishTerm(key)) return null;

  if (/\b(er|or|ist|ian)$/.test(key)) {
    return {
      partOfSpeech: 'Noun',
      definition: `A ${key} is usually a person connected with that role, skill, job, or activity.`,
      contextual: 'a person connected with that role or activity in the sentence.',
      example: `The ${key} is important in this sentence.`,
      translations: {
        Urdu: 'person / role',
        'Punjabi (Shahmukhi)': 'person / role',
        Hindi: 'person / role',
        Arabic: 'person / role',
        French: 'personne / role',
        German: 'Person / Rolle',
        Spanish: 'persona / papel',
        Turkish: 'kisi / rol',
      },
    };
  }

  if (/\b(ing)$/.test(key)) {
    return {
      partOfSpeech: 'Verb',
      definition: `"${term}" usually describes an action or activity that is happening.`,
      contextual: 'an action or activity mentioned in the sentence.',
      example: `${term} can describe something happening now.`,
      translations: {
        Urdu: 'action',
        'Punjabi (Shahmukhi)': 'action',
        Hindi: 'action',
        Arabic: 'action',
        French: 'action',
        German: 'Handlung',
        Spanish: 'accion',
        Turkish: 'eylem',
      },
    };
  }

  return {
    partOfSpeech: inferPartOfSpeech(term),
    definition: `"${term}" is a common English word used in everyday communication.`,
    contextual: 'the word is used with its ordinary English meaning in the transcript sentence.',
    example: `The word "${term}" is used in everyday English.`,
    translations: {
      Urdu: 'common English word',
      'Punjabi (Shahmukhi)': 'common English word',
      Hindi: 'common English word',
      Arabic: 'common English word',
      French: 'mot anglais courant',
      German: 'haufiges englisches Wort',
      Spanish: 'palabra comun en ingles',
      Turkish: 'yaygin Ingilizce kelime',
    },
  };
}
function buildMeaningTranslations(entry) {
  const translations = entry?.translations || {};
  const sections = [
    ['Urdu', translations.Urdu],
    ['Punjabi', translations['Punjabi (Shahmukhi)']],
    ['Hindi', translations.Hindi],
    ['Arabic', translations.Arabic],
    ['French', translations.French],
    ['German', translations.German],
    ['Spanish', translations.Spanish],
    ['Turkish', translations.Turkish],
  ];

  return sections
    .map(([heading, value]) => `${heading}: ${value || 'Not available'}`)
    .join('\n');
}

function buildImprovedMeaningReply(prompt = '', rows = [], options = {}) {
  const term = extractMeaningLookupTerm(prompt);

  if (!term) {
    return 'Please type the exact word or phrase you want explained, for example: "What is the meaning of Moment?"';
  }

  const entry = getKnownMeaningEntry(term) || buildCommonEnglishFallbackEntry(term);
  const contextRows = getImprovedMeaningContext(term, rows);
  const firstContext = contextRows[0] || null;
  const contextLine = firstContext
    ? `${firstContext.speakerLabel || 'Speaker'}${firstContext.start !== null ? ` at ${formatPlaybackTime(firstContext.start)}` : ''}: ${firstContext.text}`
    : '';
  const matchedTerm = firstContext ? getMatchedTranscriptTerm(term, firstContext.text) : term;
  const translations = buildMeaningTranslations(entry);

  if (entry) {
    const lines = [`Word/Phrase: "${term}"`];
    lines.push(`Part of Speech: ${entry.partOfSpeech || inferPartOfSpeech(term)}`);
    lines.push(`Definition: ${entry.definition}`);

    if (translations) {
      lines.push(translations);
    }

    lines.push(`Example: ${entry.example}`);

    if (entry.urduExample) {
      lines.push(`Urdu Example: ${entry.urduExample}`);
    }

    if (firstContext) {
      lines.push(`Context: In this transcript, "${matchedTerm}" means ${entry.transcriptContext || entry.contextual || entry.definition}`);
    } else {
      lines.push(`Context: "${term}" is not present in this transcript, so this answer uses general English meaning.`);
    }

    return lines.join('\n');
  }

  if (firstContext) {
    return [
      `Word/Phrase: "${term}"`,
      `Definition: The word is unclear or may be a name, local expression, technical term, or misspelled word.`,
      `Example: The speaker used "${term}" in the transcript line above.`,
      `Context: It appears in "${contextLine}". The exact meaning depends on that sentence and the source language.`,
    ].join('\n');
  }

  return [
    `Word/Phrase: "${term}"`,
    `Definition: The word is unclear, misspelled beyond recognition, or genuinely unknown.`,
    `Example: Please explain the word "${term}".`,
    `Context: "${term}" is not present in this transcript.`,
  ].join('\n');
}

function buildChatReply(prompt = '', rows = [], options = {}) {
  const normalizedPrompt = prompt.toLowerCase();
  const extractedVocabularyTerm = extractMeaningLookupTerm(prompt);
  const languageRequestPattern = new RegExp(`\\b(?:to|in)\\s+(?:${assistantLanguagePattern})\\??$`, 'i');
  const looksLikeVocabularyPrompt =
    /^(what\s+is|translate|define|definition\s+of|meaning\s+of)\b/i.test(prompt.trim()) ||
    languageRequestPattern.test(prompt.trim()) ||
    /\b(mean|means|matlab|meaning|definition|translation)\b/i.test(prompt.trim());

  if (
    !/^what\s+is\s+(?:this|the)\s+transcript\s+about/i.test(prompt.trim()) &&
    (meaningIntentTokens.some((token) => normalizedPrompt.includes(token.toLowerCase())) ||
      (extractedVocabularyTerm && looksLikeVocabularyPrompt))
  ) {
    return buildImprovedMeaningReply(prompt, rows, options);
  }

  if (prompt === 'summarize' || normalizedPrompt.includes('summar')) {
    return buildSummary(rows);
  }

  if (prompt === 'keyTopics' || normalizedPrompt.includes('topic') || normalizedPrompt.includes('key point')) {
    return buildKeyTopics(rows);
  }

  if (normalizedPrompt.includes('action') || normalizedPrompt.includes('todo') || normalizedPrompt.includes('task')) {
    return buildActionItems(rows);
  }

  if (normalizedPrompt.includes('speaker')) {
    return buildSpeakerInsight(rows);
  }

  return [
    'I can inspect this transcript locally.',
    `Summary: ${buildSummary(rows)}`,
    `Key topics: ${buildKeyTopics(rows)}`,
  ].join('\n\n');
}

function shouldUseWordMeaningAssistant(prompt = '') {
  const text = String(prompt || '').trim();

  if (!text) return false;
  if (/^what\s+is\s+(?:this|the)\s+transcript\s+about/i.test(text)) return false;

  const languageRequestPattern = new RegExp(`\\b(?:to|in)\\s+(?:${assistantLanguagePattern})\\??$`, 'i');

  return Boolean(
    extractMeaningLookupTerm(text) &&
      (/^(what\s+is|what\s+does|meaning\s+of|define|definition\s+of|translate)\b/i.test(text) ||
        languageRequestPattern.test(text) ||
        /\b(mean|means|matlab|meaning|definition|translation)\b/i.test(text)),
  );
}

function getExtension(file) {
  return file?.name.split('.').pop()?.toUpperCase() || '';
}

function getMediaKind(file) {
  const extension = getExtension(file);

  if (audioFormats.includes(extension)) return 'audio';
  if (videoFormats.includes(extension)) return 'video';
  return null;
}

function isSupportedFile(file) {
  if (!file) return false;

  const extension = getExtension(file);
  return supportedFormats.includes(extension) && supportedTypes.includes(file.type || '');
}

function getImmediateFileError(file) {
  if (!file) return null;
  if (file.size > MAX_UPLOAD_SIZE_BYTES) return validationMessages.maxFile;
  if (!isSupportedFile(file)) return validationMessages.unsupported;
  return null;
}

function isCancelError(error) {
  return error?.code === 'ERR_CANCELED' || error?.name === 'CanceledError' || error?.name === 'AbortError';
}

function findLanguageMatch(languages = [], value = '') {
  const normalizedValue = value.trim().toLowerCase();

  if (!normalizedValue) return null;

  return languages.find((language) => language.toLowerCase() === normalizedValue) || null;
}

function getMediaDuration(file) {
  const kind = getMediaKind(file);

  if (!kind) {
    return Promise.reject(new Error('Unsupported media type'));
  }

  return new Promise((resolve, reject) => {
    const media = document.createElement(kind === 'video' ? 'video' : 'audio');
    const objectUrl = URL.createObjectURL(file);

    function cleanup() {
      URL.revokeObjectURL(objectUrl);
      media.removeAttribute('src');
      media.load();
    }

    media.preload = 'metadata';
    media.onloadedmetadata = () => {
      const { duration } = media;
      cleanup();

      if (Number.isFinite(duration) && duration > 0) {
        resolve(duration);
        return;
      }

      reject(new Error('Unable to read media duration'));
    };
    media.onerror = () => {
      cleanup();
      reject(new Error('Unable to read media duration'));
    };
    media.src = objectUrl;
  });
}

function EditableTranscript({
  title,
  value,
  onChange,
  confidence,
  words = [],
  t,
  onExport,
  isExporting,
}) {
  if (!value) return null;

  const transcriptConfidence = formatPercent(confidence?.transcript);
  const uncertainWords = words.filter((word) => word.isUncertain).slice(0, 36);

  return (
    <div className="mb-7 rounded-card border border-royal-500/25 bg-navy-950/70 p-5 text-left shadow-glow">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold uppercase tracking-[.16em] text-royal-400">{title}</p>
        {transcriptConfidence ? (
          <span className="rounded-full border border-white/10 bg-white/[.05] px-3 py-1 text-xs font-semibold text-slate-200">
            {t('upload.confidence')}: {transcriptConfidence}
          </span>
        ) : null}
      </div>

      <textarea
        dir="auto"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-[280px] w-full resize-y rounded-2xl border border-white/10 bg-white/[.04] p-4 text-base leading-7 text-slate-100 outline-none transition focus:border-royal-400/60 focus:ring-4 focus:ring-royal-600/15"
      />

      <div className="mt-4 rounded-2xl border border-white/10 bg-white/[.03] p-4">
        <p className="text-sm font-semibold text-slate-200">{t('upload.uncertainWords')}</p>
        {uncertainWords.length ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {uncertainWords.map((word, index) => (
              <span
                key={`${word.text}-${word.start || index}`}
                className="rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1 text-xs font-semibold text-amber-100"
                title={word.confidence !== null ? `${t('upload.confidence')}: ${formatPercent(word.confidence)}` : undefined}
              >
                {word.text}
              </span>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-slate-400">{t('upload.noUncertainWords')}</p>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        {exportFormats.map((format) => (
          <button
            key={format}
            type="button"
            onClick={() => onExport(format.toLowerCase())}
            disabled={Boolean(isExporting)}
            className="flex h-11 items-center justify-center gap-2 rounded-button border border-white/10 bg-white/[.05] px-4 text-sm font-semibold text-slate-100 transition hover:border-royal-400/50 hover:bg-white/[.08] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FiDownload className="h-4 w-4" />
            {isExporting === format.toLowerCase() ? t('upload.exporting') : `${t('upload.download')} ${format}`}
          </button>
        ))}
      </div>
    </div>
  );
}

function TranscriptWorkspace({
  file,
  fileName,
  language,
  transcript,
  segments,
  sentences,
  confidence,
  words = [],
  t,
  currentUser,
  isAuthLoading,
  onTranscriptChange,
  onExport,
  isExporting,
}) {
  const mediaRef = useRef(null);
  const rowRefs = useRef([]);
  const chatScrollRef = useRef(null);
  const chatEndRef = useRef(null);
  const isChatAutoScrollingRef = useRef(false);
  const chatAutoScrollTimerRef = useRef(null);
  const [mediaUrl, setMediaUrl] = useState('');
  const [currentTime, setCurrentTime] = useState(0);
  const [mediaDuration, setMediaDuration] = useState(0);
  const [volume, setVolume] = useState(0.75);
  const [isPlaying, setIsPlaying] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [isChatAutoScrollEnabled, setIsChatAutoScrollEnabled] = useState(true);
  const [showChatJumpButton, setShowChatJumpButton] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [isChatThinking, setIsChatThinking] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      text: 'Ask me anything about this transcription. I can summarize, find key topics, action items, and speaker details.',
    },
  ]);
  const transcriptRows = buildTranscriptRows({
    segments,
    sentences,
    transcript,
  });
  const activeRowIndex = getActiveTranscriptIndex(transcriptRows, currentTime);
  const transcriptConfidence = formatPercent(confidence?.transcript);
  const reviewWords = words.filter((word) => word.isUncertain).slice(0, 12);
  const fallbackDuration = transcriptRows.reduce((duration, row) => Math.max(duration, row.end || row.start || 0), 0);
  const effectiveDuration = mediaDuration || fallbackDuration;
  const mediaKind = getMediaKind(file);
  const MediaElement = mediaKind === 'video' ? 'video' : 'audio';

  useEffect(() => {
    if (!file) {
      setMediaUrl('');
      setCurrentTime(0);
      setMediaDuration(0);
      setIsPlaying(false);
      return undefined;
    }

    const nextUrl = URL.createObjectURL(file);
    setMediaUrl(nextUrl);
    setCurrentTime(0);
    setMediaDuration(0);
    setIsPlaying(false);

    return () => {
      URL.revokeObjectURL(nextUrl);
    };
  }, [file]);

  useEffect(() => {
    if (mediaRef.current) {
      mediaRef.current.volume = volume;
    }
  }, [volume, mediaUrl]);

  useEffect(() => {
    if (!autoScroll || activeRowIndex < 0) return;

    rowRefs.current[activeRowIndex]?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
    });
  }, [activeRowIndex, autoScroll]);

  const scrollChatToLatest = useCallback((behavior = 'smooth') => {
    if (!chatEndRef.current) return;

    isChatAutoScrollingRef.current = true;
    chatEndRef.current.scrollIntoView({
      behavior,
      block: 'end',
    });

    window.clearTimeout(chatAutoScrollTimerRef.current);
    chatAutoScrollTimerRef.current = window.setTimeout(() => {
      isChatAutoScrollingRef.current = false;
      setShowChatJumpButton(false);
    }, 450);
  }, []);

  useEffect(() => {
    if (!isChatAutoScrollEnabled) return undefined;

    const frameId = window.requestAnimationFrame(() => {
      scrollChatToLatest('smooth');
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [chatMessages.length, isChatThinking, isChatAutoScrollEnabled, scrollChatToLatest]);

  useEffect(
    () => () => {
      window.clearTimeout(chatAutoScrollTimerRef.current);
    },
    [],
  );

  const handleChatScroll = useCallback(() => {
    if (isChatAutoScrollingRef.current) return;

    const scrollElement = chatScrollRef.current;
    if (!scrollElement) return;

    const distanceFromBottom = scrollElement.scrollHeight - scrollElement.scrollTop - scrollElement.clientHeight;
    const isNearLatestMessage = distanceFromBottom < 80;

    setIsChatAutoScrollEnabled(isNearLatestMessage);
    setShowChatJumpButton(!isNearLatestMessage);
  }, []);

  const jumpToLatestChat = useCallback(() => {
    setIsChatAutoScrollEnabled(true);
    setShowChatJumpButton(false);
    scrollChatToLatest('smooth');
  }, [scrollChatToLatest]);

  const chatActionButtons = [
    { key: 'summarize', label: t('upload.summarize') },
    { key: 'keyTopics', label: t('upload.keyTopics') },
    { key: 'actionItems', label: t('upload.actionItems') },
    { key: 'speakers', label: t('upload.speakers') },
  ];

  const seekTo = useCallback((nextTime) => {
    const numericTime = Number(nextTime);
    const safeTime = Number.isFinite(numericTime) ? Math.max(0, numericTime) : 0;

    if (mediaRef.current) {
      mediaRef.current.currentTime = safeTime;
    }

    setCurrentTime(safeTime);
  }, []);

  const togglePlayback = useCallback(async () => {
    const media = mediaRef.current;

    if (!media || !mediaUrl) {
      toast.error('Audio preview is not available for this file.');
      return;
    }

    if (media.paused) {
      try {
        await media.play();
      } catch {
        toast.error('This file cannot be previewed in the browser.');
      }
      return;
    }

    media.pause();
  }, [mediaUrl]);

  const submitChatMessage = async (message) => {
    const prompt = String(message || chatInput).trim();

    if (!prompt || isChatThinking) return;

    if (!currentUser && !isAuthLoading) {
      window.location.href = getGoogleAuthUrl();
      return;
    }

    const userMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: prompt,
    };

    setChatMessages((current) => [...current, userMessage]);
    setChatInput('');

    const fallbackText = buildChatReply(prompt, transcriptRows, { language });

    if (!shouldUseWordMeaningAssistant(prompt)) {
      setChatMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          text: fallbackText,
        },
      ]);
      return;
    }

    setIsChatThinking(true);

    try {
      const response = await askWordMeaning({
        question: prompt,
        language,
        transcriptRows: transcriptRows.map((row) => ({
          speakerLabel: row.speakerLabel,
          start: row.start,
          text: row.text,
        })),
      });

      setChatMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          text: response.data?.answer || fallbackText,
        },
      ]);
    } catch (error) {
      setChatMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          text: fallbackText,
        },
      ]);
      toast.error(error.response?.data?.message || 'Unable to fetch word meaning. Using local answer.');
    } finally {
      setIsChatThinking(false);
    }
  };

  const renderChatMessageLine = (line, messageId, index) => {
    const headingMatch = line.match(/^([A-Za-z][A-Za-z /()-]{2,34}):\s*(.*)$/);

    if (!headingMatch) {
      return (
        <p key={`${messageId}-${index}`} className="text-slate-200">
          {line}
        </p>
      );
    }

    const [, heading, value] = headingMatch;

    return (
      <div key={`${messageId}-${index}`} className="space-y-1">
        <p className="font-mono text-[11px] font-bold uppercase tracking-[.12em] text-royal-300">
          {heading}
        </p>
        {value ? (
          <p className="text-[15px] font-medium leading-6 text-slate-100">
            {value}
          </p>
        ) : null}
      </div>
    );
  };

  const renderRowText = (row, isActive) => {
    const timedWords = Array.isArray(row.words)
      ? row.words.filter((word) => word?.text || word?.raw)
      : [];

    if (!isActive || !timedWords.length) {
      return row.text;
    }

    return timedWords.map((word, index) => {
      const text = word.text || word.raw;
      const isActiveWord = getWordIsActive(word, currentTime);

      return (
        <span
          key={`${text}-${word.start ?? index}`}
          className={isActiveWord ? 'rounded-md bg-royal-400 px-1.5 py-0.5 text-white shadow-glow' : undefined}
        >
          {text}
          {index < timedWords.length - 1 ? ' ' : ''}
        </span>
      );
    });
  };

  return (
    <div className="mb-8 overflow-hidden rounded-[22px] border border-royal-500/25 bg-navy-950/75 shadow-glow">
      {mediaUrl ? (
        <MediaElement
          ref={mediaRef}
          src={mediaUrl}
          preload="metadata"
          className="hidden"
          playsInline
          onLoadedMetadata={(event) => {
            const duration = event.currentTarget.duration;
            setMediaDuration(Number.isFinite(duration) ? duration : 0);
          }}
          onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime || 0)}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
        />
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-white/[.03] px-5 py-4">
        <div className="min-w-0">
          <p className="truncate text-2xl font-semibold text-white">{fileName || t('upload.correctedTranscript')}</p>
          <p className="mt-1 text-sm text-slate-400">
            {transcriptConfidence ? `${t('upload.confidence')}: ${transcriptConfidence}` : t('upload.disclaimer')}
          </p>
        </div>

      </div>

      <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-h-[420px] border-white/10 lg:border-r">
          <div className="max-h-[520px] space-y-3 overflow-y-auto p-4 sm:p-5">
            {transcriptRows.length ? (
              transcriptRows.map((row, index) => {
                const isActive = index === activeRowIndex;

                return (
                  <button
                    key={row.id}
                    ref={(element) => {
                      rowRefs.current[index] = element;
                    }}
                    type="button"
                    onClick={() => row.start !== null && seekTo(row.start)}
                    className={`group grid w-full grid-cols-[84px_64px_minmax(0,1fr)] items-start gap-3 rounded-2xl border px-3 py-3 text-left transition sm:grid-cols-[100px_72px_minmax(0,1fr)] ${
                      isActive
                        ? 'border-royal-400/70 bg-royal-500/[.16] shadow-glow'
                        : 'border-white/10 bg-white/[.035] hover:border-royal-400/35 hover:bg-white/[.055]'
                    }`}
                  >
                    <span
                      className={`rounded-full px-3 py-1 text-center text-sm font-bold ${
                        isActive ? 'bg-royal-500 text-white' : 'bg-white/[.06] text-slate-300'
                      }`}
                    >
                      {row.speakerLabel || 'Speaker'}
                    </span>
                    <span
                      className={`rounded-lg px-3 py-1 text-center font-mono text-sm ${
                        isActive ? 'bg-royal-500/20 text-royal-100' : 'bg-white/[.04] text-slate-400'
                      }`}
                    >
                      {row.start !== null ? formatPlaybackTime(row.start) : '--:--'}
                    </span>
                    <span className="text-base leading-7 text-slate-100 sm:text-lg">
                      {renderRowText(row, isActive)}
                    </span>
                  </button>
                );
              })
            ) : (
              <div className="rounded-2xl border border-white/10 bg-white/[.04] p-5 text-sm text-slate-300">
                {t('upload.noTranscriptRows')}
              </div>
            )}
          </div>

          {reviewWords.length ? (
            <div className="border-t border-white/10 px-5 py-4">
              <p className="text-sm font-semibold text-slate-200">{t('upload.uncertainWords')}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {reviewWords.map((word, index) => (
                  <span
                    key={`${word.text}-${word.start || index}`}
                    className="rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1 text-xs font-semibold text-amber-100"
                    title={word.confidence !== null ? `${t('upload.confidence')}: ${formatPercent(word.confidence)}` : undefined}
                  >
                    {word.text}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex h-[560px] min-h-0 flex-col bg-white/[.025] lg:h-[620px]">
          <div className="bg-gradient-to-r from-royal-600 to-royal-400 px-5 py-5 text-white">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xl font-semibold">{t('upload.aiChat')}</p>
                <p className="mt-1 text-sm text-white/80">{t('upload.aiChatSubtitle')}</p>
              </div>
              <FiMessageSquare className="h-6 w-6" />
            </div>
          </div>

          <div className="relative min-h-0 flex-1">
            <div
              ref={chatScrollRef}
              onScroll={handleChatScroll}
              className="h-full min-h-0 space-y-3 overflow-y-auto p-4"
            >
              {chatMessages.map((message) => (
                <div
                  key={message.id}
                  className={`space-y-3 whitespace-pre-wrap break-words rounded-2xl border px-4 py-3 text-sm leading-6 ${
                    message.role === 'user'
                      ? 'ml-8 border-royal-400/30 bg-royal-500/15 text-royal-50'
                      : 'mr-8 border-white/10 bg-white/[.05] text-slate-200'
                  }`}
                >
                  {message.text.split('\n').map((line, index) => renderChatMessageLine(line, message.id, index))}
                </div>
              ))}
              {isChatThinking ? (
                <div className="mr-8 rounded-2xl border border-white/10 bg-white/[.05] px-4 py-3 text-sm font-semibold text-slate-300">
                  Thinking...
                </div>
              ) : null}
              <div ref={chatEndRef} className="h-1" aria-hidden="true" />
            </div>
            {showChatJumpButton ? (
              <button
                type="button"
                onClick={jumpToLatestChat}
                className="absolute bottom-3 left-1/2 z-10 -translate-x-1/2 rounded-full border border-royal-400/35 bg-navy-950/90 px-4 py-2 text-xs font-bold text-royal-100 shadow-glow backdrop-blur transition hover:border-royal-300/70 hover:bg-royal-500/20"
              >
                {t('upload.chatJumpLatest')}
              </button>
            ) : null}
          </div>

          <div className="border-t border-white/10 p-4">
            <div className="mb-3 flex flex-wrap gap-2">
              {chatActionButtons.map((button) => (
                <button
                  key={button.key}
                  type="button"
                  disabled={isChatThinking}
                  onClick={() => submitChatMessage(button.key)}
                  className="rounded-full border border-white/10 bg-white/[.05] px-3 py-1.5 text-sm font-semibold text-slate-100 transition hover:border-royal-400/45 hover:bg-white/[.08] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {button.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={chatInput}
                disabled={isChatThinking}
                onChange={(event) => setChatInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key !== 'Enter') return;
                  event.preventDefault();
                  submitChatMessage();
                }}
                placeholder={t('upload.askQuestion')}
                className="h-12 min-w-0 flex-1 rounded-full border border-white/10 bg-navy-950/70 px-4 text-sm font-medium text-white outline-none transition placeholder:text-slate-500 focus:border-royal-400/60 focus:ring-4 focus:ring-royal-600/15 disabled:cursor-not-allowed disabled:opacity-60"
              />
              <button
                type="button"
                disabled={isChatThinking}
                onClick={() => submitChatMessage()}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-royal-500 text-white shadow-glow transition hover:bg-royal-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <FiSend className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {isEditing ? (
        <div className="border-t border-white/10 bg-navy-950/70 p-5">
          <textarea
            dir="auto"
            value={transcript}
            onChange={(event) => onTranscriptChange(event.target.value)}
            className="min-h-[220px] w-full resize-y rounded-2xl border border-white/10 bg-white/[.04] p-4 text-base leading-7 text-slate-100 outline-none transition focus:border-royal-400/60 focus:ring-4 focus:ring-royal-600/15"
          />
        </div>
      ) : null}

      <div className="border-t border-white/10 bg-white/[.03] p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <button
            type="button"
            onClick={togglePlayback}
            disabled={!mediaUrl}
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-royal-500 text-white shadow-glow transition hover:bg-royal-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPlaying ? <FiPause className="h-6 w-6" /> : <FiPlay className="h-6 w-6 translate-x-0.5" />}
          </button>

          <div className="min-w-0 flex-1">
            <input
              type="range"
              min="0"
              max={effectiveDuration || 0}
              step="0.01"
              value={Math.min(currentTime, effectiveDuration || currentTime)}
              onChange={(event) => seekTo(event.target.value)}
              disabled={!mediaUrl || !effectiveDuration}
              className="h-2 w-full cursor-pointer accent-royal-500 disabled:cursor-not-allowed disabled:opacity-50"
            />
            <div className="mt-2 flex items-center justify-between gap-4 text-sm font-semibold text-slate-300">
              <span>{formatPlaybackTime(currentTime)}</span>
              <span>{formatPlaybackTime(effectiveDuration)}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 lg:w-52">
            {volume > 0 ? (
              <FiVolume2 className="h-5 w-5 shrink-0 text-slate-300" />
            ) : (
              <FiVolumeX className="h-5 w-5 shrink-0 text-slate-300" />
            )}
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={(event) => setVolume(Number(event.target.value))}
              disabled={!mediaUrl}
              className="h-2 w-full cursor-pointer accent-royal-500 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          {exportFormats.map((format) => (
            <button
              key={format}
              type="button"
              onClick={() => onExport(format.toLowerCase())}
              disabled={Boolean(isExporting)}
              className="flex h-11 items-center justify-center gap-2 rounded-button border border-white/10 bg-white/[.05] px-4 text-sm font-semibold text-slate-100 transition hover:border-royal-400/50 hover:bg-white/[.08] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FiDownload className="h-4 w-4" />
              {isExporting === format.toLowerCase() ? t('upload.exporting') : `${t('upload.download')} ${format}`}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function UploadCard() {
  const fileInputRef = useRef(null);
  const languagePickerRef = useRef(null);
  const abortControllerRef = useRef(null);
  const progressTimerRef = useRef(null);
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [transcriptionProgress, setTranscriptionProgress] = useState(0);
  const [rawTranscript, setRawTranscript] = useState('');
  const [correctedTranscript, setCorrectedTranscript] = useState('');
  const [editedTranscript, setEditedTranscript] = useState('');
  const [rawTranscriptSegments, setRawTranscriptSegments] = useState([]);
  const [correctedTranscriptSegments, setCorrectedTranscriptSegments] = useState([]);
  const [sentences, setSentences] = useState([]);
  const [words, setWords] = useState([]);
  const [confidence, setConfidence] = useState(null);
  const [correction, setCorrection] = useState(null);
  const [isExporting, setIsExporting] = useState('');
  const [restoredFile, setRestoredFile] = useState(null);
  const [languageQuery, setLanguageQuery] = useState('Auto Detect');
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);
  const hasTranscript = Boolean(rawTranscript || correctedTranscript || editedTranscript);
  const compactUpload = hasTranscript;
  const isBusy = isTranscribing;
  const {
    transcriptionLanguage,
    setTranscriptionLanguage,
    transcriptionLanguages,
    currentUser,
    isAuthLoading,
    t,
  } = useApp();
  const {
    register,
    handleSubmit,
    setValue,
    resetField,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm({ mode: 'onChange' });
  const clearProgressTimer = useCallback(() => {
    if (progressTimerRef.current) {
      window.clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    setLanguageQuery(transcriptionLanguage);
  }, [transcriptionLanguage]);

  const commitLanguageQuery = useCallback(() => {
    const exactMatch = findLanguageMatch(transcriptionLanguages, languageQuery);

    if (exactMatch) {
      setTranscriptionLanguage(exactMatch);
      setLanguageQuery(exactMatch);
      return;
    }

    setLanguageQuery(transcriptionLanguage);
  }, [languageQuery, setTranscriptionLanguage, transcriptionLanguage, transcriptionLanguages]);

  const visibleTranscriptionLanguages = languageQuery.trim() && languageQuery !== transcriptionLanguage
    ? transcriptionLanguages.filter((language) =>
      language.toLowerCase().includes(languageQuery.trim().toLowerCase()),
    )
    : transcriptionLanguages;

  const selectTranscriptionLanguage = useCallback(
    (language) => {
      setTranscriptionLanguage(language);
      setLanguageQuery(language);
      setIsLanguageMenuOpen(false);
    },
    [setTranscriptionLanguage],
  );

  const handleLanguageInputChange = useCallback(
    (event) => {
      const nextValue = event.target.value;
      const exactMatch = findLanguageMatch(transcriptionLanguages, nextValue);

      setLanguageQuery(nextValue);
      setIsLanguageMenuOpen(true);

      if (exactMatch) {
        setTranscriptionLanguage(exactMatch);
      }
    },
    [setTranscriptionLanguage, transcriptionLanguages],
  );

  const handleLanguageKeyDown = useCallback(
    (event) => {
      if (event.key !== 'Enter') return;

      event.preventDefault();
      commitLanguageQuery();
      setIsLanguageMenuOpen(false);
      event.currentTarget.blur();
    },
    [commitLanguageQuery],
  );

  const clearSelectedFile = useCallback(
    ({ clearTranscript = false } = {}) => {
      setRestoredFile(null);
      setFileName('');
      setFileSize('');
      setUploadProgress(0);
      setTranscriptionProgress(0);
      resetField('audio');
      clearErrors('audio');

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      if (clearTranscript) {
        setRawTranscript('');
        setCorrectedTranscript('');
        setEditedTranscript('');
        setRawTranscriptSegments([]);
        setCorrectedTranscriptSegments([]);
        setSentences([]);
        setWords([]);
        setConfidence(null);
        setCorrection(null);
        clearPersistedTranscription().catch(() => {});
      }
    },
    [clearErrors, resetField],
  );

  const openFilePicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const cancelTranscription = useCallback(() => {
    abortControllerRef.current?.abort();
    clearProgressTimer();
  }, [clearProgressTimer]);

  useEffect(() => {
    let mounted = true;

    getPersistedTranscription()
      .then((record) => {
        if (!mounted || !record) return;

        setRestoredFile(record.file || null);
        setFileName(record.fileName || record.file?.name || '');
        setFileSize(record.fileSize || formatFileSize(record.file?.size));
        const restoredCorrectedSegments = record.correctedTranscriptSegments || record.transcriptSegments || [];
        const restoredCorrectedTranscript = record.correctedTranscript || record.transcript || '';
        setRawTranscript(record.rawTranscript || record.transcript || '');
        setCorrectedTranscript(restoredCorrectedTranscript);
        setEditedTranscript(
          record.editedTranscript || formatEditableTranscript(restoredCorrectedSegments, restoredCorrectedTranscript),
        );
        setRawTranscriptSegments(record.rawTranscriptSegments || []);
        setCorrectedTranscriptSegments(restoredCorrectedSegments);
        setSentences(record.sentences || []);
        setWords(record.words || []);
        setConfidence(record.confidence || null);
        setCorrection(record.correction || null);
        setUploadProgress(record.rawTranscript || record.transcript ? 100 : 0);
        setTranscriptionProgress(record.rawTranscript || record.transcript ? 100 : 0);

        if (record.language) {
          setTranscriptionLanguage(record.language);
        }
      })
      .catch(() => {
        // Persistence is a convenience; the app can continue without it.
      });

    return () => {
      mounted = false;
    };
  }, [setTranscriptionLanguage]);

  const onFileChange = useCallback((files) => {
    const file = files?.[0];
    if (!file) return;

    const immediateError = getImmediateFileError(file);

    if (immediateError) {
      clearSelectedFile({ clearTranscript: true });
      setError('audio', { type: 'manual', message: immediateError });
      toast.error(immediateError);
      return;
    }

    const nextFileName = file?.name || '';
    const nextFileSize = formatFileSize(file?.size);

    setRestoredFile(file || null);
    setFileName(nextFileName);
    setFileSize(nextFileSize);
    setUploadProgress(0);
    setTranscriptionProgress(0);
    setRawTranscript('');
    setCorrectedTranscript('');
    setEditedTranscript('');
    setRawTranscriptSegments([]);
    setCorrectedTranscriptSegments([]);
    setSentences([]);
    setWords([]);
    setConfidence(null);
    setCorrection(null);
    clearErrors('audio');

    savePersistedTranscription({
      file,
      fileName: nextFileName,
      fileSize: nextFileSize,
      transcript: '',
      rawTranscript: '',
      correctedTranscript: '',
      editedTranscript: '',
      rawTranscriptSegments: [],
      correctedTranscriptSegments: [],
      transcriptSegments: [],
      sentences: [],
      words: [],
      confidence: null,
      progress: 0,
      language: transcriptionLanguage,
    }).catch(() => {});
  }, [clearErrors, clearSelectedFile, setError, transcriptionLanguage]);

  const fileRegister = register('audio', {
    validate: {
      selected: (files) => {
        const file = files?.[0] || restoredFile;
        return Boolean(file) || t('upload.chooseFile');
      },
      supported: (files) => {
        const file = files?.[0] || restoredFile;
        if (!file) return t('upload.chooseFile');
        return isSupportedFile(file) || validationMessages.unsupported;
      },
      size: (files) => {
        const file = files?.[0] || restoredFile;
        return !file || file.size <= MAX_UPLOAD_SIZE_BYTES || validationMessages.maxFile;
      },
      duration: async (files) => {
        const file = files?.[0] || restoredFile;

        if (!file || !isSupportedFile(file) || file.size > MAX_UPLOAD_SIZE_BYTES) return true;

        try {
          const duration = await getMediaDuration(file);
          const kind = getMediaKind(file);

          if (kind === 'audio' && duration > MAX_AUDIO_DURATION_SECONDS) {
            return validationMessages.maxAudioDuration;
          }

          if (kind === 'video' && duration > MAX_VIDEO_DURATION_SECONDS) {
            return validationMessages.maxVideoDuration;
          }
        } catch {
          return true;
        }

        return true;
      },
    },
    onChange: (event) => onFileChange(event.target.files),
  });
  const { ref: registerFileInputRef, ...fileInputProps } = fileRegister;

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();
      const file = event.dataTransfer.files?.[0];
      if (!file) return;
      setValue('audio', event.dataTransfer.files, { shouldValidate: true });
      onFileChange(event.dataTransfer.files);
    },
    [onFileChange, setValue],
  );

  const onSubmit = async (data) => {
    const file = data.audio?.[0] || restoredFile;

    if (!file) {
      toast.error(t('upload.chooseFile'));
      return;
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsTranscribing(true);
    setUploadProgress(0);
    setTranscriptionProgress(3);
    setRawTranscript('');
    setCorrectedTranscript('');
    setEditedTranscript('');
    setRawTranscriptSegments([]);
    setCorrectedTranscriptSegments([]);
    setSentences([]);
    setWords([]);
    setConfidence(null);
    setCorrection(null);
    progressTimerRef.current = window.setInterval(() => {
      setTranscriptionProgress((current) => {
        if (current >= 94) return current;
        if (current < 35) return Math.min(current + 4, 35);
        if (current < 75) return Math.min(current + 2, 75);
        return Math.min(current + 1, 94);
      });
    }, 700);

    try {
      const response = await uploadAudioFile(
        file,
        { language: transcriptionLanguage },
        {
          signal: controller.signal,
          onUploadProgress: (progressEvent) => {
            if (!progressEvent.total) return;

            const uploadPercent = Math.round((progressEvent.loaded / progressEvent.total) * 100);
            setUploadProgress(Math.min(uploadPercent, 100));
          },
        },
      );
      setUploadProgress(100);
      setTranscriptionProgress(100);
      const nextRawTranscript = response.data.rawTranscript || response.data.transcript || '';
      const nextCorrectedTranscript = response.data.correctedTranscript || response.data.transcript || nextRawTranscript;
      const nextRawTranscriptSegments = response.data.rawTranscriptSegments || [];
      const nextCorrectedTranscriptSegments = response.data.correctedTranscriptSegments || response.data.transcriptSegments || [];
      const nextSentences = response.data.sentences || [];
      const nextWords = response.data.words || [];
      const nextConfidence = response.data.confidence || null;
      const nextCorrection = response.data.correction || null;
      const nextEditableTranscript = formatEditableTranscript(nextCorrectedTranscriptSegments, nextCorrectedTranscript);
      setRawTranscript(nextRawTranscript);
      setCorrectedTranscript(nextCorrectedTranscript);
      setEditedTranscript(nextEditableTranscript);
      setRawTranscriptSegments(nextRawTranscriptSegments);
      setCorrectedTranscriptSegments(nextCorrectedTranscriptSegments);
      setSentences(nextSentences);
      setWords(nextWords);
      setConfidence(nextConfidence);
      setCorrection(nextCorrection);
      savePersistedTranscription({
        file,
        fileName: file.name || fileName,
        fileSize: formatFileSize(file.size) || fileSize,
        transcript: nextCorrectedTranscript,
        rawTranscript: nextRawTranscript,
        correctedTranscript: nextCorrectedTranscript,
        editedTranscript: nextEditableTranscript,
        rawTranscriptSegments: nextRawTranscriptSegments,
        correctedTranscriptSegments: nextCorrectedTranscriptSegments,
        transcriptSegments: nextCorrectedTranscriptSegments,
        sentences: nextSentences,
        words: nextWords,
        confidence: nextConfidence,
        correction: nextCorrection,
        progress: 100,
        language: transcriptionLanguage,
      }).catch(() => {});
      toast.success(`${t('upload.success')} 100%`);
    } catch (error) {
      if (isCancelError(error)) {
        setUploadProgress(0);
        setTranscriptionProgress(0);
        toast.error(t('upload.cancelled'));
        return;
      }

      const message =
        error.response?.data?.message ||
        error.message ||
        t('upload.failed');
      toast.error(message);
    } finally {
      clearProgressTimer();
      abortControllerRef.current = null;
      setIsTranscribing(false);
    }
  };

  const handleExport = async (format) => {
    const transcriptForExport = editedTranscript.trim() || correctedTranscript.trim();

    if (!transcriptForExport) {
      toast.error(t('upload.chooseFile'));
      return;
    }

    setIsExporting(format);

    try {
      const response = await exportTranscript({
        format,
        fileName: fileName || 'at2-transcript',
        transcript: transcriptForExport,
        editedTranscript: transcriptForExport,
        segments: correctedTranscriptSegments,
        sentences,
        words,
        confidence,
      });
      const fallbackName = `at2-transcript.${format}`;
      downloadBlob(response.data, getDownloadFileName(response, fallbackName));
    } catch (error) {
      const message =
        error.response?.data?.message ||
        error.message ||
        t('upload.failed');
      toast.error(message);
    } finally {
      setIsExporting('');
    }
  };

  return (
    <form
      id="upload"
      onSubmit={handleSubmit(onSubmit)}
      onDragOver={(event) => event.preventDefault()}
      onDrop={onDrop}
      className="glass-card mx-auto w-full max-w-[1120px] rounded-[24px] border border-royal-500/30 bg-[rgba(30,45,80,.45)] p-5 shadow-premium shadow-blue-950/40 transition duration-300 hover:border-royal-400/45 hover:shadow-glow sm:p-8 lg:p-10"
    >
      {hasTranscript ? (
        <TranscriptWorkspace
          file={restoredFile}
          fileName={fileName}
          language={transcriptionLanguage}
          transcript={editedTranscript || correctedTranscript}
          segments={correctedTranscriptSegments}
          sentences={sentences}
          confidence={confidence}
          words={words}
          t={t}
          currentUser={currentUser}
          isAuthLoading={isAuthLoading}
          onTranscriptChange={setEditedTranscript}
          onExport={handleExport}
          isExporting={isExporting}
        />
      ) : null}

      {hasTranscript ? (
        <div className="mb-7 rounded-card border border-white/10 bg-white/[.04] p-4 text-left">
          <p className="text-sm font-medium text-slate-300">{correction?.disclaimer || t('upload.disclaimer')}</p>
        </div>
      ) : null}

      <div className="mx-auto mb-7 max-w-2xl text-left">
        <label htmlFor="transcription-language" className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-200">
          <FiGlobe className="h-5 w-5 text-slate-400" />
          {t('upload.selectLanguage')}
        </label>
        <div
          ref={languagePickerRef}
          className="relative"
          onBlur={(event) => {
            if (event.currentTarget.contains(event.relatedTarget)) return;

            commitLanguageQuery();
            setIsLanguageMenuOpen(false);
          }}
        >
          <input
            id="transcription-language"
            type="text"
            role="combobox"
            aria-controls="transcription-language-options"
            aria-expanded={isLanguageMenuOpen}
            aria-autocomplete="list"
            value={languageQuery}
            onChange={handleLanguageInputChange}
            onFocus={(event) => {
              setIsLanguageMenuOpen(true);
              event.currentTarget.select();
            }}
            onKeyDown={handleLanguageKeyDown}
            placeholder={t('upload.languageSearchPlaceholder')}
            autoComplete="off"
            className="h-14 w-full appearance-none rounded-input border border-white/12 bg-navy-950/70 px-5 pr-12 text-base font-semibold text-white outline-none transition focus:border-royal-500/70 focus:ring-4 focus:ring-royal-600/15"
          />
          {isLanguageMenuOpen ? (
            <div
              id="transcription-language-options"
              role="listbox"
              className="absolute left-0 right-0 top-[calc(100%+10px)] z-40 max-h-[340px] overflow-y-auto rounded-card border border-white/12 bg-[#0b1227] p-2 shadow-premium ring-1 ring-royal-500/20"
            >
              {visibleTranscriptionLanguages.length ? (
                visibleTranscriptionLanguages.map((item) => (
                  <button
                    key={item}
                    type="button"
                    role="option"
                    aria-selected={item === transcriptionLanguage}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => selectTranscriptionLanguage(item)}
                    className={`flex min-h-12 w-full items-center rounded-xl px-4 text-left text-base font-semibold transition ${
                      item === transcriptionLanguage
                        ? 'bg-royal-500/[.18] text-white'
                        : 'text-slate-200 hover:bg-white/[.06] hover:text-white'
                    }`}
                  >
                    {item}
                  </button>
                ))
              ) : (
                <p className="px-4 py-3 text-sm font-medium text-slate-400">No matching language found.</p>
              )}
            </div>
          ) : null}
          <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-slate-400">
            <FiChevronDown className="h-5 w-5" />
          </div>
        </div>
      </div>

      <label
        className={`flex flex-col items-center justify-center rounded-card border border-dashed border-royal-500/35 bg-royal-600/[.06] px-5 text-center transition hover:border-royal-400/70 hover:bg-royal-600/10 ${
          hasTranscript ? 'min-h-[190px] py-6 sm:min-h-[220px]' : 'min-h-[300px] py-8 sm:min-h-[340px]'
        } ${isBusy ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'}`}
      >
        <input
          type="file"
          className="sr-only"
          disabled={isBusy}
          accept=".mp3,.wav,.m4a,.aac,.flac,.ogg,.mp4,.mov,.avi,.mkv,.webm,audio/*,video/*"
          {...fileInputProps}
          ref={(element) => {
            registerFileInputRef(element);
            fileInputRef.current = element;
          }}
        />
        <span
          className={`flex items-center justify-center rounded-2xl border border-royal-400/40 bg-royal-600/15 text-royal-400 shadow-glow ${
            compactUpload ? 'mb-5 h-12 w-12' : 'mb-8 h-16 w-16'
          }`}
        >
          {fileName && !compactUpload ? (
            <FiVideo className="h-9 w-9" />
          ) : (
            <FiUploadCloud className={compactUpload ? 'h-6 w-6' : 'h-9 w-9'} />
          )}
        </span>

        <span className={`max-w-3xl break-words font-semibold text-white ${compactUpload ? 'text-xl' : 'text-2xl'}`}>
          {compactUpload ? t('upload.dropTitle') : fileName || t('upload.dropTitle')}
        </span>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
          <span className="rounded-full border border-white/10 bg-white/[.05] px-3 py-1 text-sm font-semibold text-royal-100">
            {compactUpload ? t('upload.browse') : fileName ? t('upload.video') : t('upload.browse')}
          </span>
          {!compactUpload && fileSize ? <span className="text-sm font-medium text-slate-300">{fileSize}</span> : null}
          {(!fileName || compactUpload) ? (
            <span className="text-sm font-medium text-slate-400">
              {formatHint}
            </span>
          ) : null}
        </div>
      </label>

      {(fileName || hasTranscript || isBusy) ? (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={openFilePicker}
            disabled={isBusy}
            className="flex h-11 items-center justify-center gap-2 rounded-button border border-white/10 bg-white/[.05] px-5 text-sm font-semibold text-slate-100 transition hover:border-royal-400/50 hover:bg-white/[.08] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FiRefreshCw className="h-4 w-4" />
            {t('upload.chooseOtherFile')}
          </button>
          <button
            type="button"
            onClick={isBusy ? cancelTranscription : () => clearSelectedFile({ clearTranscript: true })}
            className="flex h-11 items-center justify-center gap-2 rounded-button border border-red-400/25 bg-red-500/10 px-5 text-sm font-semibold text-red-100 transition hover:border-red-300/45 hover:bg-red-500/15"
          >
            <FiXCircle className="h-4 w-4" />
            {isTranscribing
              ? t('upload.cancelTranscription')
              : t('upload.cancelUpload')}
          </button>
        </div>
      ) : null}

      {errors.audio ? <p className="mt-3 text-sm text-red-300">{errors.audio.message}</p> : null}

      <button
        type="submit"
        disabled={isBusy}
        className="button-glow mx-auto mt-6 flex h-14 min-w-64 items-center justify-center gap-2 rounded-button bg-royal-600 px-7 text-base font-semibold text-white shadow-glow transition hover:-translate-y-0.5 hover:bg-royal-500 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
      >
        <FiCheckCircle className="h-5 w-5" />
        {isTranscribing ? `${transcriptionProgress}%` : t('upload.start')}
      </button>

      {(isTranscribing || transcriptionProgress === 100) ? (
        <div className="mx-auto mt-4 grid max-w-2xl gap-4 rounded-card border border-white/10 bg-navy-950/50 p-4">
          {[
            { label: t('upload.uploadProgress'), value: uploadProgress },
            { label: t('upload.transcriptionProgress'), value: transcriptionProgress },
          ].map((item) => (
            <div key={item.label}>
              <div className="mb-3 flex items-center justify-between gap-4 text-sm font-semibold text-slate-200">
                <span>{item.label}</span>
                <span className="text-royal-400">{item.value}%</span>
              </div>
              <div
                className="h-2.5 overflow-hidden rounded-full bg-white/10"
                role="progressbar"
                aria-valuemin="0"
                aria-valuemax="100"
                aria-valuenow={item.value}
              >
                <div
                  className="h-full rounded-full bg-gradient-to-r from-royal-700 via-royal-500 to-royal-400 transition-all duration-300"
                  style={{ width: `${item.value}%` }}
                />
              </div>
            </div>
          ))}
          </div>
      ) : null}

      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {supportedFormats.map((format) => (
          <span
            key={format}
            className="rounded-full border border-white/10 bg-white/[.04] px-3 py-1.5 text-xs font-semibold text-slate-300"
          >
            {format}
          </span>
        ))}
      </div>
    </form>
  );
}
