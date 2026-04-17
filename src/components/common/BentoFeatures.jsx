import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import { ChevronRight } from 'lucide-react';

// ─── animation helper ─────────────────────────────────────────────────────────

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: 0.6, delay, ease: [0.25, 0.4, 0.25, 1] },
});

// ─── ATS Score panel ─────────────────────────────────────────────────────────

const MATCHED_KW = ['React', 'Python', 'Agile'];
const MISSING_KW = ['Kubernetes', 'AWS'];

function ATSPanel() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });

  const score = 87;
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const [strokeDash, setStrokeDash] = useState(circumference);

  useEffect(() => {
    if (!inView) return;
    const t = setTimeout(() => {
      setStrokeDash(circumference * (1 - score / 100));
    }, 300);
    return () => clearTimeout(t);
  }, [inView, circumference]);

  return (
    <motion.div
      ref={ref}
      {...fadeUp(0.1)}
      className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm shadow-gray-100"
    >
      {/* Gauge */}
      <div className="flex justify-center mb-5">
        <div className="relative flex items-center justify-center w-36 h-36">
          <svg width="144" height="144" className="-rotate-90">
            <circle cx="72" cy="72" r={radius} fill="none" stroke="#f0fdf4" strokeWidth="10" />
            <circle
              cx="72" cy="72" r={radius}
              fill="none"
              stroke="#0d9488"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDash}
              style={{ transition: 'stroke-dashoffset 1.4s cubic-bezier(0.4,0,0.2,1)' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-extrabold text-brand-600 leading-none">{score}%</span>
            <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mt-1">match</span>
          </div>
        </div>
      </div>

      {/* Keyword pills */}
      <div className="space-y-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Matched</p>
          <div className="flex flex-wrap gap-1.5">
            {MATCHED_KW.map(k => (
              <span key={k} className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
                ✓ {k}
              </span>
            ))}
          </div>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Missing</p>
          <div className="flex flex-wrap gap-1.5">
            {MISSING_KW.map(k => (
              <span key={k} className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-gray-50 text-gray-500 border border-gray-200">
                ✗ {k}
              </span>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── AI Tailor diff panel ─────────────────────────────────────────────────────

const DIFF_LINES = [
  {
    before: 'Assisted with cross-functional team initiatives',
    after:  'Led cross-functional collaboration driving 15% efficiency gains',
  },
  {
    before: 'Worked on data pipeline improvements',
    after:  'Architected data pipelines reducing processing time by 40%',
  },
];

function DiffPanel() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const [typed, setTyped] = useState(['', '']);

  useEffect(() => {
    if (!inView) return;
    DIFF_LINES.forEach((line, idx) => {
      let i = 0;
      const delay = setTimeout(() => {
        const id = setInterval(() => {
          i++;
          setTyped(prev => {
            const next = [...prev];
            next[idx] = line.after.slice(0, i);
            return next;
          });
          if (i >= line.after.length) clearInterval(id);
        }, 22);
        return () => clearInterval(id);
      }, 400 + idx * 700);
      return () => clearTimeout(delay);
    });
  }, [inView]);

  return (
    <motion.div
      ref={ref}
      {...fadeUp(0.1)}
      className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm shadow-gray-100 relative"
    >
      {/* Badge */}
      <div className="absolute top-4 right-4 bg-brand-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-full">
        12 changes
      </div>

      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-4">Resume Changes</p>

      <div className="space-y-4 font-mono text-xs">
        {DIFF_LINES.map((line, idx) => (
          <div key={idx}>
            {/* Before */}
            <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-1.5">
              <span className="text-red-400 font-bold shrink-0 select-none">−</span>
              <span className="text-red-400/80 line-through leading-relaxed">{line.before}</span>
            </div>
            {/* After */}
            <div className="flex items-start gap-2 bg-teal-50 border border-teal-100 rounded-lg px-3 py-2 min-h-[2.75rem]">
              <span className="text-brand-600 font-bold shrink-0 select-none">+</span>
              <span className="text-brand-700 leading-relaxed">
                {typed[idx]}
                {typed[idx].length < line.after.length && (
                  <span className="inline-block w-[2px] h-[1em] bg-brand-400 ml-0.5 animate-pulse align-middle" />
                )}
              </span>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ─── Export panel ─────────────────────────────────────────────────────────────

function ExportPanel() {
  return (
    <motion.div
      {...fadeUp(0.1)}
      className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm shadow-gray-100 flex flex-col items-center gap-5"
    >
      {/* PDF thumbnail */}
      <motion.div
        animate={{ y: [0, -5, 0] }}
        transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
        className="relative"
      >
        <div className="w-20 h-26 bg-white rounded-lg shadow-md border border-gray-200 flex flex-col overflow-hidden" style={{ height: '104px' }}>
          {/* Dog-ear */}
          <div className="absolute top-0 right-0 w-5 h-5 bg-gray-100"
               style={{ clipPath: 'polygon(100% 0, 0 0, 100% 100%)' }} />
          <div className="flex-1 px-3 pt-2 space-y-1.5">
            <div className="h-1.5 bg-brand-200 rounded w-2/5" />
            <div className="h-1 bg-gray-200 rounded w-full" />
            <div className="h-1 bg-gray-200 rounded w-4/5" />
            <div className="h-1 bg-gray-200 rounded w-full" />
            <div className="h-1.5 bg-brand-200 rounded w-3/5 mt-1" />
            <div className="h-1 bg-gray-200 rounded w-full" />
            <div className="h-1 bg-gray-200 rounded w-3/4" />
          </div>
          <div className="flex justify-center pb-2">
            <span className="bg-brand-600 text-white text-[8px] font-bold px-2 py-0.5 rounded tracking-widest">PDF</span>
          </div>
        </div>
      </motion.div>

      {/* Buttons */}
      <div className="w-full space-y-2">
        <div className="w-full bg-brand-600 text-white text-sm font-bold py-2.5 rounded-xl text-center cursor-pointer hover:bg-brand-700 transition-colors">
          Download PDF
        </div>
        <div className="w-full text-brand-600 text-sm font-semibold py-2 rounded-xl text-center border border-gray-200 cursor-pointer hover:border-brand-200 hover:bg-brand-50 transition-colors">
          Plain text
        </div>
      </div>
    </motion.div>
  );
}

// ─── Feature row ──────────────────────────────────────────────────────────────

function FeatureRow({ label, heading, body, visual, flip = false, delay = 0 }) {
  return (
    <div className="grid lg:grid-cols-2 gap-10 items-center">
      {/* Text */}
      <motion.div {...fadeUp(delay)} className={flip ? 'lg:order-2' : ''}>
        <span className="text-brand-600 text-xs font-semibold uppercase tracking-wider">{label}</span>
        <h3 className="text-2xl font-bold text-gray-900 mt-2 mb-3">{heading}</h3>
        <p className="text-gray-500 leading-relaxed text-sm">{body}</p>
        <Link
          to="/signup"
          className="inline-flex items-center text-brand-600 font-medium text-sm mt-4 hover:underline py-2 min-h-[44px]"
        >
          Try it free <ChevronRight className="h-4 w-4 ml-0.5" aria-hidden="true" />
        </Link>
      </motion.div>

      {/* Visual */}
      <div className={flip ? 'lg:order-1' : ''}>
        {visual}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function BentoFeatures() {
  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        <motion.h2
          {...fadeUp(0)}
          className="text-3xl font-bold text-gray-900 mb-16 max-w-lg"
        >
          Built for the specific problems job seekers actually face
        </motion.h2>

        <div className="space-y-16">
          <FeatureRow
            label="ATS Score"
            heading="Know exactly why you're getting filtered out"
            body="Paste any job description and get a real match score against your resume. See the keywords you're missing and the ones you already have. No guessing."
            visual={<ATSPanel />}
            delay={0.1}
          />

          <FeatureRow
            label="AI Tailor"
            heading="One resume, tailored for every application"
            body="ScopusResume rewrites your bullet points and summary to match each job's language — without inventing experience. You review every change before applying it."
            visual={<DiffPanel />}
            flip
            delay={0.1}
          />

          <FeatureRow
            label="Export"
            heading="Download a clean PDF in seconds"
            body="No sign-off required. Export as PDF or plain text, ready to upload to any job portal. What you see in the preview is what you get."
            visual={<ExportPanel />}
            delay={0.1}
          />
        </div>

      </div>
    </section>
  );
}
