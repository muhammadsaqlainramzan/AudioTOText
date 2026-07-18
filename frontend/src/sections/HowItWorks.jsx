import { FiCpu, FiDownload, FiUploadCloud } from 'react-icons/fi';
import SectionHeading from '../components/SectionHeading.jsx';
import { useApp } from '../context/AppContext.jsx';

export default function HowItWorks() {
  const { t } = useApp();
  const steps = [
    {
      icon: FiUploadCloud,
      title: t('how.uploadTitle'),
      description: t('how.uploadDescription'),
    },
    {
      icon: FiCpu,
      title: t('how.processTitle'),
      description: t('how.processDescription'),
    },
    {
      icon: FiDownload,
      title: t('how.downloadTitle'),
      description: t('how.downloadDescription'),
    },
  ];

  return (
    <section id="how-it-works" className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-container">
        <SectionHeading
          eyebrow={t('how.eyebrow')}
          title={t('how.title')}
          description={t('how.description')}
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
