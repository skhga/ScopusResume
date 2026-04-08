import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle2, ChevronRight, Zap, FileSearch, Sparkles } from 'lucide-react';
import Navbar from '../../components/layout/Navbar';
import Footer from '../../components/layout/Footer';
import GeometricHero from '../../components/ui/geometric-hero';

const fadeUp = (i = 0) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.7, delay: 0.4 + i * 0.15, ease: [0.25, 0.4, 0.25, 1] },
});

const PAIN_POINTS = [
  'Spent hours on your resume, still no callbacks',
  'Not sure if ATS is filtering you out before a human sees it',
  'Rewriting the same resume for every job posting',
];

const FEATURES = [
  {
    label: 'ATS Score',
    heading: 'Know exactly why you\'re getting filtered out',
    body: 'Paste any job description and get a real match score against your resume. See the keywords you\'re missing and the ones you already have. No guessing.',
  },
  {
    label: 'AI Tailor',
    heading: 'One resume, tailored for every application',
    body: 'ScopusResume rewrites your bullet points and summary to match each job\'s language — without inventing experience. You review every change before applying it.',
  },
  {
    label: 'Export',
    heading: 'Download a clean PDF in seconds',
    body: 'No sign-off required. Export as PDF or plain text, ready to upload to any job portal. What you see in the preview is what you get.',
  },
];

const STEPS = [
  {
    num: '01',
    icon: Zap,
    title: 'Build once',
    body: 'Fill in your experience through a guided 8-step builder. Takes about 8 minutes.',
  },
  {
    num: '02',
    icon: FileSearch,
    title: 'Paste a job description',
    body: 'Drop in the JD. The AI compares it to your resume and highlights the gaps.',
  },
  {
    num: '03',
    icon: Sparkles,
    title: 'Apply the suggestions',
    body: 'Review the diffs, accept what makes sense, download your tailored resume.',
  },
];

const TESTIMONIALS = [
  { quote: 'I went from 0 callbacks to 5 interviews in two weeks.', name: 'Sarah K.', role: 'Software Engineer' },
  { quote: 'The diff view makes it obvious exactly what to change. I stopped guessing.', name: 'James L.', role: 'Marketing Graduate' },
  { quote: 'Helped me apply to jobs in France. Landed my first role abroad.', name: 'Priya M.', role: 'International Student' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero — Geometric animated background */}
      <GeometricHero>
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20 lg:pt-24 lg:pb-28">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <motion.p {...fadeUp(0)} className="text-brand-300 text-sm font-semibold uppercase tracking-widest mb-4">
                Resume builder for job seekers
              </motion.p>
              <motion.h1 {...fadeUp(1)} className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
                Stop getting rejected before anyone reads your resume
              </motion.h1>
              <motion.div {...fadeUp(2)} className="mt-6 space-y-3">
                {PAIN_POINTS.map(p => (
                  <div key={p} className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-brand-300 mt-0.5 shrink-0" />
                    <p className="text-white/75">{p}</p>
                  </div>
                ))}
              </motion.div>
              <motion.div {...fadeUp(3)} className="mt-10 flex flex-col sm:flex-row gap-3">
                <Link to="/signup" className="inline-flex items-center justify-center bg-white text-brand-700 hover:bg-brand-50 font-bold px-8 py-3 rounded-lg transition shadow-lg hover:shadow-xl text-base min-h-[44px]">
                  Build my resume free <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
                <a href="#how-it-works" className="inline-flex items-center justify-center border-2 border-white/40 text-white hover:bg-white/10 font-medium px-8 py-3 rounded-lg transition text-base min-h-[44px]">
                  See how it works
                </a>
              </motion.div>
              <motion.p {...fadeUp(4)} className="text-white/40 text-sm mt-4">No credit card. Takes 8 minutes.</motion.p>
            </div>

            {/* Preview card */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.9, delay: 0.6, ease: [0.25, 0.4, 0.25, 1] }}
              className="hidden lg:block"
            >
              <div className="bg-white/95 backdrop-blur-sm rounded-2xl border border-white/10 p-6 shadow-2xl shadow-black/40">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-3 h-3 rounded-full bg-red-300" />
                  <div className="w-3 h-3 rounded-full bg-yellow-300" />
                  <div className="w-3 h-3 rounded-full bg-green-300" />
                </div>
                {/* Mock resume preview */}
                <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-100 text-xs font-mono space-y-3">
                  <div className="text-center border-b pb-2">
                    <div className="h-3 bg-gray-900 rounded w-32 mx-auto mb-1" />
                    <div className="h-2 bg-gray-300 rounded w-48 mx-auto" />
                  </div>
                  <div>
                    <div className="h-2 bg-brand-600 rounded w-20 mb-1" />
                    <div className="space-y-1">
                      <div className="h-1.5 bg-gray-200 rounded w-full" />
                      <div className="h-1.5 bg-gray-200 rounded w-5/6" />
                      <div className="h-1.5 bg-gray-200 rounded w-4/6" />
                    </div>
                  </div>
                  <div>
                    <div className="h-2 bg-brand-600 rounded w-24 mb-1" />
                    <div className="space-y-1">
                      <div className="flex justify-between mb-0.5">
                        <div className="h-2 bg-gray-700 rounded w-28" />
                        <div className="h-1.5 bg-gray-300 rounded w-16" />
                      </div>
                      <div className="h-1.5 bg-gray-200 rounded w-full" />
                      <div className="h-1.5 bg-gray-200 rounded w-5/6" />
                    </div>
                  </div>
                  <div>
                    <div className="h-2 bg-brand-600 rounded w-16 mb-1" />
                    <div className="flex flex-wrap gap-1">
                      {['Leadership', 'Data Analysis', 'Excel', 'SQL'].map(s => (
                        <span key={s} className="bg-brand-50 text-brand-700 px-1.5 py-0.5 rounded text-xs">{s}</span>
                      ))}
                    </div>
                  </div>
                </div>
                {/* ATS score badge */}
                <div className="mt-3 flex items-center justify-between bg-green-50 border border-green-100 rounded-lg px-4 py-2.5">
                  <span className="text-sm text-green-800 font-medium">ATS Match Score</span>
                  <span className="text-2xl font-bold text-green-700">87%</span>
                </div>
              </div>
            </motion.div>
          </div>
        </section>
      </GeometricHero>

      {/* Features — alternating rows */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-16 max-w-lg">Built for the specific problems job seekers actually face</h2>
          <div className="space-y-16">
            {FEATURES.map(({ label, heading, body }, i) => (
              <div key={label} className="grid lg:grid-cols-2 gap-10 items-center">
                <div className={i % 2 === 1 ? 'lg:order-2' : ''}>
                  <span className="text-brand-600 text-xs font-semibold uppercase tracking-wider">{label}</span>
                  <h3 className="text-2xl font-bold text-gray-900 mt-2 mb-3">{heading}</h3>
                  <p className="text-gray-600 leading-relaxed">{body}</p>
                  <Link to="/signup" className="inline-flex items-center text-brand-600 font-medium text-sm mt-4 hover:underline py-2 min-h-[44px]">
                    Try it free <ChevronRight className="h-4 w-4 ml-0.5" />
                  </Link>
                </div>
                <div className={`bg-brand-50 rounded-xl border border-brand-100 p-8 h-40 flex items-center justify-center ${i % 2 === 1 ? 'lg:order-1' : ''}`}>
                  <div className="text-center">
                    <div className="text-5xl font-extrabold text-brand-600">{['87%', 'diff →', 'PDF'][i]}</div>
                    <div className="text-brand-700 font-medium mt-2 text-sm uppercase tracking-wider">{['ATS match score', 'tailored changes', 'clean export'][i]}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Badge */}
          <div className="flex justify-center mb-6">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-50 border border-brand-200 text-brand-700 text-xs font-semibold uppercase tracking-widest">
              <Zap className="h-3.5 w-3.5 fill-brand-500 text-brand-500" />
              How it works
            </span>
          </div>

          {/* Heading */}
          <div className="text-center mb-16">
            <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight">
              Simple{' '}
              <span className="text-brand-600">3-Step</span>
              {' '}Process
            </h2>
            <p className="mt-4 text-gray-500 text-lg max-w-xl mx-auto">
              From blank resume to tailored applications — in minutes, not hours.
            </p>
          </div>

          {/* Cards */}
          <div className="grid md:grid-cols-3 gap-6">
            {STEPS.map(({ num, icon: Icon, title, body }, i) => (
              <motion.div
                key={num}
                initial={{ opacity: 0, y: 32 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.55, delay: i * 0.12, ease: [0.25, 0.4, 0.25, 1] }}
                className="relative flex flex-col items-center text-center p-8 rounded-2xl border border-gray-200 bg-white hover:border-brand-200 hover:shadow-lg hover:shadow-brand-600/5 transition-all duration-300"
              >
                {/* Ghost step number */}
                <span className="absolute top-5 right-6 text-6xl font-extrabold text-gray-100 select-none leading-none">
                  {num}
                </span>

                {/* Icon square */}
                <div className="relative z-10 w-16 h-16 rounded-2xl bg-brand-600 flex items-center justify-center mb-6 shadow-lg shadow-brand-600/30">
                  <Icon className="h-8 w-8 text-white" strokeWidth={1.75} />
                </div>

                {/* Text */}
                <h3 className="text-lg font-bold text-gray-900 mb-3">{title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-12">What job seekers say</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map(t => (
              <div key={t.name} className="bg-white p-6 rounded-xl border border-gray-200">
                <div className="flex mb-3">{[1,2,3,4,5].map(i => <span key={i} className="text-yellow-400 text-sm">&#9733;</span>)}</div>
                <p className="text-gray-700 mb-4">"{t.quote}"</p>
                <p className="font-semibold text-gray-900 text-sm">{t.name}</p>
                <p className="text-xs text-gray-500">{t.role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-brand-700">
        <div className="max-w-2xl mx-auto text-center px-4">
          <h2 className="text-3xl font-bold text-white mb-3">Your next interview is one resume away</h2>
          <p className="text-white/80 mb-8">Build an ATS-optimized resume in 8 minutes. Free to start.</p>
          <Link to="/signup" className="inline-flex items-center bg-white text-brand-700 hover:bg-brand-50 font-semibold px-8 py-3 rounded-lg transition shadow-lg hover:shadow-xl">
            Get started free <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
