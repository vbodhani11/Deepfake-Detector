import React, { useState, useEffect } from 'react';

interface AnalysisStep {
  id: string;
  label: string;
  icon: string;
  description: string;
}

interface AnalysisProgressProps {
  progress: number;
  status: string;
  className?: string;
  elapsedTime?: number;
  detectionStatus?: 'pending' | 'processing' | 'completed' | 'failed';
  uploadComplete?: boolean; // Track if upload is complete
}

const ANALYSIS_STEPS: AnalysisStep[] = [
  {
    id: 'upload',
    label: 'Uploading',
    icon: '📤',
    description: 'Receiving your video file...',
  },
  {
    id: 'trim',
    label: 'Preparing',
    icon: '✂️',
    description: 'Optimizing video for analysis...',
  },
  {
    id: 'extract',
    label: 'Extracting Frames',
    icon: '🎬',
    description: 'Extracting frames at 3 FPS...',
  },
  {
    id: 'detect',
    label: 'Detecting Faces',
    icon: '👤',
    description: 'Finding faces in each frame...',
  },
  {
    id: 'analyze',
    label: 'Analyzing',
    icon: '🤖',
    description: 'Running deepfake detection model...',
  },
  {
    id: 'aggregate',
    label: 'Finalizing',
    icon: '📊',
    description: 'Compiling results...',
  },
];

const AnalysisProgress: React.FC<AnalysisProgressProps> = ({ 
  progress, 
  status, 
  className = '', 
  elapsedTime = 0,
  detectionStatus,
  uploadComplete = false
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [pulseStep, setPulseStep] = useState(0);

  // Map detection status and progress to specific steps
  // Since API processes synchronously, we simulate step progression based on elapsed time
  useEffect(() => {
    let stepIndex = 0;
    
    // Step 0 (Uploading) is complete once upload is done, not when API returns
    if (!uploadComplete) {
      // Still uploading
      stepIndex = 0;
    } else if (detectionStatus === 'completed') {
      stepIndex = ANALYSIS_STEPS.length; // All steps complete (beyond last index)
    } else if (detectionStatus === 'failed') {
      // Keep current step on failure
      stepIndex = currentStepIndex;
    } else {
      // Upload is complete, now progress through analysis steps based on elapsed time
      // API processes synchronously, so we simulate steps based on elapsed time
      // Typical analysis takes 20-30 seconds, so:
      // - Step 1 (Preparing): 0-3s
      // - Step 2 (Extracting): 3-8s  
      // - Step 3 (Detecting): 8-15s
      // - Step 4 (Analyzing): 15-25s
      // - Step 5 (Finalizing): 25s+
      
      if (elapsedTime < 3) {
        stepIndex = 1; // Preparing
      } else if (elapsedTime < 8) {
        stepIndex = 2; // Extracting Frames
      } else if (elapsedTime < 15) {
        stepIndex = 3; // Detecting Faces
      } else if (elapsedTime < 25) {
        stepIndex = 4; // Analyzing
      } else {
        stepIndex = 5; // Finalizing
      }
      
      // Also use progress as a fallback/adjustment
      // If progress suggests we're further along, use that
      if (progress > 0) {
        const progressBasedStep = Math.min(
          Math.floor((progress / 100) * (ANALYSIS_STEPS.length - 1)) + 1,
          ANALYSIS_STEPS.length - 1
        );
        // Use the higher of time-based or progress-based step
        stepIndex = Math.max(stepIndex, progressBasedStep);
      }
    }
    
    setCurrentStepIndex(stepIndex);
  }, [progress, detectionStatus, elapsedTime, uploadComplete]);

  // Ensure progress is always visible (minimum 5%)
  const displayProgress = Math.max(5, progress);
  
  // Active step index
  const activeStepIndex = currentStepIndex;

  // Pulse animation for active step
  useEffect(() => {
    const interval = setInterval(() => {
      setPulseStep(prev => (prev + 1) % ANALYSIS_STEPS.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`w-full ${className}`}>
      {/* Main Progress Bar */}
      <div className='w-full h-4 bg-slate-800/50 rounded-full mb-6 overflow-hidden'>
        <div
          className='h-full bg-gradient-to-r from-violet-600 via-purple-500 to-cyan-400 rounded-full transition-all duration-500 progress-animated relative'
          style={{ width: `${displayProgress}%` }}
        >
          <div className='absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer' />
        </div>
      </div>

      {/* Status Message */}
      <div className='text-center mb-8'>
        <p className='text-violet-300 text-lg font-semibold mb-2'>{status}</p>
        <div className='flex justify-center items-center gap-4 text-slate-400 text-sm'>
          <span>{displayProgress.toFixed(0)}% Complete</span>
          {elapsedTime > 0 && (
            <>
              <span>•</span>
              <span>⏱️ {elapsedTime}s elapsed</span>
            </>
          )}
        </div>
      </div>

      {/* Step Indicators - Always show all steps */}
      <div className='grid grid-cols-3 md:grid-cols-6 gap-2 md:gap-4 mb-6' style={{ minHeight: '120px' }}>
        {ANALYSIS_STEPS.map((step, index) => {
          // Determine step state based on activeStepIndex
          // Step 0 (Uploading) is completed once uploadComplete is true
          const isUploadingStep = index === 0;
          const isCompleted = index < activeStepIndex || (isUploadingStep && uploadComplete);
          const isActive = index === activeStepIndex && !isCompleted;
          const isPending = index > activeStepIndex;

          return (
            <div
              key={step.id}
              className={`flex flex-col items-center p-3 rounded-lg transition-all duration-300 ${
                isCompleted
                  ? 'bg-emerald-500/20 border-2 border-emerald-500/50'
                  : isActive
                  ? 'bg-violet-500/30 border-2 border-violet-400 scale-105 shadow-lg shadow-violet-500/50'
                  : 'bg-slate-800/30 border-2 border-slate-700/50 opacity-50'
              }`}
            >
              <div
                className={`text-3xl mb-2 transition-all duration-300 ${
                  isActive ? 'animate-bounce' : isCompleted ? 'opacity-100' : 'opacity-40'
                }`}
              >
                {step.icon}
              </div>
              <p
                className={`text-xs font-semibold text-center transition-colors ${
                  isCompleted
                    ? 'text-emerald-300'
                    : isActive
                    ? 'text-violet-200'
                    : 'text-slate-500'
                }`}
              >
                {step.label}
              </p>
              {isActive && (
                <div className='mt-2 flex gap-1'>
                  <div className='w-1 h-1 bg-violet-400 rounded-full animate-pulse' />
                  <div className='w-1 h-1 bg-violet-400 rounded-full animate-pulse delay-75' />
                  <div className='w-1 h-1 bg-violet-400 rounded-full animate-pulse delay-150' />
                </div>
              )}
              {isCompleted && (
                <div className='mt-2 text-emerald-400 text-sm'>✓</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Current Step Description */}
      {ANALYSIS_STEPS[activeStepIndex] && (
        <div className='text-center'>
          <p className='text-slate-300 text-sm italic'>
            {ANALYSIS_STEPS[activeStepIndex].description}
          </p>
        </div>
      )}

      {/* Animated Loading Spinner */}
      <div className='flex justify-center mt-6'>
        <div className='relative w-16 h-16'>
          <div className='absolute inset-0 border-4 border-violet-500/20 rounded-full' />
          <div className='absolute inset-0 border-4 border-transparent border-t-violet-400 rounded-full animate-spin' />
          <div className='absolute inset-2 border-4 border-cyan-500/20 rounded-full' />
          <div className='absolute inset-2 border-4 border-transparent border-t-cyan-400 rounded-full animate-spin animate-reverse' />
        </div>
      </div>
    </div>
  );
};

export default AnalysisProgress;

