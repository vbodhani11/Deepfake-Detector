import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import ParticlesBackground from '../components/ParticlesBackground';
import FuturisticButton from '../components/FuturisticButton';
import ProgressBar from '../components/ProgressBar';
import AnalysisProgress from '../components/AnalysisProgress';
import FrameByFramePlayer from '../components/FrameByFramePlayer';
import { DetectionRecord, DetectionStatus, fetchDetectionById, saveDetectionReport } from '../api/detection';

// API base URL configuration (consistent with detection.ts)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';
const API_V1_BASE = `${API_BASE_URL.replace(/\/$/, '')}/v1`;

interface AnalysisResult {
  isDeepfake: boolean;
  confidence: number;
  details: string[];
}

interface LocationState {
  detectionId?: string;
  fileName?: string;
  initialDetection?: DetectionRecord;
}

const AnalysisPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const locationState = location.state as LocationState;
  const detectionId = locationState?.detectionId || searchParams.get('detectionId') || undefined;
  const initialDetection = locationState?.initialDetection;
  const uploadedFileName = locationState?.fileName || initialDetection?.file_name;

  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [analysisProgress, setAnalysisProgress] = useState(10); // Start at 10% so it's clearly visible
  const [analysisStatus, setAnalysisStatus] = useState('Initializing analysis...');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [detection, setDetection] = useState<DetectionRecord | null>(initialDetection ?? null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [progressAnimationInterval, setProgressAnimationInterval] = useState<number | undefined>(undefined);

  const token =
    (typeof window !== 'undefined' && window.localStorage
      ? window.localStorage.getItem('deepfake_token') || window.localStorage.getItem('auth_token')
      : null) || null;
  const isAuth = !!token;

  useEffect(() => {
    if (!detectionId) {
      navigate('/upload');
      return;
    }

    let pollTimeout: number | undefined;
    let elapsedInterval: number | undefined;
    let isActive = true;
    const startTime = Date.now();

    const statusMessages: Record<DetectionStatus, string> = {
      pending: 'Initializing detection pipeline...',
      processing: 'Analyzing video frames with AI models...',
      completed: 'Analysis complete!',
      failed: 'Analysis failed',
    };

    // Simulate realistic progress based on status
    const simulateProgress = (status: DetectionStatus, currentProgress: number): number => {
      if (status === 'completed') return 100;
      if (status === 'failed') return currentProgress;
      if (status === 'pending') {
        // Slowly increase from 0-20% while pending
        return Math.min(20, currentProgress + 1.5);
      }
      if (status === 'processing') {
        // Gradually increase from 20-95% while processing
        if (currentProgress < 20) return 20;
        return Math.min(95, currentProgress + 2);
      }
      return currentProgress;
    };

    // Continuous progress animation to show activity - uses ref to track detection status
    let progressInterval: number | undefined;
    let currentDetectionRef: DetectionRecord | null = initialDetection ?? detection;
    
    const startProgressAnimation = () => {
      // Clear any existing interval first
      setProgressAnimationInterval(prev => {
        if (prev) {
          clearInterval(prev);
        }
        return undefined;
      });
      
      // Start new interval
      const interval = window.setInterval(() => {
        setAnalysisProgress(prev => {
          // Check current detection status from ref
          const currentStatus = currentDetectionRef?.status;
          
          // Don't animate if completed or failed
          if (currentStatus === 'completed' || currentStatus === 'failed') {
            return prev;
          }
          
          // Don't animate if already at max
          if (prev >= 95) return prev;
          
          // Determine increment and max based on status
          let increment: number;
          let maxProgress: number;
          
          if (currentStatus === 'processing') {
            increment = 1.2; // Faster increment for processing
            maxProgress = 95;
          } else if (currentStatus === 'pending') {
            increment = 0.6; // Slower for pending
            maxProgress = 20;
          } else {
            // Default for unknown status
            increment = 0.5;
            maxProgress = 20;
          }
          
          const newProgress = Math.min(prev + increment, maxProgress);
          return newProgress;
        });
      }, 400); // Update every 400ms for smooth, visible animation
      
      setProgressAnimationInterval(interval);
      progressInterval = interval;
    };

    // Stop progress animation
    const stopProgressAnimation = () => {
      if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = undefined;
      }
      setProgressAnimationInterval(prev => {
        if (prev) {
          clearInterval(prev);
        }
        return undefined;
      });
    };

    const buildResultFromDetection = (record: DetectionRecord): AnalysisResult | null => {
      if (record.status !== 'completed' || !record.result) {
        return null;
      }

      const confidence = record.confidence_score ?? 0;
      const normalizedConfidence = confidence > 1 ? confidence : confidence * 100;

      const details = [
        `Media type analyzed: ${record.media_type.toUpperCase()}`,
        record.processing_time_seconds ? `Processing time: ${record.processing_time_seconds.toFixed(2)} seconds` : null,
        'Inference completed using the latest detection pipeline',
      ].filter(Boolean) as string[];

      return {
        isDeepfake: record.result === 'fake',
        confidence: Math.min(100, Math.max(0, normalizedConfidence)),
        details,
      };
    };

    const updateDetectionState = (record: DetectionRecord) => {
      if (!isActive) {
        return;
      }
      setErrorMessage(null);
      currentDetectionRef = record; // Update ref for animation
      setDetection(record);

      if (record.status === 'completed') {
        stopProgressAnimation();
        const completedResult = buildResultFromDetection(record);
        setResult(completedResult);
        setAnalysisStatus(statusMessages.completed);
        setAnalysisProgress(100);
        setIsAnalyzing(false);
        if (elapsedInterval) {
          clearInterval(elapsedInterval);
        }
      } else if (record.status === 'failed') {
        stopProgressAnimation();
        setResult(null);
        setAnalysisStatus(record.error_message || statusMessages.failed);
        setAnalysisProgress(prev => (prev < 90 ? prev : 90));
        setIsAnalyzing(false);
      } else {
        // Keep animation running for pending/processing
        setResult(null);
        setAnalysisStatus(statusMessages[record.status]);
        setAnalysisProgress(prev => {
          const newProgress = simulateProgress(record.status, prev);
          return newProgress;
        });
        setIsAnalyzing(true);
      }
    };

    const pollDetection = async () => {
      try {
        const latest = await fetchDetectionById(detectionId);
        updateDetectionState(latest);

        if (latest.status === 'pending' || latest.status === 'processing') {
          // Update progress even while waiting for next poll
          setAnalysisProgress(prev => simulateProgress(latest.status, prev));
          pollTimeout = window.setTimeout(pollDetection, 3000); // Poll every 3 seconds
        }
      } catch (error) {
        if (!isActive) {
          return;
        }
        const message = error instanceof Error ? error.message : 'Failed to fetch detection status';
        setErrorMessage(message);
        setIsAnalyzing(false);
        }
    };

    // Update elapsed time every second
    elapsedInterval = window.setInterval(() => {
      if (isActive) {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        setElapsedTime(elapsed);
      }
    }, 1000);

    // Start progress animation immediately
    startProgressAnimation();

    if (initialDetection) {
      updateDetectionState(initialDetection);
      if (initialDetection.status === 'pending' || initialDetection.status === 'processing') {
        pollTimeout = window.setTimeout(pollDetection, 3000);
      } else {
        stopProgressAnimation();
      }
    } else {
      pollDetection();
    }

    return () => {
      isActive = false;
      stopProgressAnimation();
      if (progressInterval) {
        clearInterval(progressInterval);
      }
      if (pollTimeout) {
        clearTimeout(pollTimeout);
      }
      if (elapsedInterval) {
        clearInterval(elapsedInterval);
      }
    };
  }, [detectionId, initialDetection, navigate]);

  // Auto-save after login if there was a pending detection
  useEffect(() => {
    if (!detectionId || !isAuth || isSaved || isSaving) return;
    const pendingId = typeof window !== 'undefined' ? window.localStorage.getItem('pending_save_detection_id') : null;
    if (pendingId && pendingId === detectionId && detection?.status === 'completed' && !detection.user_id) {
      (async () => {
        try {
          setIsSaving(true);
          const saved = await saveDetectionReport(detectionId);
          setDetection(saved);
          setIsSaved(true);
          window.localStorage.removeItem('pending_save_detection_id');
        } catch (err) {
          console.error('Auto-save failed', err);
        } finally {
          setIsSaving(false);
        }
      })();
    }
  }, [detectionId, isAuth, detection, isSaved, isSaving]);

  // Auto-save immediately for authenticated users on completed anonymous detections
  useEffect(() => {
    if (!isAuth || !detectionId || isSaved || isSaving) return;
    if (detection?.status === 'completed' && !detection.user_id) {
      (async () => {
        try {
          setIsSaving(true);
          const saved = await saveDetectionReport(detectionId);
          setDetection(saved);
          setIsSaved(true);
          if (typeof window !== 'undefined') {
            window.localStorage.removeItem('pending_save_detection_id');
          }
        } catch (err) {
          console.error('Auto-save (authenticated) failed', err);
        } finally {
          setIsSaving(false);
        }
      })();
    }
  }, [isAuth, detectionId, detection, isSaved, isSaving]);

  if (!detectionId) {
    return null;
  }

  return (
    <div className='min-h-screen bg-black text-gray-300 relative overflow-x-hidden'>
      <ParticlesBackground />

      <div className='relative z-10 text-center px-4 py-8'>
        {/* Header */}
        <h1 className='text-5xl font-bold text-blue-400 uppercase tracking-wide mb-4 mt-8'>DeepFake Analysis</h1>
        <p className='text-xl text-gray-400 mb-4'>Analyzing your file: {uploadedFileName || 'Selected media'}</p>
        {detection && (
          <p className='text-sm text-gray-500 mb-8'>
            Detection ID: <span className='font-mono text-gray-400'>{detection.id}</span>
          </p>
        )}

        {/* Analysis Section */}
        <div className='max-w-4xl mx-auto mb-12'>
          <div className='bg-gray-800 bg-opacity-60 rounded-xl p-8 backdrop-blur-sm'>
            {errorMessage && (
              <div className='text-red-400 mb-4'>
                <p className='text-lg font-semibold'>⚠️ {errorMessage}</p>
              </div>
            )}
            {(() => {
              const shouldShow = (!result && detection?.status !== 'completed' && detection?.status !== 'failed') || isAnalyzing;
              console.log('[AnalysisPage] Should show progress:', {
                shouldShow,
                isAnalyzing,
                hasResult: !!result,
                detectionStatus: detection?.status,
                analysisProgress,
                analysisStatus
              });
              return shouldShow;
            })() ? (
              <div>
                <AnalysisProgress progress={analysisProgress} status={analysisStatus} elapsedTime={elapsedTime} className='mb-6' />
                <div className='mt-8 p-6 bg-slate-900/40 rounded-lg border border-slate-700/50'>
                  <p className='text-slate-300 text-sm mb-2'>💡 <strong>What's happening?</strong></p>
                  <ul className='text-slate-400 text-xs space-y-1 text-left list-disc list-inside'>
                    <li>Your video is being processed frame by frame</li>
                    <li>Faces are detected and analyzed using advanced AI models</li>
                    <li>Each frame is evaluated for deepfake indicators</li>
                    <li>Results are compiled into a comprehensive report</li>
                  </ul>
                </div>
              </div>
            ) : detection && detection.status === 'failed' ? (
              <div>
                <div className='text-6xl mb-6'>❌</div>
                <h2 className='text-3xl font-bold text-red-400 mb-4'>Analysis Failed</h2>
                <p className='text-gray-400 mb-4'>
                  {detection.error_message || 'An unexpected error occurred during analysis.'}
                </p>
                <p className='text-gray-500'>Please try uploading the file again or contact support if the issue persists.</p>
              </div>
            ) : result ? (
              <div>
                {/* Results */}
                <div className={`text-8xl mb-6 ${result.isDeepfake ? 'text-red-500' : 'text-green-500'}`}>
                  {result.isDeepfake ? '⚠️' : '✅'}
                </div>

                <h2 className={`text-4xl font-bold mb-4 ${result.isDeepfake ? 'text-red-400' : 'text-green-400'}`}>
                  {result.isDeepfake ? 'DEEPFAKE DETECTED' : 'AUTHENTIC CONTENT'}
                </h2>

                <div className='mb-6'>
                  <p className='text-2xl mb-2'>Confidence Score</p>
                  <div className='w-full bg-gray-700 rounded-full h-4 mb-2 overflow-hidden'>
                    <div
                      className={`h-4 transition-all duration-700 ${
                        result.isDeepfake
                          ? 'bg-gradient-to-r from-red-600 to-red-400'
                          : 'bg-gradient-to-r from-green-600 to-green-400'
                      }`}
                      style={{ width: `${Math.min(Math.max(result.confidence, 0), 100)}%` }}
                    />
                  </div>
                  <div className='flex flex-wrap items-center justify-center gap-2 text-sm text-gray-200'>
                    <span className='font-semibold'>
                      {result.confidence.toFixed(2)}% {result.isDeepfake ? 'Deepfake' : 'Authentic'}
                    </span>
                    <span className='text-gray-500'>·</span>
                    <span className='font-semibold'>
                      {(100 - result.confidence).toFixed(2)}% {result.isDeepfake ? 'Authentic' : 'Deepfake'}
                    </span>
                  </div>
                </div>

                {/* Frame-by-Frame Analysis for Fake Videos */}
                {result.isDeepfake && 
                 detection?.media_type === 'video' && 
                 detection?.frame_predictions?.frames && 
                 detection.frame_predictions.frames.length > 0 && (
                  <div className='mt-8 mb-6'>
                    <FrameByFramePlayer
                      videoUrl={`${API_V1_BASE}/detection/${detection.id}/file`}
                      framePredictions={detection.frame_predictions.frames}
                      fps={detection.fps_used || 3}
                    />
                  </div>
                )}

                {/* Analysis Details */}
                <div className='text-left bg-gray-900 bg-opacity-50 rounded-lg p-6 mb-6'>
                  <h3 className='text-xl font-bold mb-4 text-blue-400'>Analysis Details:</h3>
                  <ul className='space-y-2'>
                    {result.details.map((detail, index) => (
                      <li key={index} className='flex items-center'>
                        <span className='text-green-400 mr-2'>✓</span>
                        {detail}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Recommendation */}
                <div
                  className={`p-4 rounded-lg ${
                    result.isDeepfake
                      ? 'bg-red-900 bg-opacity-30 border border-red-500'
                      : 'bg-green-900 bg-opacity-30 border border-green-500'
                  }`}
                >
                  <p className='text-lg'>
                    {result.isDeepfake
                      ? '⚠️ This content appears to be artificially generated. Exercise caution when sharing or using this media.'
                      : '✅ This content appears to be authentic. No signs of deepfake manipulation detected.'}
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* Action Buttons */}
  <div className='flex justify-center gap-6 flex-wrap'>
          <FuturisticButton onClick={() => navigate('/upload')}>
            <svg
              xmlns='http://www.w3.org/2000/svg'
              width='24'
              height='24'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='2'
              strokeLinecap='round'
              strokeLinejoin='round'
              className='mr-3'
            >
              <path d='M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z'></path>
              <polyline points='3 7 12 13 21 7'></polyline>
            </svg>
            Analyze Another File
          </FuturisticButton>

          <FuturisticButton onClick={() => navigate('/')}>
            <svg
              xmlns='http://www.w3.org/2000/svg'
              width='24'
              height='24'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='2'
              strokeLinecap='round'
              strokeLinejoin='round'
              className='mr-3'
            >
              <path d='M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z'></path>
              <polyline points='9 22 9 12 15 12 15 22'></polyline>
            </svg>
            Back to Home
          </FuturisticButton>
          {/* Save Report CTA */}
          {detection && detection.status === 'completed' && (
            !isAuth ? (
              <FuturisticButton
                variant='secondary'
                onClick={() => {
                  if (typeof window !== 'undefined' && detection.id) {
                    window.localStorage.setItem('pending_save_detection_id', detection.id);
                  }
                  const redirectUrl = `/analysis?detectionId=${encodeURIComponent(detection.id || '')}`;
                  navigate(`/login?redirect=${encodeURIComponent(redirectUrl)}`);
                }}
              >
                Save this report (Sign in)
              </FuturisticButton>
            ) : (
              isSaved && (
                <div className='text-green-300 text-sm font-semibold'>Report saved to your account.</div>
              )
            )
          )}
        </div>

        {/* Footer */}
        <footer className='mt-16 text-gray-500 text-sm'>© 2025 DeepFake Detector All rights reserved</footer>
      </div>
    </div>
  );
};

export default AnalysisPage;
