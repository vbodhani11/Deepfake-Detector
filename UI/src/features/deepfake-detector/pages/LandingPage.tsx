import React from 'react';
import { useNavigate } from 'react-router-dom';
import ParticlesBackground from '../components/ParticlesBackground';
import FuturisticButton from '../components/FuturisticButton';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  const features = [
    {
      title: 'Real-time Analysis',
      description: 'Instant video processing with live feedback and progress tracking.',
    },
    {
      title: 'Confidence Scoring',
      description: 'Detailed probability analysis with frame-by-frame deepfake detection metrics.',
    },
    {
      title: 'Detailed Reports',
      description: 'Comprehensive analysis with downloadable results and visual indicators.',
    },
    {
      title: 'Easy & Fast Process',
      description: 'Simple three-step detection—upload, analyze, and get results in minutes.',
    },
    {
      title: 'Advanced Security',
      description: 'Enterprise-grade security with encrypted processing and secure data handling.',
    },
    {
      title: 'Auto-Updates',
      description: 'Continuous model updates to detect the latest deepfake technologies.',
    },
  ];

  return (
    <div className='min-h-screen bg-animated text-gray-300 relative overflow-x-hidden deepfake-app'>
      <ParticlesBackground />

      {/* Main Content */}
      <div className='relative z-10 text-center'>
        {/* Header */}
        <div className='pt-16 pb-8'>
          <h1 className='text-6xl font-bold text-blue-400 uppercase tracking-wide mb-6 pulse-glow'>
            Deepfake Detector
          </h1>
          <h2 className='text-4xl font-bold text-blue-400 uppercase tracking-wide mb-8 text-shadow-blue-400'>
            Expose the Fake
          </h2>
          <p className='text-xl text-gray-400 max-w-3xl mx-auto px-4 mb-8'>
            Harness the power of advanced AI to detect manipulated videos and protect against digital deception.
            <br />
            Upload, analyze, and detect with confidence.
          </p>

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
              className='mr-3 transition-transform duration-300 group-hover:translate-x-1'
            >
              <line x1='5' y1='12' x2='19' y2='12'></line>
              <polyline points='12 5 19 12 12 19'></polyline>
            </svg>
            Start Detection
          </FuturisticButton>
        </div>

        {/* Features Section */}
        <div className='py-16 px-4'>
          <h3 className='text-4xl font-bold text-yellow-400 uppercase tracking-wide mb-12'>
            Advanced Detection Features
          </h3>

          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto'>
            {features.map((feature, index) => (
              <div
                key={index}
                className='bg-gray-800 bg-opacity-60 rounded-lg p-6 backdrop-blur-sm
                           feature-card-hover cursor-pointer group'
              >
                <h4
                  className='text-2xl font-bold text-blue-400 uppercase tracking-wide mb-4 
                               transition-all duration-300 group-hover:text-yellow-400 
                               group-hover:scale-110'
                >
                  {feature.title}
                </h4>
                <p className='text-gray-300'>{feature.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <footer className='py-8 text-gray-500 text-sm'>© 2025 DeepFake Detector. All rights reserved.</footer>
      </div>
    </div>
  );
};

export default LandingPage;
