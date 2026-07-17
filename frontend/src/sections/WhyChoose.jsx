import { FiShield, FiTarget, FiZap } from 'react-icons/fi';
import SectionHeading from '../components/SectionHeading.jsx';

const reasons = [
  {
    icon: FiZap,
    title: 'Lightning Fast',
    description: 'Most files transcribed in under one minute.',
  },
  {
    icon: FiTarget,
    title: 'High Accuracy',
    description: 'Powered by advanced AI speech recognition.',
  },
  {
    icon: FiShield,
    title: 'Privacy First',
    description: 'Files are encrypted and automatically deleted after processing.',
  },
];

export default function WhyChoose() {
  return (
    <section className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-container">
        <SectionHeading
          eyebrow="Why Choose AT2"
          title="Premium transcription without workflow noise."
        />

        <div className="space-y-4">
          {reasons.map((reason) => {
            const Icon = reason.icon;

            return (
              <div
                key={reason.title}
                className="glass-card flex flex-col gap-5 rounded-card border border-white/10 bg-white/[.04] p-6 shadow-premium transition duration-300 hover:-translate-y-1 hover:border-royal-500/35 sm:flex-row sm:items-center"
              >
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-royal-500/30 bg-royal-600/15 text-royal-400">
                  <Icon className="h-7 w-7" />
                </div>
                <div>
                  <h3 className="text-2xl font-semibold text-white">{reason.title}</h3>
                  <p className="mt-2 text-base leading-7 text-slate-400">{reason.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
