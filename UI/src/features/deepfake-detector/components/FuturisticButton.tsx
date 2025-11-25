import React from 'react';

interface FuturisticButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
  className?: string;
}

const FuturisticButton: React.FC<FuturisticButtonProps> = ({
  onClick,
  children,
  variant = 'primary',
  className = '',
  disabled = false,
  type = 'button',
  ...rest
}) => {
  const baseClasses = `
    relative font-semibold text-lg rounded-xl cursor-pointer border-none
    text-white overflow-hidden mt-5 transition-transform duration-300
    hover:scale-95 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed
  `;

  const variantClasses =
    variant === 'primary'
      ? 'bg-gradient-to-r from-blue-600 to-cyan-400'
      : 'bg-gradient-to-r from-orange-500 to-red-500';

  return (
    <button
      className={`${baseClasses} ${variantClasses} ${className} btn-skew`}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      aria-busy={disabled}
      type={type}
      {...rest}
    >
      <span className='relative z-10 flex items-center px-4 py-3 transition-colors duration-400'>{children}</span>
    </button>
  );
};

export default FuturisticButton;
