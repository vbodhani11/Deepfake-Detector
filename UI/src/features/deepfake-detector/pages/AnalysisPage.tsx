import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import ParticlesBackground from '../components/ParticlesBackground';
import FuturisticButton from '../components/FuturisticButton';
import ProgressBar from '../components/ProgressBar';
import FrameByFramePlayer from '../components/FrameByFramePlayer';
import { DetectionRecord, DetectionStatus, fetchDetectionById } from '../api/detection';

// Use the same base URL strategy as the API modules
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
  const locationState = location.state as LocationState;
  const detectionId = locationState?.detectionId;
  const initialDetection = locationState?.initialDetection;
  const uploadedFileName = locationState?.fileName || initialDetection?.file_name;

  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisStatus, setAnalysisStatus] = useState('Initializing analysis...');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [detection, setDetection] = useState<DetectionRecord | null>(initialDetection ?? null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!detectionId) {
      navigate('/upload');
      return;
    }

    let pollTimeout: number | undefined;
    let isActive = true;

    const statusMessages: Record<DetectionStatus, string> = {
      pending: 'Waiting for the detection pipeline to start...',
      processing: 'Running deepfake detection models...',
      completed: 'Analysis complete!',
      failed: 'Analysis failed',
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
      setDetection(record);

      if (record.status === 'completed') {
        const completedResult = buildResultFromDetection(record);
        setResult(completedResult);
        setAnalysisStatus(statusMessages.completed);
        setAnalysisProgress(100);
        setIsAnalyzing(false);
      } else if (record.status === 'failed') {
        setResult(null);
        setAnalysisStatus(record.error_message || statusMessages.failed);
        setAnalysisProgress(prev => (prev < 90 ? prev : 90));
        setIsAnalyzing(false);
      } else {
        setResult(null);
        setAnalysisStatus(statusMessages[record.status]);
        setAnalysisProgress(prev => Math.min(prev + 10, 90));
        setIsAnalyzing(true);
      }
    };

    const pollDetection = async () => {
      try {
        const latest = await fetchDetectionById(detectionId);
        updateDetectionState(latest);

        if (latest.status === 'pending' || latest.status === 'processing') {
          pollTimeout = window.setTimeout(pollDetection, 4000);
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

    if (initialDetection) {
      updateDetectionState(initialDetection);
      if (initialDetection.status === 'pending' || initialDetection.status === 'processing') {
        pollTimeout = window.setTimeout(pollDetection, 4000);
      }
    } else {
      pollDetection();
    }

    return () => {
      isActive = false;
      if (pollTimeout) {
        clearTimeout(pollTimeout);
      }
    };
  }, [detectionId, initialDetection, navigate]);

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
            {isAnalyzing ? (
              <div>
                <div className='text-6xl mb-6'>🔍</div>
                <ProgressBar progress={analysisProgress} status={analysisStatus} className='mb-6' />
                <p className='text-gray-400'>Please wait while we analyze your file for deepfake content...</p>
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
                {/* Results Header */}
                <div className={`text-8xl mb-6 ${result.isDeepfake ? 'text-red-500' : 'text-green-500'}`}>
                  {result.isDeepfake ? '⚠️' : '✅'}
                </div>

                <h2 className={`text-4xl font-bold mb-4 ${result.isDeepfake ? 'text-red-400' : 'text-green-400'}`}>
                  {result.isDeepfake ? 'DEEPFAKE DETECTED' : 'AUTHENTIC CONTENT'}
                </h2>

                <div className='mb-6'>
                  <p className='text-2xl mb-2'>Confidence Score</p>
                  <div className='w-full bg-gray-700 rounded-full h-4 mb-2'>
                    <div
                      className={`h-4 rounded-full transition-all duration-1000 ${
                        result.isDeepfake
                          ? 'bg-gradient-to-r from-red-600 to-red-400'
                          : 'bg-gradient-to-r from-green-600 to-green-400'
                      }`}
                      style={{ width: `${result.confidence}%` }}
                    />
                  </div>
                  <p className='text-xl font-semibold'>
                    {result.confidence.toFixed(1)}% {result.isDeepfake ? 'Deepfake' : 'Authentic'}
                  </p>
                </div>

                {/* Frame-by-Frame Video Player for Fake Videos */}
                {result.isDeepfake &&
                  detection?.media_type === 'video' &&
                  detection?.frame_predictions &&
                  detection.frame_predictions.frames &&
                  detection.frame_predictions.frames.length > 0 && (
                    <div className='mb-8'>
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
        </div>

        {/* Footer */}
        <footer className='mt-16 text-gray-500 text-sm'>© 2025 DeepFake Detector All rights reserved</footer>
      </div>
    </div>
  );
};

export default AnalysisPage;
