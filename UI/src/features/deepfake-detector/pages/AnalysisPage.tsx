import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import ParticlesBackground from '../components/ParticlesBackground';
import FuturisticButton from '../components/FuturisticButton';
import ProgressBar from '../components/ProgressBar';

interface AnalysisResult {
  isDeepfake: boolean;
  confidence: number;
  details: string[];
}

interface LocationState {
  file?: File;
}

const AnalysisPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as LocationState;
  const uploadedFile = locationState?.file;

  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisStatus, setAnalysisStatus] = useState('Initializing analysis...');
  const [result, setResult] = useState<AnalysisResult | null>(null);

  useEffect(() => {
    if (!uploadedFile) {
      navigate('/upload');
      return;
    }

    // Simulate analysis process
    simulateAnalysis();
  }, [uploadedFile, navigate]);

  const simulateAnalysis = () => {
    const stages = [
      'Initializing analysis...',
      'Loading AI models...',
      'Processing frames...',
      'Detecting facial features...',
      'Analyzing temporal consistency...',
      'Running deepfake detection...',
      'Generating confidence scores...',
      'Finalizing results...',
    ];

    let currentStage = 0;
    let progress = 0;

    const interval = setInterval(() => {
      progress += Math.random() * 10 + 5;

      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        setAnalysisProgress(100);
        setAnalysisStatus('Analysis complete!');
        setIsAnalyzing(false);

        // Generate mock results
        const mockResult: AnalysisResult = {
          isDeepfake: Math.random() > 0.5,
          confidence: Math.random() * 40 + 60, // 60-100%
          details: [
            'Facial landmark analysis completed',
            'Temporal consistency check passed',
            'Pixel-level artifacts detected',
            'Neural network confidence calculated',
          ],
        };
        setResult(mockResult);
      } else {
        const stageIndex = Math.floor((progress / 100) * stages.length);
        if (stageIndex !== currentStage && stageIndex < stages.length) {
          currentStage = stageIndex;
          setAnalysisStatus(stages[stageIndex]);
        }
        setAnalysisProgress(progress);
      }
    }, 500);
  };

  if (!uploadedFile) {
    return null;
  }

  return (
    <div className='min-h-screen bg-black text-gray-300 relative overflow-x-hidden'>
      <ParticlesBackground />

      <div className='relative z-10 text-center px-4 py-8'>
        {/* Header */}
        <h1 className='text-5xl font-bold text-blue-400 uppercase tracking-wide mb-4 mt-8'>DeepFake Analysis</h1>
        <p className='text-xl text-gray-400 mb-12'>Analyzing your file: {uploadedFile.name}</p>

        {/* Analysis Section */}
        <div className='max-w-4xl mx-auto mb-12'>
          <div className='bg-gray-800 bg-opacity-60 rounded-xl p-8 backdrop-blur-sm'>
            {isAnalyzing ? (
              <div>
                <div className='text-6xl mb-6'>🔍</div>
                <ProgressBar progress={analysisProgress} status={analysisStatus} className='mb-6' />
                <p className='text-gray-400'>Please wait while we analyze your file for deepfake content...</p>
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
