import React from 'react';

const Logo = ({ className = '', size = 'md' }) => {
  const sizes = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl',
    xl: 'text-4xl'
  };
  
  return (
    <div className={`font-bold ${sizes[size]} ${className}`}>
      <span className="text-black">Fly</span>
      <span className="text-gray-600">By</span>
      <span className="text-black">Views</span>
    </div>
  );
};

export default Logo;
