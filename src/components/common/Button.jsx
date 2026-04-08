import React, { useState } from 'react';
import { motion } from 'framer-motion';

// Variant → base classes (matches existing .btn-* utilities + new variants)
const VARIANT_CLASSES = {
  primary:
    'bg-brand-600 text-white border border-brand-500/30 shadow-md shadow-brand-600/20 hover:shadow-lg hover:shadow-brand-600/30',
  secondary:
    'bg-white text-brand-700 border-2 border-brand-300 hover:border-brand-400 hover:bg-brand-50 shadow-sm',
  outline:
    'bg-white text-brand-700 border-2 border-brand-300 hover:border-brand-400 hover:bg-brand-50 shadow-sm',
  danger:
    'bg-red-600 text-white border border-red-500/30 shadow-md shadow-red-600/20 hover:shadow-lg hover:shadow-red-600/30',
  ghost:
    'bg-transparent text-gray-700 border border-transparent hover:bg-gray-100',
};

const SIZE_CLASSES = {
  sm: 'px-3 py-1.5 text-xs min-h-[36px] gap-1.5 [&_svg]:h-3.5 [&_svg]:w-3.5',
  md: 'px-6 py-2.5 text-sm min-h-[44px] gap-2 [&_svg]:h-4 [&_svg]:w-4',
  lg: 'px-8 py-3 text-base min-h-[48px] gap-2.5 [&_svg]:h-5 [&_svg]:w-5',
};

// Spring physics for hover/tap
const motionVariants = {
  idle: { scale: 1, rotateX: 0 },
  hover: {
    scale: 1.025,
    rotateX: -2,
    transition: { type: 'spring', stiffness: 420, damping: 12 },
  },
  tap: {
    scale: 0.97,
    rotateX: 2,
    transition: { type: 'spring', stiffness: 420, damping: 12 },
  },
};

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  iconLeft,
  iconRight,
  className = '',
  onClick,
  children,
  type = 'button',
  ...rest
}) {
  const [ripples, setRipples] = useState([]);
  const [hovered, setHovered] = useState(false);
  const isDisabled = disabled || loading;

  const handleClick = (e) => {
    if (isDisabled) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ripple = { id: Date.now(), x: e.clientX - rect.left, y: e.clientY - rect.top };
    setRipples((prev) => [...prev, ripple]);
    setTimeout(() => setRipples((prev) => prev.filter((r) => r.id !== ripple.id)), 600);
    onClick?.(e);
  };

  const isPrimary = variant === 'primary';
  const isDanger = variant === 'danger';
  const hasShineFill = isPrimary || isDanger;

  return (
    <motion.button
      type={type}
      disabled={isDisabled}
      variants={motionVariants}
      initial="idle"
      whileHover={!isDisabled ? 'hover' : 'idle'}
      whileTap={!isDisabled ? 'tap' : 'idle'}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      onClick={handleClick}
      className={[
        'relative inline-flex items-center justify-center font-semibold rounded-lg',
        'overflow-hidden cursor-pointer select-none',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'transition-colors duration-150',
        'transform-gpu',
        VARIANT_CLASSES[variant] || VARIANT_CLASSES.primary,
        SIZE_CLASSES[size] || SIZE_CLASSES.md,
        className,
      ].join(' ')}
      {...rest}
    >
      {/* Shimmer sweep on hover (primary / danger only) */}
      {hasShineFill && (
        <motion.span
          aria-hidden
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none"
          initial={{ x: '-100%' }}
          animate={hovered && !isDisabled ? { x: '100%' } : { x: '-100%' }}
          transition={{ duration: 0.55, ease: 'easeInOut' }}
        />
      )}

      {/* Magnetic glow behind button on hover */}
      {hovered && hasShineFill && !isDisabled && (
        <motion.span
          aria-hidden
          className={`absolute inset-0 rounded-lg blur-xl pointer-events-none ${isPrimary ? 'bg-brand-400/30' : 'bg-red-400/30'}`}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1.15 }}
          transition={{ duration: 0.25 }}
        />
      )}

      {/* Content */}
      <span className="relative z-10 inline-flex items-center justify-center gap-2">
        {loading ? (
          <svg
            className="animate-spin h-4 w-4 shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : (
          iconLeft && <span className="shrink-0">{iconLeft}</span>
        )}

        {children}

        {!loading && iconRight && <span className="shrink-0">{iconRight}</span>}
      </span>

      {/* Click ripples */}
      {ripples.map((r) => (
        <motion.span
          key={r.id}
          aria-hidden
          className="absolute rounded-full bg-white/25 pointer-events-none"
          style={{ left: r.x, top: r.y }}
          initial={{ width: 0, height: 0, x: '-50%', y: '-50%', opacity: 0.8 }}
          animate={{ width: 140, height: 140, opacity: 0 }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
        />
      ))}
    </motion.button>
  );
}
