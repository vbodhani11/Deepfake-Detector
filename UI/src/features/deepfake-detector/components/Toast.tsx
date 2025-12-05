import React, { useEffect, useState } from 'react';

export type ToastType = 'info' | 'success' | 'warning' | 'error';

interface ToastProps {
  message: string;
  type?: ToastType;
  duration?: number;
  onClose?: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type = 'info', duration = 5000, onClose }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onClose?.(), 300); // Wait for fade-out animation
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const typeStyles = {
    info: 'bg-violet-600/90 border-violet-400 text-violet-100', // Changed from blue to violet for better contrast
    success: 'bg-emerald-500/90 border-emerald-400 text-emerald-100',
    warning: 'bg-amber-500/90 border-amber-400 text-amber-100',
    error: 'bg-rose-500/90 border-rose-400 text-rose-100',
  };

  const icons = {
    info: 'ℹ️',
    success: '✅',
    warning: '⚠️',
    error: '❌',
  };

  if (!isVisible) return null;

  return (
    <div
      className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 px-6 py-4 rounded-lg border-2 shadow-2xl backdrop-blur-sm transition-all duration-300 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
      } ${typeStyles[type]}`}
      style={{ minWidth: '300px', maxWidth: '90vw' }}
    >
      <div className='flex items-center gap-3'>
        <span className='text-2xl'>{icons[type]}</span>
        <p className='font-semibold text-sm flex-1'>{message}</p>
        <button
          onClick={() => {
            setIsVisible(false);
            setTimeout(() => onClose?.(), 300);
          }}
          className='text-current opacity-70 hover:opacity-100 transition-opacity ml-2'
          aria-label='Close'
        >
          ✕
        </button>
      </div>
    </div>
  );
};

export default Toast;

