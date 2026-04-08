import React from 'react';

/**
 * TestimonialsMarquee
 *
 * Infinite horizontally-scrolling testimonial cards with gradient fade edges.
 * Pauses on hover. Pure CSS keyframe animation — no extra deps beyond React.
 *
 * Props:
 *   testimonials  — array of { id, avatar, name, role, quote }
 *   speed         — animation duration in seconds (higher = slower). Default 40.
 *   bgColor       — Tailwind background class used for the fade gradient.
 *                   Must match the section background. Default 'white'.
 */

const DEFAULT_TESTIMONIALS = [
  {
    id: 1,
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
    name: 'Sarah Johnson',
    role: 'Software Engineer at Stripe',
    quote:
      'I uploaded my resume and got an ATS score in seconds. Found three missing keywords and landed an interview the next week.',
  },
  {
    id: 2,
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka',
    name: 'Michael Chen',
    role: 'Product Manager',
    quote:
      'The AI tailoring feature is a game-changer. My callback rate went from 5% to over 30% after using ScopusResume.',
  },
  {
    id: 3,
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Luna',
    name: 'Emily Rodriguez',
    role: 'Marketing Specialist',
    quote:
      'Finally a tool that explains *why* my resume wasn\'t working. The keyword gap analysis saved me weeks of guessing.',
  },
  {
    id: 4,
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Max',
    name: 'David Thompson',
    role: 'Full-Stack Developer',
    quote:
      'I was skeptical, but the rewritten bullet points were genuinely better — and they still sounded like me.',
  },
  {
    id: 5,
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Bella',
    name: 'Jessica Williams',
    role: 'Data Analyst',
    quote:
      'Tailored five applications in under an hour. All five got to the phone screen stage. ScopusResume is the real deal.',
  },
  {
    id: 6,
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Oliver',
    name: 'James Anderson',
    role: 'DevOps Engineer',
    quote:
      'Clean interface, fast results. The ATS score alone is worth it — I\'d been failing filters I didn\'t even know existed.',
  },
];

const KEYFRAMES = `
  @keyframes marquee-scroll {
    0%   { transform: translateX(0); }
    100% { transform: translateX(-50%); }
  }
`;

export default function TestimonialsMarquee({
  testimonials = DEFAULT_TESTIMONIALS,
  speed = 40,
  bgColor = 'white',
}) {
  // Duplicate so the loop is seamless (the strip is 2× wide, we scroll -50%)
  const items = [...testimonials, ...testimonials];

  // Map simple color names to Tailwind-compatible rgba stops for the fade.
  // We inline the style so there's no need to add arbitrary Tailwind values.
  const gradientFrom =
    bgColor === 'white'
      ? 'rgba(255,255,255,1)'
      : bgColor === 'gray-50'
      ? 'rgba(249,250,251,1)'
      : 'rgba(255,255,255,1)';

  return (
    <div className="relative w-full overflow-hidden py-4">
      {/* Inject keyframe animation once */}
      <style>{KEYFRAMES}</style>

      {/* Left fade */}
      <div
        className="absolute left-0 top-0 bottom-0 w-28 z-10 pointer-events-none"
        style={{
          background: `linear-gradient(to right, ${gradientFrom}, transparent)`,
        }}
      />

      {/* Right fade */}
      <div
        className="absolute right-0 top-0 bottom-0 w-28 z-10 pointer-events-none"
        style={{
          background: `linear-gradient(to left, ${gradientFrom}, transparent)`,
        }}
      />

      {/* Scrolling strip */}
      <div
        className="flex"
        style={{
          animation: `marquee-scroll ${speed}s linear infinite`,
          width: 'max-content',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.animationPlayState = 'paused')}
        onMouseLeave={(e) => (e.currentTarget.style.animationPlayState = 'running')}
      >
        {items.map((t, index) => (
          <div
            key={`${t.id}-${index}`}
            className="flex-shrink-0 w-80 mx-3"
          >
            <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow duration-200 h-full flex flex-col">
              {/* Quote mark */}
              <span className="text-brand-400 text-3xl leading-none font-serif mb-2 select-none">
                &ldquo;
              </span>

              {/* Quote text */}
              <p className="text-gray-600 text-sm leading-relaxed flex-grow mb-5">
                {t.quote}
              </p>

              {/* Author */}
              <div className="flex items-center gap-3">
                <img
                  src={t.avatar}
                  alt={t.name}
                  className="w-10 h-10 rounded-full bg-brand-50 border-2 border-brand-200 flex-shrink-0"
                />
                <div>
                  <p className="font-semibold text-gray-800 text-sm leading-tight">
                    {t.name}
                  </p>
                  <p className="text-gray-400 text-xs mt-0.5">{t.role}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
