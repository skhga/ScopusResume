import React, { forwardRef } from 'react';

const Input = forwardRef(({ label, error, helperText, type = 'text', className = '', ...rest }, ref) => (
  <div className="w-full">
    {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
    <input
      ref={ref} type={type}
      className={`input-field text-sm ${error ? '!border-red-500' : ''} ${className}`}
      {...rest}
    />
    {error && <p className="field-error">{error}</p>}
    {!error && helperText && <p className="mt-1 text-sm text-gray-500">{helperText}</p>}
  </div>
));
Input.displayName = 'Input';
export default Input;
