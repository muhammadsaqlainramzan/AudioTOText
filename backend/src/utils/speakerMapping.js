function getSpeakerKey(rawSpeaker) {
  if (rawSpeaker === undefined || rawSpeaker === null || rawSpeaker === '') {
    return 'unknown';
  }

  return `${typeof rawSpeaker}:${String(rawSpeaker)}`;
}

export function createSpeakerMapper() {
  const speakerIndexes = new Map();

  return function mapSpeaker(rawSpeaker) {
    const key = getSpeakerKey(rawSpeaker);

    if (!speakerIndexes.has(key)) {
      speakerIndexes.set(key, speakerIndexes.size + 1);
    }

    const speakerNumber = speakerIndexes.get(key);

    return {
      speaker: speakerNumber - 1,
      originalSpeaker: rawSpeaker ?? null,
      speakerLabel: `Speaker ${speakerNumber}`,
    };
  };
}

function getRawSpeakerIdentity(item = {}, fallbackSpeaker = null) {
  return item.originalSpeaker ?? item.speaker ?? item.speakerLabel ?? fallbackSpeaker;
}

export function remapSpeakerSegments(segments = []) {
  if (!Array.isArray(segments) || segments.length === 0) {
    return [];
  }

  const mapSpeaker = createSpeakerMapper();

  return segments.map((segment) => {
    const rawSpeaker = getRawSpeakerIdentity(segment);
    const mappedSegment = mapSpeaker(rawSpeaker);
    const words = Array.isArray(segment.words)
      ? segment.words.map((word) => {
          const mappedWord = mapSpeaker(getRawSpeakerIdentity(word, rawSpeaker));

          return {
            ...word,
            speaker: mappedWord.speaker,
            originalSpeaker: mappedWord.originalSpeaker,
            speakerLabel: mappedWord.speakerLabel,
          };
        })
      : segment.words;

    return {
      ...segment,
      speaker: mappedSegment.speaker,
      originalSpeaker: mappedSegment.originalSpeaker,
      speakerLabel: mappedSegment.speakerLabel,
      words,
    };
  });
}
