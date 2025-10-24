import React from 'react';

interface FuturisticButtonProps {
  onClick?: () => void;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary';
  className?: string;
}

const FuturisticButton: React.FC<FuturisticButtonProps> = ({
  onClick,
  children,
  variant = 'primary',
  className = '',
}) => {
  const baseClasses = `
    relative font-semibold text-lg rounded-xl cursor-pointer border-none
    text-white overflow-hidden mt-5 transition-transform duration-300
    hover:scale-95 active:scale-95
  `;

  const variantClasses =
    variant === 'primary'
      ? 'bg-gradient-to-r from-blue-600 to-cyan-400'
      : 'bg-gradient-to-r from-orange-500 to-red-500';

  return (
    <button className={`${baseClasses} ${variantClasses} ${className} btn-skew`} onClick={onClick}>
      <span className='relative z-10 flex items-center px-4 py-3 transition-colors duration-400'>{children}</span>
    </button>
  );
};

export default FuturisticButton;
