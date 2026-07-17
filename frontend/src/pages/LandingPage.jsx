import FAQ from '../sections/FAQ.jsx';
import Features from '../sections/Features.jsx';
import Footer from '../sections/Footer.jsx';
import Hero from '../sections/Hero.jsx';
import HowItWorks from '../sections/HowItWorks.jsx';
import Navbar from '../components/Navbar.jsx';
import Stats from '../sections/Stats.jsx';
import Testimonials from '../sections/Testimonials.jsx';
import WhyChoose from '../sections/WhyChoose.jsx';

function BackgroundEffects() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-navy-950">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_12%,rgba(59,130,246,.24),transparent_32%),radial-gradient(circle_at_82%_24%,rgba(93,107,255,.16),transparent_28%),linear-gradient(180deg,#050816_0%,#0B1227_48%,#050816_100%)]" />
      <div className="blueprint-grid absolute inset-0" />
      <div className="absolute left-1/2 top-28 h-80 w-80 -translate-x-1/2 rounded-full bg-royal-600/20 blur-[110px]" />
      <div className="particle particle-one" />
      <div className="particle particle-two" />
      <div className="particle particle-three" />
      <div className="particle particle-four" />
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-hidden text-slate-100">
      <BackgroundEffects />
      <Navbar />
      <main>
        <Hero />
        <Stats />
        <HowItWorks />
        <Features />
        <WhyChoose />
        <Testimonials />
        <FAQ />
      </main>
      <Footer />
    </div>
  );
}
