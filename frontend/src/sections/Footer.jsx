import { useApp } from '../context/AppContext.jsx';

const companyUrl = 'https://m-techexpertsolutions.com/';

export default function Footer() {
  const { t } = useApp();
  const columns = [
    {
      title: t('footer.features'),
      links: [
        { label: t('footer.speechRecognition') },
        { label: t('footer.speakerDetection') },
        { label: t('footer.exportFormats') },
      ],
    },
    {
      title: t('footer.resources'),
      links: [
        { label: t('footer.helpCenter'), href: companyUrl },
        { label: t('footer.supportedFormats') },
        { label: t('footer.security') },
      ],
    },
    {
      title: t('footer.company'),
      links: [
        { label: t('footer.about'), href: companyUrl },
        { label: t('footer.contact'), href: companyUrl },
        { label: t('footer.privacy') },
      ],
    },
  ];

  return (
    <footer className="border-t border-white/10 px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-container">
        <div className="grid gap-10 md:grid-cols-[1.3fr_repeat(3,1fr)]">
          <div>
            <a href="#top" className="flex items-center gap-3">
              <img src="/at2-mark.svg" alt="" className="h-10 w-10 rounded-xl shadow-glow" />
              <span className="text-lg font-semibold text-white">AT2 Transcriber</span>
            </a>
            <p className="mt-4 max-w-sm text-sm leading-6 text-slate-400">
              {t('footer.description')}
            </p>
          </div>

          {columns.map((column) => (
            <div key={column.title}>
              <h3 className="text-sm font-semibold uppercase tracking-[.18em] text-slate-500">
                {column.title}
              </h3>
              <ul className="mt-4 space-y-3">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href || '#top'}
                      target={link.href ? '_blank' : undefined}
                      rel={link.href ? 'noreferrer' : undefined}
                      className="text-sm text-slate-300 transition hover:text-white"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t border-white/10 pt-6 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <span>&copy; 2026 AT2 Transcriber</span>
          <span>{t('footer.rights')}</span>
        </div>
      </div>
    </footer>
  );
}
