const stats = [
  { value: '10,000+', label: 'Files Transcribed' },
  { value: '98%', label: 'Accuracy' },
  { value: '100+', label: 'Languages' },
  { value: '50+', label: 'Countries' },
];

export default function Stats() {
  return (
    <section className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-container gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="glass-card rounded-card border border-white/10 bg-white/[.04] p-6 text-center shadow-premium transition duration-300 hover:-translate-y-1 hover:border-royal-500/35"
          >
            <p className="text-4xl font-semibold text-white">{stat.value}</p>
            <p className="mt-2 text-sm font-medium text-slate-400">{stat.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
