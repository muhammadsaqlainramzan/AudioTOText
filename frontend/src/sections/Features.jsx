import {
  FiDownloadCloud,
  FiGlobe,
  FiShield,
  FiUsers,
  FiZap,
} from 'react-icons/fi';
import SectionHeading from '../components/SectionHeading.jsx';
import { useApp } from '../context/AppContext.jsx';

export default function Features() {
  const { t } = useApp();
  const features = [
    {
      icon: FiZap,
      title: t('features.speechTitle'),
      description: t('features.speechDescription'),
    },
    {
      icon: FiGlobe,
      title: t('features.languageTitle'),
      description: t('features.languageDescription'),
    },
    {
      icon: FiUsers,
      title: t('features.speakerTitle'),
      description: t('features.speakerDescription'),
    },
    {
      icon: FiZap,
      title: t('features.fastTitle'),
      description: t('features.fastDescription'),
    },
    {
      icon: FiShield,
      title: t('features.storageTitle'),
      description: t('features.storageDescription'),
    },
    {
      icon: FiDownloadCloud,
      title: t('features.exportTitle'),
      description: t('features.exportDescription'),
    },
  ];

  return (
    <section id="features" className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-container">
        <SectionHeading
          eyebrow={t('features.eyebrow')}
          title={t('features.title')}
          description={t('features.description')}
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
