import React from 'react';

const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  disabled = false, 
  className = '', 
  onClick,
  type = 'button',
  ...props 
}) => {
  const baseClasses = 'font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  const variants = {
    primary: 'bg-black text-white hover:bg-gray-800 focus:ring-gray-500 disabled:bg-gray-400 disabled:cursor-not-allowed',
    secondary: 'bg-white text-black border border-black hover:bg-gray-50 focus:ring-gray-500 disabled:bg-gray-100 disabled:cursor-not-allowed',
    outline: 'bg-transparent text-black border border-black hover:bg-black hover:text-white focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed',
    ghost: 'bg-transparent text-black hover:bg-gray-100 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed'
  };
  
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
    xl: 'px-8 py-4 text-xl'
  };
  
  const classes = `${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`;
  
  return (
    <button
      type={type}
      className={classes}
      disabled={disabled}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
