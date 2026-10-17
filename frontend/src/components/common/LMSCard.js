import React from 'react';
import './LMSCard.css';

const LMSCard = ({
  children,
  className = '',
  hover = false,
  clickable = false,
  padding,
  shadow = true,
  border = true,
  onClick,
  ...props
}) => {
  const modifiers = [
    hover ? 'card-lms--hover' : '',
    clickable ? 'card-lms--clickable' : '',
    !border ? 'card-lms--no-border' : '',
    !shadow ? 'card-lms--no-shadow' : '',
    padding ? `card-lms--padding-${padding}` : ''
  ].filter(Boolean).join(' ');
  
  const classes = `card-lms ${modifiers} ${className}`.trim();

  if (clickable) {
    return (
      <div
        className={classes}
        onClick={onClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            onClick?.(e);
          }
        }}
        {...props}
      >
        {children}
      </div>
    );
  }

  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
};

LMSCard.Header = ({ children, className = '', ...props }) => (
  <div className={`card-lms-header ${className}`.trim()} {...props}>
    {children}
  </div>
);

LMSCard.Body = ({ children, className = '', ...props }) => (
  <div className={`card-lms-body ${className}`.trim()} {...props}>
    {children}
  </div>
);

LMSCard.Footer = ({ children, className = '', ...props }) => (
  <div className={`card-lms-footer ${className}`.trim()} {...props}>
    {children}
  </div>
);

export default LMSCard;