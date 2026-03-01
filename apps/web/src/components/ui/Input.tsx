import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, id, className = '', ...props }: InputProps) {
  return (
    <div className={`form-group ${error ? 'form-group--error' : ''} ${className}`}>
      {label && <label htmlFor={id}>{label}</label>}
      <input id={id} className={error ? 'input--error' : ''} {...props} />
      {error && <span className="form-error">{error}</span>}
    </div>
  );
}
