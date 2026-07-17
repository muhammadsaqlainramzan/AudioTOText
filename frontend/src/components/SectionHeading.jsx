export default function SectionHeading({ eyebrow, title, description, align = 'center' }) {
  const alignment = align === 'left' ? 'items-start text-left' : 'items-center text-center';

  return (
    <div className={`mx-auto mb-12 flex max-w-content flex-col ${alignment}`}>
      {eyebrow ? (
        <span className="mb-4 rounded-full border border-royal-500/25 bg-royal-600/10 px-4 py-1.5 text-sm font-semibold text-royal-400">
          {eyebrow}
        </span>
      ) : null}
      <h2 className="text-3xl font-semibold leading-tight text-white sm:text-4xl lg:text-[36px]">
        {title}
      </h2>
      {description ? (
        <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">{description}</p>
      ) : null}
    </div>
  );
}
