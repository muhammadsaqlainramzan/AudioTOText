import { hasOpenAIApiKey, getOpenAIClient } from './openaiClient.js';

const dictionaryEndpoint = 'https://api.dictionaryapi.dev/api/v2/entries/en';
const translationEndpoint = 'https://api.mymemory.translated.net/get';
const requestTimeoutMs = Number(process.env.ASSISTANT_LOOKUP_TIMEOUT_MS || 8000);
const assistantModel = process.env.OPENAI_ASSISTANT_MODEL || process.env.OPENAI_CORRECTION_MODEL || 'gpt-4o-mini';

const targetLanguages = [
  { key: 'urdu', heading: 'Urdu', code: 'ur' },
  { key: 'punjabi', heading: 'Punjabi', code: 'pa' },
  { key: 'hindi', heading: 'Hindi', code: 'hi' },
  { key: 'arabic', heading: 'Arabic', code: 'ar' },
  { key: 'french', heading: 'French', code: 'fr' },
  { key: 'german', heading: 'German', code: 'de' },
  { key: 'spanish', heading: 'Spanish', code: 'es' },
  { key: 'turkish', heading: 'Turkish', code: 'tr' },
];

const availableTranslationLanguages = [
  { key: 'english', heading: 'English', code: 'en', aliases: ['english'] },
  ...targetLanguages,
  { key: 'chinese', heading: 'Chinese', code: 'zh-CN', aliases: ['chinese', 'mandarin'] },
  { key: 'japanese', heading: 'Japanese', code: 'ja', aliases: ['japanese'] },
  { key: 'korean', heading: 'Korean', code: 'ko', aliases: ['korean', 'korian'] },
  { key: 'italian', heading: 'Italian', code: 'it', aliases: ['italian', 'italiano'] },
  { key: 'portuguese', heading: 'Portuguese', code: 'pt', aliases: ['portuguese', 'portugues'] },
  { key: 'russian', heading: 'Russian', code: 'ru', aliases: ['russian', 'pyccknn'] },
  { key: 'bengali', heading: 'Bengali', code: 'bn', aliases: ['bengali', 'bangla'] },
  { key: 'tamil', heading: 'Tamil', code: 'ta', aliases: ['tamil'] },
  { key: 'telugu', heading: 'Telugu', code: 'te', aliases: ['telugu'] },
  { key: 'gujarati', heading: 'Gujarati', code: 'gu', aliases: ['gujarati'] },
  { key: 'marathi', heading: 'Marathi', code: 'mr', aliases: ['marathi'] },
  { key: 'indonesian', heading: 'Indonesian', code: 'id', aliases: ['indonesian', 'indonesia'] },
  { key: 'malay', heading: 'Malay', code: 'ms', aliases: ['malay', 'bahasa melayu'] },
];

const languageNamePattern = availableTranslationLanguages
  .flatMap((language) => [language.heading, language.key, ...(language.aliases || [])])
  .map((name) => escapeRegExp(name))
  .join('|');

const localVocabulary = {
  actor: {
    word: 'actor',
    partOfSpeech: 'noun',
    definition: 'An actor is a person who performs in movies, television shows, or plays.',
    example: 'The actors often speak fast.',
    translations: {
      Urdu: 'اداکار',
      Punjabi: 'اداکار',
      Hindi: 'अभिनेता / कलाकार',
      Arabic: 'ممثل',
      French: 'acteur',
      German: 'Schauspieler',
      Spanish: 'actor',
      Turkish: 'oyuncu',
    },
    contextHint: 'the people acting or performing, especially in movies, television shows, or plays.',
  },
  actress: {
    word: 'actress',
    partOfSpeech: 'noun',
    definition: 'An actress is a female actor who performs in movies, television shows, or plays.',
    example: 'The actress performed the scene beautifully.',
    translations: {
      Urdu: 'اداکارہ',
      Punjabi: 'اداکارہ',
      Hindi: 'अभिनेत्री',
      Arabic: 'ممثلة',
      French: 'actrice',
      German: 'Schauspielerin',
      Spanish: 'actriz',
      Turkish: 'kadın oyuncu',
    },
    contextHint: 'a female performer in a movie, television show, or play.',
  },
  difficult: {
    word: 'difficult',
    partOfSpeech: 'adjective',
    definition: 'Hard to do, understand, or deal with.',
    example: 'This exam is difficult.',
    translations: {
      Urdu: 'مشکل',
      Punjabi: 'اوکھا / مشکل',
      Hindi: 'कठिन / मुश्किल',
      Arabic: 'صعب',
      French: 'difficile',
      German: 'schwierig',
      Spanish: 'difícil',
      Turkish: 'zor',
    },
    contextHint: 'something is hard to understand, follow, do, or manage.',
  },
  conversation: {
    word: 'conversation',
    partOfSpeech: 'noun',
    definition: 'A talk between two or more people.',
    example: 'Their conversation was easy to understand.',
    translations: {
      Urdu: 'گفتگو',
      Punjabi: 'گل بات',
      Hindi: 'बातचीत',
      Arabic: 'محادثة',
      French: 'conversation',
      German: 'Gespräch',
      Spanish: 'conversación',
      Turkish: 'konuşma',
    },
    contextHint: 'people speaking with each other.',
  },
  moment: {
    word: 'moment',
    partOfSpeech: 'noun',
    definition: 'A very short period of time, or a particular point in time.',
    example: 'Please wait a moment while I check the file.',
    translations: {
      Urdu: 'لمحہ',
      Punjabi: 'لمحہ',
      Hindi: 'पल / क्षण',
      Arabic: 'لحظة',
      French: 'moment',
      German: 'Moment / Augenblick',
      Spanish: 'momento',
      Turkish: 'an',
    },
    contextHint: 'a brief point or short period in the situation being discussed.',
  },
  exciting: {
    word: 'exciting',
    partOfSpeech: 'adjective',
    definition: 'Making you feel interested, happy, or full of energy.',
    example: 'Watching movies can be exciting.',
    translations: {
      Urdu: 'دلچسپ / پرجوش',
      Punjabi: 'دلچسپ / جوش بھرا',
      Hindi: 'रोमांचक',
      Arabic: 'مثير',
      French: 'passionnant',
      German: 'spannend',
      Spanish: 'emocionante',
      Turkish: 'heyecan verici',
    },
    contextHint: 'something enjoyable, interesting, or full of energy.',
  },
  subtitle: {
    word: 'subtitle',
    partOfSpeech: 'noun',
    definition: 'Words shown on a screen that translate or write what people are saying.',
    example: 'I watched the movie with subtitles.',
    translations: {
      Urdu: 'سب ٹائٹل / ترجمہ',
      Punjabi: 'سب ٹائٹل',
      Hindi: 'उपशीर्षक',
      Arabic: 'ترجمة مكتوبة',
      French: 'sous-titre',
      German: 'Untertitel',
      Spanish: 'subtítulo',
      Turkish: 'altyazı',
    },
    contextHint: 'written words that help viewers understand speech in a movie or video.',
  },
  understand: {
    word: 'understand',
    partOfSpeech: 'verb',
    definition: 'To know the meaning of something, or to know how something works.',
    example: 'I understand the meaning of this word.',
    translations: {
      Urdu: 'سمجھنا',
      Punjabi: 'سمجھنا',
      Hindi: 'समझना',
      Arabic: 'يفهم / فهم',
      French: 'comprendre',
      German: 'verstehen',
      Spanish: 'entender',
      Turkish: 'anlamak',
    },
    contextHint: 'knowing the meaning, idea, or message being discussed.',
  },
  understanding: {
    word: 'understanding',
    partOfSpeech: 'noun',
    definition: 'Knowledge about the meaning of something, or the ability to understand it.',
    example: 'Subtitles can improve understanding.',
    translations: {
      Urdu: 'سمجھ',
      Punjabi: 'سمجھ',
      Hindi: 'समझ',
      Arabic: 'فهم',
      French: 'compréhension',
      German: 'Verständnis',
      Spanish: 'comprensión',
      Turkish: 'anlayış',
    },
    contextHint: 'the ability to follow or know the meaning of something.',
  },
};

const extendedLocalTranslations = {
  actor: {
    Chinese: '演员',
    Japanese: '俳優',
    Korean: '배우',
    Italian: 'attore',
    Portuguese: 'ator',
    Russian: 'актер',
    Bengali: 'অভিনেতা',
    Tamil: 'நடிகர்',
    Telugu: 'నటుడు',
    Gujarati: 'અભિનેતા',
    Marathi: 'अभिनेता',
    Indonesian: 'aktor',
    Malay: 'pelakon',
  },
  actress: {
    Chinese: '女演员',
    Japanese: '女優',
    Korean: '여배우',
    Italian: 'attrice',
    Portuguese: 'atriz',
    Russian: 'актриса',
    Bengali: 'অভিনেত্রী',
    Tamil: 'நடிகை',
    Telugu: 'నటి',
    Gujarati: 'અભિનેત્રી',
    Marathi: 'अभिनेत्री',
    Indonesian: 'aktris',
    Malay: 'pelakon wanita',
  },
  difficult: {
    Chinese: '困难的',
    Japanese: '難しい',
    Korean: '어려운',
    Italian: 'difficile',
    Portuguese: 'difícil',
    Russian: 'трудный / сложный',
    Bengali: 'কঠিন',
    Tamil: 'கடினமான',
    Telugu: 'కష్టం',
    Gujarati: 'મુશ્કેલ',
    Marathi: 'कठीण',
    Indonesian: 'sulit',
    Malay: 'sukar',
  },
  exciting: {
    Chinese: '令人兴奋的',
    Japanese: 'わくわくする',
    Korean: '신나는',
    Italian: 'emozionante',
    Portuguese: 'emocionante',
    Russian: 'захватывающий',
    Bengali: 'উত্তেজনাপূর্ণ',
    Tamil: 'சுவாரஸ்யமான',
    Telugu: 'ఆసక్తికరమైన',
    Gujarati: 'રોમાંચક',
    Marathi: 'रोमांचक',
    Indonesian: 'menarik',
    Malay: 'menarik',
  },
  conversation: {
    Chinese: '对话',
    Japanese: '会話',
    Korean: '대화',
    Italian: 'conversazione',
    Portuguese: 'conversa',
    Russian: 'разговор',
    Bengali: 'কথোপকথন',
    Tamil: 'உரையாடல்',
    Telugu: 'సంభాషణ',
    Gujarati: 'વાતચીત',
    Marathi: 'संभाषण',
    Indonesian: 'percakapan',
    Malay: 'perbualan',
  },
  moment: {
    Chinese: '时刻',
    Japanese: '瞬間',
    Korean: '순간',
    Italian: 'momento',
    Portuguese: 'momento',
    Russian: 'момент',
    Bengali: 'মুহূর্ত',
    Tamil: 'தருணம்',
    Telugu: 'క్షణం',
    Gujarati: 'ક્ષણ',
    Marathi: 'क्षण',
    Indonesian: 'momen',
    Malay: 'saat',
  },
  subtitle: {
    Chinese: '字幕',
    Japanese: '字幕',
    Korean: '자막',
    Italian: 'sottotitolo',
    Portuguese: 'legenda',
    Russian: 'субтитры',
    Bengali: 'সাবটাইটেল',
    Tamil: 'வரிகள்',
    Telugu: 'ఉపశీర్షిక',
    Gujarati: 'સબટાઇટલ',
    Marathi: 'उपशीर्षक',
    Indonesian: 'teks film',
    Malay: 'sari kata',
  },
};

function normalize(value = '') {
  return String(value)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanTerm(value = '') {
  return String(value)
    .replace(/[?!.,"'`]/g, ' ')
    .replace(/[“”‘’]/g, ' ')
    .replace(/\b(the|this|that|word|phrase|text|transcript|meaning|mean|means|define|definition|translate|translation|of|in|from|to|ka|matlab)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeRegExp(value = '') {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function extractVocabularyTerm(question = '') {
  const text = String(question || '').trim();
  const quoted = text.match(/["'“”‘’]([^"'“”‘’]{1,100})["'“”‘’]/);

  if (quoted?.[1]) return cleanTerm(quoted[1]);

  const languageSuffix = `(?:\\s+(?:to|in)\\s+(?:${languageNamePattern}))?`;
  const patterns = [
    new RegExp(`translate\\s+(.+?)${languageSuffix}\\??$`, 'i'),
    new RegExp(`define\\s+(.+?)${languageSuffix}\\??$`, 'i'),
    new RegExp(`definition\\s+of\\s+(.+?)${languageSuffix}\\??$`, 'i'),
    new RegExp(`meaning\\s+of\\s+(.+?)${languageSuffix}\\??$`, 'i'),
    new RegExp(`what\\s+is\\s+(.+?)${languageSuffix}\\??$`, 'i'),
    new RegExp(`what\\s+does\\s+(.+?)\\s+mean${languageSuffix}\\??$`, 'i'),
    new RegExp(`(.+?)\\s+(?:meaning|definition|translation)${languageSuffix}\\??$`, 'i'),
    new RegExp(`(.+?)\\s+(?:to|in)\\s+(?:${languageNamePattern})\\??$`, 'i'),
    /what\s+(?:is|does)\s+(.+?)\s+mean\??$/i,
    /what\s+is\s+(.+?)\??$/i,
    /(.+?)\s+in\s+(?:urdu|punjabi|hindi|arabic|french|german|spanish|turkish)\??$/i,
    /(.+?)\s+(?:ka\s+matlab|کا\s+مطلب|کا\s+معنی|का\s+मतलब|का\s+अर्थ|means?)\??$/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    const term = cleanTerm(match?.[1] || '');

    if (term && term.split(/\s+/).length <= 5) return term;
  }

  return '';
}

export function isVocabularyQuestion(question = '') {
  const text = String(question || '').trim();
  const languageRequestPattern = new RegExp(`\\b(?:to|in)\\s+(?:${languageNamePattern})\\??$`, 'i');

  if (/^what\s+is\s+(?:this|the)\s+transcript\s+about/i.test(text)) return false;

  return Boolean(
    extractVocabularyTerm(text) &&
      (/^(what\s+is|what\s+does|meaning\s+of|define|definition\s+of|translate)\b/i.test(text) ||
        languageRequestPattern.test(text) ||
        /\b(mean|means|matlab|meaning|definition|translation)\b/i.test(text)),
  );
}

function getVariants(term = '') {
  const key = normalize(term);
  const variants = new Set();

  if (!key) return [];

  variants.add(key);

  if (key.endsWith('ies') && key.length > 3) variants.add(`${key.slice(0, -3)}y`);
  if (key.endsWith('es') && key.length > 3) variants.add(key.slice(0, -2));
  if (key.endsWith('ing') && key.length > 5) variants.add(key.slice(0, -3));
  if (key.endsWith('ed') && key.length > 4) variants.add(key.slice(0, -2));
  if (key.endsWith('s') && key.length > 2) {
    variants.add(key.slice(0, -1));
  } else {
    variants.add(`${key}s`);
    variants.add(`${key}es`);
    if (key.endsWith('y') && key.length > 2) variants.add(`${key.slice(0, -1)}ies`);
  }

  return Array.from(variants).filter(Boolean);
}

function findLocalEntry(term = '') {
  const variants = getVariants(term);
  const key = variants.find((variant) => localVocabulary[variant]);

  return key ? localVocabulary[key] : null;
}

function inferPartOfSpeech(term = '') {
  const key = normalize(term);

  if (/\b(able|ible|al|ful|ic|ive|less|ous|y)$/.test(key)) return 'adjective';
  if (/\b(ing|ed|en|ify|ise|ize)$/.test(key)) return 'verb';
  if (/\b(ly)$/.test(key)) return 'adverb';
  if (/\b(tion|sion|ment|ness|ity|er|or|ist|ian)$/.test(key)) return 'noun';

  return 'common word';
}

function isReadableEnglishTerm(term = '') {
  const value = String(term).trim();
  return /^[a-z][a-z\s-]{1,80}$/i.test(value) && /[aeiouy]/i.test(value);
}

function withTimeout(ms = requestTimeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);

  return {
    signal: controller.signal,
    cleanup() {
      clearTimeout(timeout);
    },
  };
}

async function fetchJson(url) {
  const request = withTimeout();

  try {
    const response = await fetch(url, {
      signal: request.signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'AT2-Transcriber/1.0',
      },
    });

    if (!response.ok) return null;

    return await response.json().catch(() => null);
  } catch {
    return null;
  } finally {
    request.cleanup();
  }
}

async function fetchDictionaryEntry(term = '') {
  const variants = getVariants(term);

  for (const variant of variants) {
    const json = await fetchJson(`${dictionaryEndpoint}/${encodeURIComponent(variant)}`);
    const entry = Array.isArray(json) ? json[0] : null;
    const meaning = entry?.meanings?.find((item) => item?.definitions?.[0]?.definition);
    const definition = meaning?.definitions?.[0]?.definition;

    if (definition) {
      return {
        word: entry.word || variant,
        partOfSpeech: meaning.partOfSpeech || inferPartOfSpeech(variant),
        definition,
        example:
          meaning.definitions.find((item) => item.example)?.example ||
          `The word "${entry.word || variant}" is used in everyday English.`,
        translations: {},
        contextHint: definition.charAt(0).toLowerCase() + definition.slice(1),
        source: 'Dictionary API',
      };
    }
  }

  return null;
}

function decodeHtmlEntities(value = '') {
  const namedEntities = {
    amp: '&',
    apos: "'",
    gt: '>',
    lt: '<',
    nbsp: ' ',
    quot: '"',
  };

  return String(value).replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, entity) => {
    const normalizedEntity = entity.toLowerCase();

    if (normalizedEntity.startsWith('#x')) {
      const codePoint = Number.parseInt(normalizedEntity.slice(2), 16);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : match;
    }

    if (normalizedEntity.startsWith('#')) {
      const codePoint = Number.parseInt(normalizedEntity.slice(1), 10);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : match;
    }

    return namedEntities[normalizedEntity] || match;
  });
}

function sanitizeTranslationText(value = '', sourceTerm = '', options = {}) {
  const allowSameTerm = Boolean(options.allowSameTerm);
  const cleaned = decodeHtmlEntities(value)
    .replace(/<[^>]*>/g, ' ')
    .replace(/[\u0000-\u001f\u007f-\u009f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) return '';
  if (!allowSameTerm && cleaned.toLowerCase() === String(sourceTerm).toLowerCase()) return '';
  if (/[<>]/.test(cleaned)) return '';
  if (/\d{3,}/.test(cleaned)) return '';
  if (/(whatsapp|https?:\/\/|www\.|@|\bemail\b|\bphone\b|\bnumber\b)/i.test(cleaned)) return '';
  if (cleaned.length > 80) return '';

  const sourceWordCount = String(sourceTerm).trim().split(/\s+/).filter(Boolean).length;
  const cleanedWordCount = cleaned.split(/\s+/).filter(Boolean).length;

  if (sourceWordCount <= 2 && cleanedWordCount > 6) return '';

  return cleaned;
}

async function fetchTranslation(term = '', targetCode = '') {
  if (targetCode === 'en') return term;

  const params = new URLSearchParams({
    q: term,
    langpair: `en|${targetCode}`,
  });
  const json = await fetchJson(`${translationEndpoint}?${params.toString()}`);
  const translatedText = json?.responseData?.translatedText;
  const cleanedTranslation = sanitizeTranslationText(translatedText, term);

  return cleanedTranslation;
}

function findLanguageByName(value = '') {
  const normalizedValue = normalize(value);

  if (!normalizedValue || normalizedValue.includes('auto detect')) return null;

  return (
    availableTranslationLanguages.find((language) =>
      [language.heading, language.key, ...(language.aliases || [])].some((alias) => {
        const normalizedAlias = normalize(alias);
        return normalizedValue === normalizedAlias || normalizedValue.includes(normalizedAlias);
      }),
    ) || null
  );
}

function findRequestedLanguage(question = '', selectedLanguage = '') {
  const normalizedQuestion = ` ${normalize(question)} `;

  for (const language of availableTranslationLanguages) {
    const names = [language.heading, language.key, ...(language.aliases || [])];
    const requestedInQuestion = names.some((name) => {
      const normalizedName = normalize(name);
      return normalizedQuestion.includes(` in ${normalizedName} `) || normalizedQuestion.includes(` to ${normalizedName} `);
    });

    if (requestedInQuestion) return language;
  }

  return findLanguageByName(selectedLanguage);
}

function getTranslationTargets(question = '', selectedLanguage = '') {
  const targets = new Map(targetLanguages.map((language) => [language.heading, language]));
  const requestedLanguage = findRequestedLanguage(question, selectedLanguage);

  if (requestedLanguage && requestedLanguage.code !== 'en') {
    targets.set(requestedLanguage.heading, requestedLanguage);
  }

  return Array.from(targets.values());
}

async function buildTranslations(term = '', entry = {}, targets = targetLanguages) {
  const translations = {};
  const extendedTranslations = extendedLocalTranslations[normalize(term)] || {};

  await Promise.all(
    targets.map(async ({ heading, code }) => {
      const localTranslation = sanitizeTranslationText(entry.translations?.[heading], term, { allowSameTerm: true });
      const extendedTranslation = sanitizeTranslationText(extendedTranslations[heading], term, { allowSameTerm: true });
      const fetchedTranslation = await fetchTranslation(term, code);

      translations[heading] =
        localTranslation || extendedTranslation || fetchedTranslation || 'Not available';
    }),
  );

  return translations;
}

function getTranscriptRows(rows = []) {
  if (!Array.isArray(rows)) return [];

  return rows
    .map((row) => ({
      speakerLabel: row?.speakerLabel || 'Speaker',
      start: Number.isFinite(Number(row?.start)) ? Number(row.start) : null,
      text: String(row?.text || '').trim(),
    }))
    .filter((row) => row.text);
}

function findTranscriptContext(term = '', rows = []) {
  const variants = getVariants(term);

  for (const row of getTranscriptRows(rows)) {
    const normalizedText = normalize(row.text);
    const matchedVariant = variants.find((variant) => {
      const boundary = new RegExp(`(^|\\s)${escapeRegExp(variant)}($|\\s)`, 'i');
      return boundary.test(normalizedText) || normalizedText.includes(variant);
    });

    if (matchedVariant) {
      const originalMatch = row.text.match(new RegExp(`\\b${escapeRegExp(matchedVariant)}\\b`, 'i'));
      return {
        row,
        matchedTerm: originalMatch?.[0] || matchedVariant,
      };
    }
  }

  return null;
}

function buildContextText({ term, entry, context }) {
  if (!context) {
    return `"${term}" is not present in this transcript, so this answer uses general vocabulary meaning.`;
  }

  return `In this transcript, "${context.matchedTerm}" means ${entry.contextHint || entry.definition}`;
}

function formatAnswer({ term, entry, translations, context, targets }) {
  const lines = [
    `Word: ${entry.word || term}`,
    `Part of Speech: ${entry.partOfSpeech || inferPartOfSpeech(term)}`,
    `Definition: ${entry.definition}`,
    ...targets.map(({ heading }) => `${heading}: ${translations[heading] || 'Not available'}`),
    `Example: ${entry.example}`,
    `Context: ${buildContextText({ term, entry, context })}`,
  ];

  return lines.join('\n');
}

async function buildOpenAIAnswer({ question, term, transcriptRows, language }) {
  if (!hasOpenAIApiKey()) return null;

  const client = getOpenAIClient();
  const context = findTranscriptContext(term, transcriptRows);
  const requestedLanguage = findRequestedLanguage(question, language);

  try {
    const completion = await client.chat.completions.create({
      model: assistantModel,
      temperature: 0.1,
      messages: [
        {
          role: 'system',
          content:
            'You are a concise vocabulary assistant for transcript Q&A. Answer with these labels: Word, Part of Speech, Definition, Urdu, Punjabi, Hindi, Arabic, French, German, Spanish, Turkish, Example, Context. If a requested language is provided and is not already one of those labels, add that language as its own label before Example. Always define common words directly. Context is additional and must not replace the definition.',
        },
        {
          role: 'user',
          content: JSON.stringify({
            question,
            term,
            selectedLanguage: language,
            requestedLanguage: requestedLanguage?.heading || '',
            transcriptContext: context?.row?.text || '',
          }),
        },
      ],
    });

    return completion.choices?.[0]?.message?.content?.trim() || null;
  } catch {
    return null;
  }
}

export async function buildWordMeaningAnswer({ question, transcriptRows = [], language = 'Auto Detect' }) {
  const term = extractVocabularyTerm(question);

  if (!term) {
    return {
      term: '',
      answer: 'Please type the exact word or phrase you want explained, for example: "What is the meaning of difficult?"',
      source: 'validation',
    };
  }

  const openAIAnswer = await buildOpenAIAnswer({ question, term, transcriptRows, language });

  if (openAIAnswer) {
    return {
      term,
      answer: openAIAnswer,
      source: 'openai',
    };
  }

  const localEntry = findLocalEntry(term);
  const dictionaryEntry = localEntry ? null : await fetchDictionaryEntry(term);
  const entry =
    localEntry ||
    dictionaryEntry ||
    (isReadableEnglishTerm(term)
      ? {
          word: term,
          partOfSpeech: inferPartOfSpeech(term),
          definition: `"${term}" is a common English word. A precise dictionary definition was not available right now, but it can still be understood from normal English usage.`,
          example: `The word "${term}" is used in everyday English.`,
          translations: {},
          contextHint: 'the word is used with its ordinary English meaning.',
          source: 'fallback',
        }
      : null);

  if (!entry) {
    return {
      term,
      answer: [
        `Word: ${term}`,
        'Meaning: The meaning is uncertain because the word is unreadable, severely misspelled, or genuinely unknown.',
        'Context: Please copy the exact word from the transcript and ask again.',
      ].join('\n'),
      source: 'uncertain',
    };
  }

  const translationTargets = getTranslationTargets(question, language);
  const translations = await buildTranslations(entry.word || term, entry, translationTargets);
  const context = findTranscriptContext(term, transcriptRows);

  return {
    term,
    answer: formatAnswer({
      term,
      entry,
      translations,
      context,
      targets: translationTargets,
    }),
    source: entry.source || 'local',
  };
}
