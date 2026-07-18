import { useState } from 'react';
import { FiChevronDown, FiGlobe, FiMenu, FiX } from 'react-icons/fi';
import { useApp } from '../context/AppContext.jsx';

function Logo() {
  const { t } = useApp();

  return (
    <a href="#top" className="flex items-center gap-3" aria-label={t('nav.home')}>
      <img src="/at2-mark.svg" alt="" className="h-9 w-9 rounded-xl shadow-glow" />
      <span className="text-base font-semibold tracking-normal text-white sm:text-lg">AT2 Transcriber</span>
    </a>
  );
}

function LanguageSelector({ fullWidth = false }) {
  const { siteLanguage, setSiteLanguage, siteLanguages } = useApp();
  const [open, setOpen] = useState(false);

  return (
    <div className={`relative min-w-0 ${fullWidth ? 'w-full' : ''}`}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={`inline-flex h-10 min-w-0 items-center gap-2 rounded-button border border-white/10 bg-white/[.04] px-3 text-sm font-medium text-slate-200 transition hover:border-white/20 hover:bg-white/[.07] ${
          fullWidth ? 'w-full justify-between' : 'max-w-[180px]'
        }`}
      >
        <FiGlobe className="h-4 w-4 shrink-0 text-royal-400" />
        <span className="min-w-0 truncate">{siteLanguage}</span>
        <FiChevronDown className={`h-4 w-4 shrink-0 transition ${open ? 'rotate-180' : ''}`} />
      </button>

      {open ? (
        <div
          className={`absolute mt-2 max-h-72 overflow-y-auto rounded-card border border-white/15 bg-navy-900/95 p-1 shadow-premium backdrop-blur-xl ${
            fullWidth ? 'left-0 right-0 w-full' : 'right-0 w-48'
          }`}
        >
          {siteLanguages.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => {
                setSiteLanguage(item);
                setOpen(false);
              }}
              className="block w-full truncate rounded-xl px-3 py-2 text-left text-sm text-slate-200 transition hover:bg-white/[.07] hover:text-white"
            >
              {item}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const { t } = useApp();
  const navItems = [
    { label: t('nav.features'), href: '#features' },
    { label: t('nav.howItWorks'), href: '#how-it-works' },
    { label: t('nav.faq'), href: '#faq' },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-white/15 bg-[rgba(30,45,80,.55)] backdrop-blur-[18px]">
      <nav className="mx-auto flex h-16 max-w-container items-center justify-between px-4 sm:px-6 lg:px-8">
        <Logo />

        <div className="hidden items-center gap-8 md:flex">
          {navItems.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="text-sm font-medium text-slate-300 transition hover:text-white"
            >
              {item.label}
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <LanguageSelector />
          <a
            href="#signin"
            className="inline-flex h-10 items-center rounded-button border border-white/10 px-4 text-sm font-semibold text-white transition hover:border-royal-500/50 hover:bg-royal-600/10"
          >
            {t('nav.signIn')}
          </a>
        </div>

        <button
          type="button"
          aria-label={t('nav.toggle')}
          onClick={() => setOpen((value) => !value)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-button border border-white/10 bg-white/[.04] text-white md:hidden"
        >
          {open ? <FiX className="h-5 w-5" /> : <FiMenu className="h-5 w-5" />}
        </button>
      </nav>

      {open ? (
        <div className="border-t border-white/10 bg-navy-900/95 px-4 py-4 backdrop-blur-xl md:hidden">
          <div className="mx-auto flex max-w-container flex-col gap-3">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-xl px-3 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/[.06] hover:text-white"
              >
                {item.label}
              </a>
            ))}
            <div className="grid gap-3 pt-2 min-[380px]:grid-cols-[minmax(0,1fr)_auto]">
              <LanguageSelector fullWidth />
              <a
                href="#signin"
                className="inline-flex h-10 items-center justify-center rounded-button border border-white/10 px-4 text-sm font-semibold text-white"
              >
                {t('nav.signIn')}
              </a>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
