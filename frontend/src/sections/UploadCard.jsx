import { useCallback, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { FiCheckCircle, FiChevronDown, FiGlobe, FiUploadCloud, FiVideo } from 'react-icons/fi';
import { useApp } from '../context/AppContext.jsx';

const supportedFormats = ['MP3', 'WAV', 'MP4', 'M4A', 'AAC'];
const supportedTypes = ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/x-m4a', 'audio/aac', 'video/mp4'];
const maxSize = 2 * 1024 * 1024 * 1024;

function formatFileSize(size) {
  if (!size) return '';
  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
}

export default function UploadCard() {
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState('');
  const { language, setLanguage, languages } = useApp();
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({ mode: 'onChange' });

  const fileRules = useMemo(
    () => ({
      required: 'Choose an audio or video file first.',
      validate: {
        supported: (files) => {
          const file = files?.[0];
          if (!file) return 'Choose an audio or video file first.';
          const extension = file.name.split('.').pop()?.toUpperCase();
          return (
            supportedTypes.includes(file.type) ||
            supportedFormats.includes(extension) ||
            'Use MP3, WAV, MP4, M4A or AAC.'
          );
        },
        size: (files) => {
          const file = files?.[0];
          return !file || file.size <= maxSize || 'Maximum file size is 2GB.';
        },
      },
    }),
    [],
  );

  const onFileChange = useCallback((files) => {
    const file = files?.[0];
    setFileName(file?.name || '');
    setFileSize(formatFileSize(file?.size));
  }, []);

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

  const onSubmit = () => {
    toast.success('Audio ready for transcription. Backend connection comes next.');
  };

  return (
    <form
      id="upload"
      onSubmit={handleSubmit(onSubmit)}
      onDragOver={(event) => event.preventDefault()}
      onDrop={onDrop}
      className="glass-card mx-auto w-full max-w-[1120px] rounded-[24px] border border-royal-500/30 bg-[rgba(30,45,80,.45)] p-5 shadow-premium shadow-blue-950/40 transition duration-300 hover:border-royal-400/45 hover:shadow-glow sm:p-8 lg:p-10"
    >
      <label className="flex min-h-[300px] cursor-pointer flex-col items-center justify-center rounded-card border border-dashed border-royal-500/35 bg-royal-600/[.06] px-5 py-8 text-center transition hover:border-royal-400/70 hover:bg-royal-600/10 sm:min-h-[340px]">
        <input
          type="file"
          className="sr-only"
          accept=".mp3,.wav,.mp4,.m4a,.aac,audio/*,video/mp4"
          {...register('audio', {
            ...fileRules,
            onChange: (event) => onFileChange(event.target.files),
          })}
        />
        <span className="mb-8 flex h-16 w-16 items-center justify-center rounded-2xl border border-royal-400/40 bg-royal-600/15 text-royal-400 shadow-glow">
          {fileName ? <FiVideo className="h-9 w-9" /> : <FiUploadCloud className="h-9 w-9" />}
        </span>

        <span className="max-w-3xl break-words text-2xl font-semibold text-white">
          {fileName || 'Drag & drop your audio file here'}
        </span>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
          <span className="rounded-full border border-white/10 bg-white/[.05] px-3 py-1 text-sm font-semibold text-royal-100">
            {fileName ? 'Video' : 'Browse Files'}
          </span>
          {fileSize ? <span className="text-sm font-medium text-slate-300">{fileSize}</span> : null}
          {!fileName ? (
            <span className="text-sm font-medium text-slate-400">
              MP3, WAV, MP4, M4A or AAC up to 2GB
            </span>
          ) : null}
        </div>
      </label>

      {errors.audio ? <p className="mt-3 text-sm text-red-300">{errors.audio.message}</p> : null}

      <div className="mx-auto mt-7 max-w-2xl text-left">
        <label htmlFor="transcription-language" className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-200">
          <FiGlobe className="h-5 w-5 text-slate-400" />
          Select Language
        </label>
        <div className="relative">
          <select
            id="transcription-language"
            value={language}
            onChange={(event) => setLanguage(event.target.value)}
            className="h-14 w-full appearance-none rounded-input border border-white/12 bg-navy-950/70 px-5 pr-12 text-base font-semibold text-white outline-none transition focus:border-royal-500/70 focus:ring-4 focus:ring-royal-600/15"
          >
            {languages.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-slate-400">
            <FiChevronDown className="h-5 w-5" />
          </div>
        </div>
      </div>

      <button
        type="submit"
        className="button-glow mx-auto mt-6 flex h-14 min-w-64 items-center justify-center gap-2 rounded-button bg-royal-600 px-7 text-base font-semibold text-white shadow-glow transition hover:-translate-y-0.5 hover:bg-royal-500"
      >
        <FiCheckCircle className="h-5 w-5" />
        Start Transcription
      </button>

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
