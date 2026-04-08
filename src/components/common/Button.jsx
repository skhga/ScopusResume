import React from 'react';
import { Loader2 } from 'lucide-react';

const variants = {
  primary:   'btn-primary',
  secondary: 'btn-secondary',
  danger:    'btn-danger',
  ghost:     'bg-transparent text-gray-700 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 rounded-lg transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed',
};
const sizes = {
  sm: 'px-3 py-1.5 text-sm min-h-[36px]',
  md: 'text-sm',
  lg: 'text-base',
};

export default function Button({ variant = 'primary', size = 'md', loading, disabled, children, className = '', ...rest }) {
  const isGhost = variant === 'ghost';
  return (
    <button
      disabled={disabled || loading}
      className={`${variants[variant]} ${isGhost ? sizes[size] : size !== 'md' ? sizes[size] : ''} ${className}`}
      {...rest}
    >
      {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
      {children}
    </button>
  );
}
