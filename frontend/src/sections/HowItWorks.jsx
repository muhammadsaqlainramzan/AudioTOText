import { FiCpu, FiDownload, FiUploadCloud } from 'react-icons/fi';
import SectionHeading from '../components/SectionHeading.jsx';

const steps = [
  {
    icon: FiUploadCloud,
    title: 'Upload Audio',
    description: 'Drop in audio or video files from meetings, interviews, podcasts or lectures.',
  },
  {
    icon: FiCpu,
    title: 'AI Processes Speech',
    description: 'AT2 detects speech, languages, speakers and timestamps with advanced AI models.',
  },
  {
    icon: FiDownload,
    title: 'Download Transcript',
    description: 'Export clean transcripts in TXT, DOCX, PDF or SRT for captions and workflows.',
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-container">
        <SectionHeading
          eyebrow="How It Works"
          title="From audio file to polished transcript in three steps."
          description="AT2 keeps the workflow focused on upload, processing and export so transcription feels instant."
        />

        <div className="grid gap-5 lg:grid-cols-3">
          {steps.map((step, index) => {
            const Icon = step.icon;

            return (
              <div key={step.title} className="relative">
                <div className="glass-card h-full rounded-card border border-white/10 bg-white/[.04] p-7 shadow-premium transition duration-300 hover:-translate-y-2 hover:border-royal-500/35 hover:shadow-glow">
                  <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-royal-500/30 bg-royal-600/15 text-royal-400">
                    <Icon className="h-7 w-7" />
                  </div>
                  <span className="text-sm font-semibold uppercase tracking-[.18em] text-slate-500">
                    0{index + 1}
                  </span>
                  <h3 className="mt-3 text-2xl font-semibold text-white">{step.title}</h3>
                  <p className="mt-3 text-base leading-7 text-slate-400">{step.description}</p>
                </div>
                {index < steps.length - 1 ? (
                  <div className="pointer-events-none absolute right-[-20px] top-1/2 hidden h-px w-10 bg-gradient-to-r from-royal-500 to-transparent lg:block" />
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
