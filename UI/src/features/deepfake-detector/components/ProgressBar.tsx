import React from 'react';

interface ProgressBarProps {
  progress: number;
  status: string;
  className?: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ progress, status, className = '' }) => {
  return (
    <div className={`w-full ${className}`}>
      <div className='w-full h-3 bg-blue-400/20 rounded-full mb-3'>
        <div
          className='h-full bg-gradient-to-r from-blue-600 to-cyan-400 rounded-full transition-all duration-300 progress-animated'
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className='text-blue-400 text-center'>{status}</p>
    </div>
  );
};

export default ProgressBar;
