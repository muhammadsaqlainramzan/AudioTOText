import UploadCard from './UploadCard.jsx';
import { useApp } from '../context/AppContext.jsx';

export default function Hero() {
  const { t } = useApp();

  return (
    <section id="top" className="relative">
      <div className="mx-auto flex max-w-container flex-col items-center px-4 pb-16 pt-14 text-center sm:px-6 sm:pt-16 lg:px-8 lg:pb-24 lg:pt-20">
        <div className="animate-fadeUp flex max-w-5xl flex-col items-center">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[.04] px-4 py-2 text-sm font-medium text-slate-300 backdrop-blur-xl">
            <span className="h-2 w-2 rounded-full bg-royal-500 shadow-[0_0_18px_rgba(79,140,255,.9)]" />
            {t('hero.badge')}
          </div>

          <h1 className="max-w-5xl text-4xl font-semibold leading-[1.08] text-white sm:text-6xl lg:text-[68px]">
            {t('hero.titlePrefix')}{' '}
            <span className="bg-gradient-to-r from-royal-400 via-royal-500 to-royal-700 bg-clip-text text-transparent">
              {t('hero.titleHighlight')}
            </span>{' '}
            {t('hero.titleSuffix')}
          </h1>

          <p className="mt-6 max-w-4xl text-lg leading-8 text-slate-300 sm:text-xl">
            {t('hero.description')}
          </p>
        </div>

        <div className="mt-12 w-full animate-fadeUp" style={{ animationDelay: '120ms' }}>
          <UploadCard />
        </div>
      </div>
    </section>
  );
}
