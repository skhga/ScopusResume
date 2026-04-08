import { motion } from 'framer-motion';

function ElegantShape({ className, delay = 0, width = 400, height = 100, rotate = 0, gradient = 'from-white/[0.08]' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -150, rotate: rotate - 15 }}
      animate={{ opacity: 1, y: 0, rotate }}
      transition={{
        duration: 2.4,
        delay,
        ease: [0.23, 0.86, 0.39, 0.96],
        opacity: { duration: 1.2 },
      }}
      className={`absolute ${className}`}
    >
      <motion.div
        animate={{ y: [0, 15, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        style={{ width, height }}
        className="relative"
      >
        <div
          className={[
            'absolute inset-0 rounded-full',
            'bg-gradient-to-r to-transparent',
            gradient,
            'backdrop-blur-[2px] border-2 border-white/[0.15]',
            'shadow-[0_8px_32px_0_rgba(255,255,255,0.1)]',
            'after:absolute after:inset-0 after:rounded-full',
            'after:bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.2),transparent_70%)]',
          ].join(' ')}
        />
      </motion.div>
    </motion.div>
  );
}

export default function GeometricHero({ children }) {
  return (
    <div className="relative overflow-hidden bg-brand-950 min-h-[560px]">
      {/* Subtle teal radial wash */}
      <div className="absolute inset-0 bg-gradient-to-br from-brand-600/[0.07] via-transparent to-brand-400/[0.04] blur-3xl pointer-events-none" />

      {/* Floating shapes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <ElegantShape
          delay={0.3} width={560} height={130} rotate={12}
          gradient="from-brand-400/[0.18]"
          className="left-[-8%] top-[18%]"
        />
        <ElegantShape
          delay={0.5} width={420} height={100} rotate={-15}
          gradient="from-brand-300/[0.12]"
          className="right-[-4%] top-[65%]"
        />
        <ElegantShape
          delay={0.4} width={260} height={70} rotate={-8}
          gradient="from-brand-500/[0.15]"
          className="left-[6%] bottom-[8%]"
        />
        <ElegantShape
          delay={0.6} width={180} height={50} rotate={22}
          gradient="from-brand-200/[0.10]"
          className="right-[18%] top-[12%]"
        />
        <ElegantShape
          delay={0.7} width={130} height={36} rotate={-25}
          gradient="from-brand-400/[0.13]"
          className="left-[24%] top-[6%]"
        />
      </div>

      {/* Vignette bottom fade */}
      <div className="absolute inset-0 bg-gradient-to-t from-brand-950/60 via-transparent to-brand-950/40 pointer-events-none" />

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}
