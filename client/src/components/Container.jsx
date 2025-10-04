import React from 'react';

const Container = ({ 
  children, 
  className = '', 
  maxWidth = 'lg',
  center = true,
  ...props 
}) => {
  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '4xl': 'max-w-4xl',
    '6xl': 'max-w-6xl',
    full: 'max-w-full'
  };
  
  const classes = `
    w-full mx-auto px-4 sm:px-6 lg:px-8
    ${maxWidthClasses[maxWidth]}
    ${center ? 'flex flex-col items-center justify-center' : ''}
    ${className}
  `.trim();
  
  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
};

export default Container;
