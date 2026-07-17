import { FiStar } from 'react-icons/fi';
import SectionHeading from '../components/SectionHeading.jsx';

const testimonials = [
  {
    quote: 'Amazing accuracy and very easy to use.',
    name: 'Sarah Johnson',
  },
  {
    quote: 'Saved hours of manual transcription.',
    name: 'Michael Lee',
  },
  {
    quote: "Best transcription tool I've used.",
    name: 'Emily Carter',
  },
];

export default function Testimonials() {
  return (
    <section className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-container">
        <SectionHeading
          eyebrow="Testimonials"
          title="Trusted by teams who need accurate transcripts fast."
        />

        <div className="grid gap-5 lg:grid-cols-3">
          {testimonials.map((testimonial) => (
            <figure
              key={testimonial.name}
              className="glass-card rounded-card border border-white/10 bg-white/[.04] p-6 shadow-premium transition duration-300 hover:-translate-y-2 hover:border-royal-500/35"
            >
              <div className="mb-5 flex gap-1 text-royal-400">
                {Array.from({ length: 5 }).map((_, index) => (
                  <FiStar key={index} className="h-5 w-5 fill-current" />
                ))}
              </div>
              <blockquote className="text-xl font-medium leading-8 text-white">
                {testimonial.quote}
              </blockquote>
              <figcaption className="mt-5 text-sm font-semibold text-slate-400">
                - {testimonial.name}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
