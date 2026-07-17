import {
  FiDownloadCloud,
  FiGlobe,
  FiShield,
  FiUsers,
  FiZap,
} from 'react-icons/fi';
import SectionHeading from '../components/SectionHeading.jsx';

const features = [
  {
    icon: FiZap,
    title: 'Speech Recognition',
    description: 'High-fidelity audio recognition keeps transcripts readable and searchable.',
  },
  {
    icon: FiGlobe,
    title: 'Multi-language Support',
    description: 'Transcribe content across 100+ languages for global teams and creators.',
  },
  {
    icon: FiUsers,
    title: 'Speaker Detection',
    description: 'Separate voices automatically across meetings, podcasts and interviews.',
  },
  {
    icon: FiZap,
    title: 'Lightning Fast Processing',
    description: 'Optimized AI processing helps most files finish in under one minute.',
  },
  {
    icon: FiShield,
    title: 'Secure Cloud Storage',
    description: 'Encrypted upload and controlled retention keep sensitive audio protected.',
  },
  {
    icon: FiDownloadCloud,
    title: 'Export to TXT DOCX PDF SRT',
    description: 'Download transcripts for notes, reports, captions and publishing workflows.',
  },
];

export default function Features() {
  return (
    <section id="features" className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-container">
        <SectionHeading
          eyebrow="AI Features"
          title="Everything a modern transcription workflow needs."
          description="Built around accuracy, export flexibility and a premium upload experience."
        />

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;

            return (
              <div
                key={feature.title}
                className="glass-card rounded-card border border-white/10 bg-white/[.04] p-6 shadow-premium transition duration-300 hover:-translate-y-2 hover:border-royal-500/35"
              >
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-navy-950/70 text-royal-400">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-semibold text-white">{feature.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-400">{feature.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
