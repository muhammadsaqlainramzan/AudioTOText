const gurmukhiConsonants = {
  ਕ: 'ک',
  ਖ: 'کھ',
  ਗ: 'گ',
  ਘ: 'گھ',
  ਙ: 'نگ',
  ਚ: 'چ',
  ਛ: 'چھ',
  ਜ: 'ج',
  ਝ: 'جھ',
  ਞ: 'نج',
  ਟ: 'ٹ',
  ਠ: 'ٹھ',
  ਡ: 'ڈ',
  ਢ: 'ڈھ',
  ਣ: 'ن',
  ਤ: 'ت',
  ਥ: 'تھ',
  ਦ: 'د',
  ਧ: 'دھ',
  ਨ: 'ن',
  ਪ: 'پ',
  ਫ: 'پھ',
  ਬ: 'ب',
  ਭ: 'بھ',
  ਮ: 'م',
  ਯ: 'ی',
  ਰ: 'ر',
  ਲ: 'ل',
  ਵ: 'و',
  ਸ਼: 'ش',
  ਸ: 'س',
  ਹ: 'ہ',
  ਖ਼: 'خ',
  ਗ਼: 'غ',
  ਜ਼: 'ز',
  ੜ: 'ڑ',
  ਫ਼: 'ف',
  ਲ਼: 'ل',
};

const gurmukhiNuktaConsonants = {
  ਕ਼: 'ق',
  ਖ਼: 'خ',
  ਗ਼: 'غ',
  ਜ਼: 'ز',
  ਫ਼: 'ف',
  ਸ਼: 'ش',
  ਲ਼: 'ل',
  ਰ਼: 'ڑ',
};

const gurmukhiIndependentVowels = {
  ੳ: 'ا',
  ਅ: 'ا',
  ਆ: 'آ',
  ਇ: 'ا',
  ਈ: 'ای',
  ਉ: 'ا',
  ਊ: 'او',
  ਏ: 'اے',
  ਐ: 'اے',
  ਓ: 'او',
  ਔ: 'او',
};

const gurmukhiVowelSigns = {
  'ਾ': 'ا',
  'ਿ': '',
  'ੀ': 'ی',
  'ੁ': '',
  'ੂ': 'و',
  'ੇ': 'ے',
  'ੈ': 'ے',
  'ੋ': 'و',
  'ੌ': 'و',
};

const devanagariConsonants = {
  क: 'ک',
  ख: 'کھ',
  ग: 'گ',
  घ: 'گھ',
  ङ: 'نگ',
  च: 'چ',
  छ: 'چھ',
  ज: 'ج',
  झ: 'جھ',
  ञ: 'نج',
  ट: 'ٹ',
  ठ: 'ٹھ',
  ड: 'ڈ',
  ढ: 'ڈھ',
  ण: 'ن',
  त: 'ت',
  थ: 'تھ',
  द: 'د',
  ध: 'دھ',
  न: 'ن',
  प: 'پ',
  फ: 'پھ',
  ब: 'ب',
  भ: 'بھ',
  म: 'م',
  य: 'ی',
  र: 'ر',
  ल: 'ل',
  व: 'و',
  श: 'ش',
  ष: 'ش',
  स: 'س',
  ह: 'ہ',
};

const devanagariNuktaConsonants = {
  क़: 'ق',
  ख़: 'خ',
  ग़: 'غ',
  ज़: 'ز',
  ड़: 'ڑ',
  ढ़: 'ڑھ',
  फ़: 'ف',
  य़: 'ی',
};

const devanagariIndependentVowels = {
  अ: 'ا',
  आ: 'آ',
  इ: 'ا',
  ई: 'ای',
  उ: 'ا',
  ऊ: 'او',
  ए: 'اے',
  ऐ: 'اے',
  ओ: 'او',
  औ: 'او',
};

const devanagariVowelSigns = {
  'ा': 'ا',
  'ि': '',
  'ी': 'ی',
  'ु': '',
  'ू': 'و',
  'े': 'ے',
  'ै': 'ے',
  'ो': 'و',
  'ौ': 'و',
};

const punctuation = {
  '।': '۔',
  '॥': '۔',
};
const commonWordFixes = [
  [/ہجار/g, 'ہزار'],
  [/جرور/g, 'ضرور'],
  [/جروت/g, 'ضرورت'],
  [/جیادا/g, 'زیادہ'],
];

const gurmukhiNasalSigns = new Set(['ਂ', 'ੰ']);
const devanagariNasalSigns = new Set(['ं', 'ँ']);
const skipSigns = new Set(['੍', '्', 'ੱ', '઼', '਼', '़', 'ਃ', 'ः']);
const indicPattern = /[\u0900-\u097F\u0A00-\u0A7F]/;
const gurmukhiConsonantSet = new Set(Object.keys(gurmukhiConsonants));
const devanagariConsonantSet = new Set(Object.keys(devanagariConsonants));

function nextIsConsonant(text, index) {
  const next = text[index + 1];
  return gurmukhiConsonantSet.has(next) || devanagariConsonantSet.has(next);
}

function transliterateCharacter(text, index) {
  const character = text[index];
  const next = text[index + 1];
  const gurmukhiCombined = `${character}${next}`;

  if (gurmukhiNuktaConsonants[gurmukhiCombined]) {
    return {
      value: gurmukhiNuktaConsonants[gurmukhiCombined],
      consumed: 2,
    };
  }

  if (devanagariNuktaConsonants[gurmukhiCombined]) {
    return {
      value: devanagariNuktaConsonants[gurmukhiCombined],
      consumed: 2,
    };
  }

  if (gurmukhiNasalSigns.has(character) || devanagariNasalSigns.has(character)) {
    return {
      value: nextIsConsonant(text, index) ? 'ن' : 'ں',
      consumed: 1,
    };
  }

  if (skipSigns.has(character)) {
    return {
      value: '',
      consumed: 1,
    };
  }

  const value =
    gurmukhiConsonants[character] ??
    gurmukhiIndependentVowels[character] ??
    gurmukhiVowelSigns[character] ??
    devanagariConsonants[character] ??
    devanagariIndependentVowels[character] ??
    devanagariVowelSigns[character] ??
    punctuation[character] ??
    character;

  return {
    value,
    consumed: 1,
  };
}

export function transliteratePunjabiToShahmukhi(text = '') {
  const source = String(text || '');

  if (!indicPattern.test(source)) {
    return source;
  }

  let output = '';

  for (let index = 0; index < source.length;) {
    const result = transliterateCharacter(source, index);
    output += result.value;
    index += result.consumed;
  }

  return commonWordFixes.reduce((current, [pattern, replacement]) => current.replace(pattern, replacement), output);
}

export function normalizeTranscriptForLanguage(transcription, language) {
  if (language?.outputScript !== 'shahmukhi') {
    return transcription;
  }

  const text = transliteratePunjabiToShahmukhi(transcription.text || '');
  const rawText = transliteratePunjabiToShahmukhi(transcription.rawText || transcription.text || '');
  const segments = Array.isArray(transcription.segments)
    ? transcription.segments.map((segment) => ({
        ...segment,
        transcript: transliteratePunjabiToShahmukhi(segment.transcript || ''),
      }))
    : transcription.segments;

  return {
    ...transcription,
    text,
    rawText,
    segments,
  };
}
