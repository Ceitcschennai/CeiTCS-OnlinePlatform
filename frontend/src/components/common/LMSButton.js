import React from 'react';
import './LMSButton.css';

const LMSButton = ({
  variant = 'primary',
  children,
  type = 'button',
  disabled = false,
  loading = false,
  fullWidth = false,
  onClick,
  className = '',
  ...props
}) => {
  const variantClass = `btn-lms-${variant}`;
  const additionalClasses = [
    loading ? 'btn-lms-loading' : '',
    fullWidth ? 'btn-lms-full-width' : '',
    'lms-focus-visible',
    className
  ].filter(Boolean).join(' ');
  
  const classes = `btn-lms ${variantClass} ${additionalClasses}`.trim();

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || loading}
      onClick={onClick}
      aria-busy={loading}
      {...props}
    >
      {children}
    </button>
  );
};

export default LMSButton;