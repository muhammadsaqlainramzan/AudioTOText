import { useState } from 'react';
import { FiChevronDown } from 'react-icons/fi';
import SectionHeading from '../components/SectionHeading.jsx';
import { useApp } from '../context/AppContext.jsx';

export default function FAQ() {
  const [active, setActive] = useState(0);
  const { t } = useApp();
  const faqs = [
    {
      question: t('faq.formatsQuestion'),
      answer: t('faq.formatsAnswer'),
    },
    {
      question: t('faq.languagesQuestion'),
      answer: t('faq.languagesAnswer'),
    },
    {
      question: t('faq.exportQuestion'),
      answer: t('faq.exportAnswer'),
    },
    {
      question: t('faq.secureQuestion'),
      answer: t('faq.secureAnswer'),
    },
  ];

  return (
    <section id="faq" className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <SectionHeading
          eyebrow={t('faq.eyebrow')}
          title={t('faq.title')}
          description={t('faq.description')}
        />

        <div className="space-y-3">
          {faqs.map((faq, index) => {
            const open = active === index;

            return (
              <div
                key={faq.question}
                className="glass-card rounded-card border border-white/10 bg-white/[.04] shadow-premium"
              >
                <button
                  type="button"
                  onClick={() => setActive(open ? null : index)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left"
                >
                  <span className="text-base font-semibold text-white sm:text-lg">{faq.question}</span>
                  <FiChevronDown
                    className={`h-5 w-5 shrink-0 text-royal-400 transition ${open ? 'rotate-180' : ''}`}
                  />
                </button>
                {open ? (
                  <div className="border-t border-white/10 px-5 pb-5 pt-4">
                    <p className="text-base leading-7 text-slate-400">{faq.answer}</p>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
