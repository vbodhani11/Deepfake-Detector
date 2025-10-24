import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ParticlesBackground from '../components/ParticlesBackground';
import FuturisticButton from '../components/FuturisticButton';
import FileUpload from '../components/FileUpload';
import ProgressBar from '../components/ProgressBar';

interface UploadedFile {
  file: File;
  preview?: string;
}

const UploadPage: React.FC = () => {
  const navigate = useNavigate();
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);

  const handleFileSelect = (file: File) => {
    setUploadedFile({ file });
    setIsUploading(true);
    setUploadComplete(false);

    // Generate preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = e => {
        setUploadedFile(prev => (prev ? { ...prev, preview: e.target?.result as string } : null));
      };
      reader.readAsDataURL(file);
    }

    // Simulate upload progress
    simulateUploadProgress(file);
  };

  const simulateUploadProgress = (file: File) => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 15;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        setUploadProgress(100);
        setUploadStatus(`Upload complete! ${file.name} (${formatFileSize(file.size)})`);
        setIsUploading(false);
        setUploadComplete(true);
      } else {
        setUploadProgress(progress);
        setUploadStatus(`Uploading: ${Math.round(progress)}%`);
      }
    }, 200);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleCheckDeepfake = () => {
    // Navigate to analysis/results page
    navigate('/analysis', { state: { file: uploadedFile?.file } });
  };

  return (
    <div className='min-h-screen bg-black text-gray-300 relative overflow-x-hidden'>
      <ParticlesBackground />

      <div className='relative z-10 text-center px-4 py-8'>
        {/* Header */}
        <h1
          className='text-5xl font-bold text-blue-400 uppercase tracking-wide mb-4 mt-8
                       transition-all duration-300 hover:text-shadow-lg hover:text-shadow-blue-400'
        >
          DeepFake Detector
        </h1>
        <p className='text-xl text-gray-400 mb-12'>Upload your video to detect deepfake content</p>

        {/* Upload Section */}
        <div className='max-w-4xl mx-auto mb-12'>
          {!uploadedFile ? (
            <FileUpload onFileSelect={handleFileSelect} />
          ) : (
            <div className='bg-gray-800 bg-opacity-60 rounded-xl p-8 backdrop-blur-sm'>
              {/* File Preview */}
              {uploadedFile.preview && (
                <img
                  src={uploadedFile.preview}
                  alt='Uploaded preview'
                  className='max-w-full max-h-64 mx-auto rounded-lg mb-6'
                />
              )}

              {/* Progress Bar */}
              {isUploading && <ProgressBar progress={uploadProgress} status={uploadStatus} className='mb-6' />}

              {/* Upload Complete Status */}
              {uploadComplete && (
                <div className='text-green-400 mb-6'>
                  <p className='text-lg font-semibold'>✅ {uploadStatus}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className='flex justify-center gap-6 flex-wrap'>
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
              className='mr-3 transform scale-x-[-1]'
            >
              <line x1='5' y1='12' x2='19' y2='12'></line>
              <polyline points='12 5 19 12 12 19'></polyline>
            </svg>
            Back to Home
          </FuturisticButton>

          {uploadComplete && (
            <FuturisticButton variant='secondary' onClick={handleCheckDeepfake}>
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
                <path d='M22 11.08V12a10 10 0 1 1-5.93-9.14'></path>
                <polyline points='22 4 12 14.01 9 11.01'></polyline>
              </svg>
              Check Deepfake
            </FuturisticButton>
          )}
        </div>

        {/* Footer */}
        <footer className='mt-16 text-gray-500 text-sm'>© 2025 DeepFake Detector All rights reserved</footer>
      </div>
    </div>
  );
};

export default UploadPage;
