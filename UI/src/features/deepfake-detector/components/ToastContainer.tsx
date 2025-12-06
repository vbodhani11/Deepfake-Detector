import React from 'react';
import Toast, { ToastType } from './Toast';

export interface ToastMessage {
  id: string;
  message: string;
  type?: ToastType;
  duration?: number;
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  onRemove: (id: string) => void;
}

const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onRemove }) => {
  return (
    <div className='fixed top-4 left-1/2 transform -translate-x-1/2 z-50 space-y-2 pointer-events-none'>
      {toasts.map(toast => (
        <div key={toast.id} className='pointer-events-auto'>
          <Toast
            message={toast.message}
            type={toast.type}
            duration={toast.duration}
            onClose={() => onRemove(toast.id)}
          />
        </div>
      ))}
    </div>
  );
};

export default ToastContainer;

