import React from 'react';

const Card = ({ 
  children, 
  className = '', 
  padding = 'md',
  shadow = 'md',
  ...props 
}) => {
  const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
    xl: 'p-10'
  };
  
  const shadowClasses = {
    none: '',
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg',
    xl: 'shadow-xl'
  };
  
  const classes = `
    bg-white rounded-lg border border-gray-200
    ${paddingClasses[padding]}
    ${shadowClasses[shadow]}
    ${className}
  `.trim();
  
  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
};

export default Card;
