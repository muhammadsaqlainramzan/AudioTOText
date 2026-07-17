import { useState } from 'react';
import { FiChevronDown } from 'react-icons/fi';
import SectionHeading from '../components/SectionHeading.jsx';

const faqs = [
  {
    question: 'What audio formats are supported?',
    answer: 'AT2 supports MP3, WAV, MP4, M4A and AAC files up to 2GB.',
  },
  {
    question: 'How many languages can AT2 transcribe?',
    answer: 'AT2 is designed for transcription in over 100 languages.',
  },
  {
    question: 'Can I export my transcript?',
    answer: 'Yes. Transcript exports can support TXT, DOCX, PDF and SRT formats.',
  },
  {
    question: 'Is my uploaded data secure?',
    answer: 'Files are encrypted during upload and can be automatically deleted after processing.',
  },
];

export default function FAQ() {
  const [active, setActive] = useState(0);

  return (
    <section id="faq" className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <SectionHeading
          eyebrow="FAQ"
          title="Questions before your first upload."
          description="Quick answers for formats, languages, exports and privacy."
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
