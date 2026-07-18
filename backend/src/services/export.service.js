import fs from 'node:fs';
import PDFDocument from 'pdfkit';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import AppError from '../utils/AppError.js';

const exportFormats = new Set(['txt', 'docx', 'pdf', 'srt', 'vtt', 'json']);

function normalizeFormat(format) {
  const normalized = String(format || '').trim().toLowerCase();

  if (!exportFormats.has(normalized)) {
    throw new AppError('Unsupported export format.', 400);
  }

  return normalized;
}

function sanitizeFileName(fileName = 'at2-transcript') {
  return String(fileName || 'at2-transcript')
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[^a-z0-9-_ ]/gi, '')
    .trim()
    .replace(/\s+/g, '-')
    .toLowerCase() || 'at2-transcript';
}

function getTranscriptText(payload) {
  return String(payload.editedTranscript || payload.transcript || payload.correctedTranscript || '').trim();
}

function getTimedItems(payload) {
  const source = Array.isArray(payload.segments) && payload.segments.length
    ? payload.segments
    : Array.isArray(payload.sentences) && payload.sentences.length
      ? payload.sentences
      : [];

  return source
    .filter((item) => item?.transcript || item?.text)
    .map((item, index) => ({
      index: index + 1,
      text: item.transcript || item.text,
      start: Number.isFinite(Number(item.start)) ? Number(item.start) : null,
      end: Number.isFinite(Number(item.end)) ? Number(item.end) : null,
      speakerLabel: item.speakerLabel || null,
    }));
}

function formatTimestamp(seconds, separator) {
  const totalMilliseconds = Math.max(0, Math.round(Number(seconds || 0) * 1000));
  const hours = Math.floor(totalMilliseconds / 3600000);
  const minutes = Math.floor((totalMilliseconds % 3600000) / 60000);
  const secs = Math.floor((totalMilliseconds % 60000) / 1000);
  const millis = totalMilliseconds % 1000;

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}${separator}${String(millis).padStart(3, '0')}`;
}

function buildSubtitle(payload, format) {
  const items = getTimedItems(payload);
  const text = getTranscriptText(payload);

  if (!items.length && text) {
    items.push({
      index: 1,
      text,
      start: 0,
      end: 5,
      speakerLabel: null,
    });
  }

  const separator = format === 'srt' ? ',' : '.';
  const blocks = items.map((item) => {
    const start = formatTimestamp(item.start ?? 0, separator);
    const end = formatTimestamp(item.end ?? Number(item.start || 0) + 5, separator);
    const textLine = item.speakerLabel ? `${item.speakerLabel}: ${item.text}` : item.text;

    if (format === 'vtt') {
      return `${start} --> ${end}\n${textLine}`;
    }

    return `${item.index}\n${start} --> ${end}\n${textLine}`;
  });

  return `${format === 'vtt' ? 'WEBVTT\n\n' : ''}${blocks.join('\n\n')}\n`;
}

function buildJson(payload) {
  return JSON.stringify(
    {
      transcript: getTranscriptText(payload),
      segments: payload.segments || [],
      sentences: payload.sentences || [],
      words: payload.words || [],
      confidence: payload.confidence || null,
      exportedAt: new Date().toISOString(),
    },
    null,
    2,
  );
}

function splitLines(text, maxLength = 88) {
  const lines = [];

  String(text || '')
    .split(/\r?\n/)
    .forEach((paragraph) => {
      const words = paragraph.split(/\s+/).filter(Boolean);
      let line = '';

      words.forEach((word) => {
        const nextLine = line ? `${line} ${word}` : word;

        if (nextLine.length > maxLength && line) {
          lines.push(line);
          line = word;
          return;
        }

        line = nextLine;
      });

      lines.push(line);
    });

  return lines.length ? lines : [''];
}

async function buildDocx(text) {
  const document = new Document({
    sections: [
      {
        children: splitLines(text, 110).map(
          (line) =>
            new Paragraph({
              children: [
                new TextRun({
                  text: line || ' ',
                  size: 24,
                }),
              ],
            }),
        ),
      },
    ],
  });

  return Packer.toBuffer(document);
}

function resolvePdfFont() {
  const candidates = [
    process.env.PDF_FONT_PATH,
    'C:\\Windows\\Fonts\\Nirmala.ttf',
    'C:\\Windows\\Fonts\\arial.ttf',
    'C:\\Windows\\Fonts\\segoeui.ttf',
  ].filter(Boolean);

  return candidates.find((candidate) => fs.existsSync(candidate)) || null;
}

function buildPdf(text) {
  return new Promise((resolve, reject) => {
    const document = new PDFDocument({
      autoFirstPage: true,
      margin: 48,
      size: 'A4',
      bufferPages: true,
    });
    const chunks = [];
    const fontPath = resolvePdfFont();

    document.on('data', (chunk) => chunks.push(chunk));
    document.on('error', reject);
    document.on('end', () => resolve(Buffer.concat(chunks)));

    if (fontPath) {
      document.font(fontPath);
    }

    document.fontSize(18).text('AT2 Transcriber', { align: 'left' });
    document.moveDown();
    document.fontSize(11).text(text || ' ', {
      align: 'left',
      lineGap: 4,
    });
    document.end();
  });
}

export async function buildTranscriptExport(payload) {
  const format = normalizeFormat(payload.format);
  const text = getTranscriptText(payload);

  if (!text) {
    throw new AppError('Transcript text is required before exporting.', 400);
  }

  const baseName = sanitizeFileName(payload.fileName);
  const filename = `${baseName}.${format}`;

  if (format === 'docx') {
    return {
      buffer: await buildDocx(text),
      contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      filename,
    };
  }

  if (format === 'pdf') {
    return {
      buffer: await buildPdf(text),
      contentType: 'application/pdf',
      filename,
    };
  }

  if (format === 'json') {
    return {
      buffer: Buffer.from(buildJson(payload), 'utf8'),
      contentType: 'application/json; charset=utf-8',
      filename,
    };
  }

  if (format === 'srt' || format === 'vtt') {
    return {
      buffer: Buffer.from(buildSubtitle(payload, format), 'utf8'),
      contentType: format === 'srt' ? 'application/x-subrip; charset=utf-8' : 'text/vtt; charset=utf-8',
      filename,
    };
  }

  return {
    buffer: Buffer.from(`${text}\n`, 'utf8'),
    contentType: 'text/plain; charset=utf-8',
    filename,
  };
}
