# AT2 Transcriber Backend

JavaScript Express backend for AI audio-to-text transcription.

## Setup

```bash
npm install
copy .env.example .env
npm run dev
```

Set `DEEPGRAM_API_KEY` in `.env` before making transcription requests. The default Deepgram
model is `nova-3` for the highest-accuracy general-purpose transcription path. Languages outside
Nova coverage fall back to Whisper through the backend language map. Auto Detect uses
`DEEPGRAM_AUTO_DETECT_MODEL`, which defaults to `nova-3-general` so Deepgram can detect the
language and automatically route to the highest available model for that language in one request.

Set `OPENAI_API_KEY` to enable the optional AI transcript correction step. Without it, AT2 still
returns the raw transcript and a correction warning, but it cannot improve spelling or grammar.

The backend preprocesses every upload into transcription-ready WAV:

- Mono audio
- 16 kHz sample rate by default
- PCM 16-bit codec
- Conditional volume normalization with `AUDIO_NORMALIZE=auto`
- Optional denoise with `AUDIO_DENOISE=true`

Deepgram recommends testing denoise carefully because aggressive noise suppression can reduce
accuracy on prerecorded transcription. Keep `AUDIO_DENOISE=false` unless your own samples show
it helps. `AUDIO_NORMALIZE=auto` only normalizes very quiet or near-clipping audio so clean audio
is not unnecessarily altered before ASR.

## API

- `GET /api/health` - service health check
- `GET /api/languages` - supported language labels and ISO codes
- `POST /api/transcriptions` - multipart upload endpoint
- `POST /api/transcriptions/improve` - AI post-processing for an existing raw transcript
- `POST /api/transcriptions/export` - export edited transcripts as TXT, DOCX, PDF, SRT, VTT or JSON

`POST /api/transcriptions` expects:

- `audio` - file field
- `language` - optional language label, such as `English`, `French`, `German`, `Auto Detect`

Supported upload extensions:

- Audio: `mp3`, `wav`, `m4a`, `aac`, `flac`, `ogg`
- Video: `mp4`, `mov`, `avi`, `mkv`, `webm`

The default upload limit is 500 MB. Audio files can be up to 30 minutes long.
Video files can be up to 15 minutes long. Video uploads are converted to audio
before being sent to the transcription provider.

Successful transcription responses include:

- Corrected transcript text
- Speaker segments with timestamps
- Sentence timestamps
- Word timestamps
- Transcript and word confidence scores
- Low-confidence word flags for user review
- Detected language metadata when provided by the transcription provider
