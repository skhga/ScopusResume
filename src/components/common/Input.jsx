import React, { forwardRef } from 'react';

const Input = forwardRef(({ label, error, helperText, type = 'text', className = '', ...rest }, ref) => (
  <div className="w-full">
    {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
    <input
      ref={ref} type={type}
      className={`w-full px-4 py-2.5 border rounded-lg text-sm outline-none transition focus:ring-2 focus:ring-brand-500 focus:border-brand-500 ${error ? 'border-red-500' : 'border-gray-300'} ${className}`}
      {...rest}
    />
    {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    {!error && helperText && <p className="mt-1 text-sm text-gray-500">{helperText}</p>}
  </div>
));
Input.displayName = 'Input';
export default Input;
