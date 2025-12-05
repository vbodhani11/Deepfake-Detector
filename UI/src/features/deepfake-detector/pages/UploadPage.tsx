import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ParticlesBackground from '../components/ParticlesBackground';
import FuturisticButton from '../components/FuturisticButton';
import FileUpload from '../components/FileUpload';
import ProgressBar from '../components/ProgressBar';
import AnalysisProgress from '../components/AnalysisProgress';
import ToastContainer, { ToastMessage } from '../components/ToastContainer';
import { uploadDetection, fetchDetectionById, DetectionRecord, DetectionStatus } from '../api/detection';

const MAX_VIDEO_DURATION_SECONDS = 10; // Match backend setting

interface UploadedFile {
  file: File;
  preview?: string; // For images (data URL) or videos (object URL)
  previewType?: 'image' | 'video'; // Track preview type
}

const UploadPage: React.FC = () => {
  const navigate = useNavigate();
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingToServer, setIsUploadingToServer] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisStatus, setAnalysisStatus] = useState('Uploading file...');
  const [elapsedTime, setElapsedTime] = useState(0);
  const [currentDetection, setCurrentDetection] = useState<DetectionRecord | null>(null);

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

  const addToast = (message: string, type: ToastMessage['type'] = 'info', duration = 5000) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type, duration }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const checkVideoDuration = (file: File): Promise<void> => {
    return new Promise((resolve) => {
      if (!file.type.startsWith('video/')) {
        resolve(); // Not a video, skip check
        return;
      }

      const video = document.createElement('video');
      video.preload = 'metadata';
      video.src = URL.createObjectURL(file);

      video.onloadedmetadata = () => {
        URL.revokeObjectURL(video.src);
        const duration = video.duration;
        
        if (duration > MAX_VIDEO_DURATION_SECONDS) {
          addToast(
            `ℹ️ Your video is ${duration.toFixed(1)}s long. We'll automatically analyze the first ${MAX_VIDEO_DURATION_SECONDS} seconds for optimal performance.`,
            'info',
            7000
          );
        }
        resolve();
      };

      video.onerror = () => {
        URL.revokeObjectURL(video.src);
        resolve(); // Continue anyway
      };
    });
  };

  const handleFileSelect = async (file: File) => {
    // Cleanup previous video preview URL if it exists
    setUploadedFile(prev => {
      if (prev?.previewType === 'video' && prev.preview) {
        URL.revokeObjectURL(prev.preview);
      }
      return null;
    });

    setErrorMessage(null);

    // Check video duration and inform user if it will be trimmed
    if (file.type.startsWith('video/')) {
      await checkVideoDuration(file);
    }

    setUploadedFile({ file });
    setIsUploading(true);
    setUploadComplete(false);
    setUploadProgress(0);
    setUploadStatus('');

    // Show info toast for video duration limit (only if not already shown)
    if (file.type.startsWith('video/')) {
      // The checkVideoDuration function will show the toast if needed
    }

    // Generate preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = e => {
        setUploadedFile(prev => (prev ? { 
          ...prev, 
          preview: e.target?.result as string,
          previewType: 'image'
        } : null));
      };
      reader.readAsDataURL(file);
    }
    
    // Generate preview for videos
    else if (file.type.startsWith('video/')) {
      const videoUrl = URL.createObjectURL(file);
      setUploadedFile(prev => (prev ? { 
        ...prev, 
        preview: videoUrl,
        previewType: 'video'
      } : null));
    }

    // Simulate upload progress
    simulateUploadProgress(file);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Cleanup object URLs to prevent memory leaks
  useEffect(() => {
    return () => {
      if (uploadedFile?.previewType === 'video' && uploadedFile.preview) {
        URL.revokeObjectURL(uploadedFile.preview);
      }
    };
  }, [uploadedFile]);

  const handleClearFile = () => {
    if (uploadedFile?.previewType === 'video' && uploadedFile.preview) {
      URL.revokeObjectURL(uploadedFile.preview);
    }
    setUploadedFile(null);
    setUploadProgress(0);
    setUploadStatus('');
    setErrorMessage(null);
  };

  const handleCheckDeepfake = async () => {
    if (!uploadedFile) {
      return;
    }

    setErrorMessage(null);
    setIsUploadingToServer(true);
    setUploadComplete(false);
    setUploadStatus(`Uploading to server: ${uploadedFile.file.name} (${formatFileSize(uploadedFile.file.size)})`);
    setUploadProgress(0);

    try {
      // Start elapsed time counter
      const startTime = Date.now();
      const elapsedInterval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);

      const detection = await uploadDetection(uploadedFile.file, {
        onProgress: progress => {
          setUploadProgress(progress);
          if (progress >= 100) {
            // Upload complete, switch to analysis mode
            setUploadComplete(true); // Mark upload as complete
            setIsAnalyzing(true);
            setAnalysisProgress(10);
            setAnalysisStatus('File uploaded! Starting analysis...');
          }
        },
      });

      setUploadProgress(100);
      setUploadStatus('Upload complete! Analyzing...');
      setUploadComplete(true); // Ensure upload is marked complete
      setIsAnalyzing(true);
      setAnalysisProgress(5); // Start at 5% - Uploading step complete, moving to Preparing
      setAnalysisStatus('Initializing detection pipeline...');
      setCurrentDetection(detection);

      // Poll for analysis progress
      let pollTimeout: number | undefined;
      let isActive = true;
      let progressAnimInterval: number | undefined;
      let currentDetectionRef: DetectionRecord | null = detection;

      // Start progress animation
      progressAnimInterval = window.setInterval(() => {
        setAnalysisProgress(prev => {
          const status = currentDetectionRef?.status;
          if (status === 'completed' || status === 'failed') {
            return prev;
          }
          const increment = status === 'processing' ? 1.2 : 0.6;
          const maxProgress = status === 'processing' ? 95 : 20;
          return Math.min(prev + increment, maxProgress);
        });
      }, 400);

      const pollDetection = async () => {
        try {
          const latest = await fetchDetectionById(detection.id);
          if (!isActive) return;

          currentDetectionRef = latest; // Update ref for animation
          setCurrentDetection(latest);
          
          if (latest.status === 'completed') {
            clearInterval(progressAnimInterval);
            setAnalysisProgress(100);
            setAnalysisStatus('Analysis complete!');
            setIsAnalyzing(false);
            clearInterval(elapsedInterval);
            
            // Navigate to analysis page after a brief delay
            setTimeout(() => {
              const detectionId = latest.id;
              const fileName = latest.file_name ?? uploadedFile.file.name;
              
              // Cleanup
              if (uploadedFile.previewType === 'video' && uploadedFile.preview) {
                URL.revokeObjectURL(uploadedFile.preview);
              }
              
              const redirectPath = `/analysis?detectionId=${encodeURIComponent(detectionId)}`;
              // For guests, remember pending save so it can be claimed after login
              const token = localStorage.getItem('deepfake_token') || localStorage.getItem('auth_token');
              if (!token) {
                localStorage.setItem('pending_save_detection_id', detectionId);
              }
              navigate(redirectPath, {
                state: {
                  detectionId,
                  fileName,
                  initialDetection: latest,
                },
              });
            }, 1500);
          } else if (latest.status === 'failed') {
            clearInterval(progressAnimInterval);
            setIsAnalyzing(false);
            clearInterval(elapsedInterval);
            setErrorMessage(latest.error_message || 'Analysis failed');
            setUploadStatus('Analysis failed. Please try again.');
          } else {
            // Update status based on detection status
            const statusMessages: Record<DetectionStatus, string> = {
              pending: 'Initializing detection pipeline...',
              processing: 'Analyzing video frames with AI models...',
              completed: 'Analysis complete!',
              failed: 'Analysis failed',
            };
            setAnalysisStatus(statusMessages[latest.status] || 'Processing...');
            
            // Continue polling
            pollTimeout = window.setTimeout(pollDetection, 3000);
          }
        } catch (error) {
          if (!isActive) return;
          console.error('Error polling detection:', error);
          pollTimeout = window.setTimeout(pollDetection, 3000);
        }
      };

      // Start polling
      pollDetection();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to upload file';
      setErrorMessage(message);
      setUploadStatus('Upload failed. Please try again.');
      setUploadProgress(0);
      setUploadComplete(false);
    } finally {
      setIsUploadingToServer(false);
    }
  };

  return (
    <div className='min-h-screen bg-black text-gray-300 relative overflow-x-hidden'>
      <ParticlesBackground />
      <ToastContainer toasts={toasts} onRemove={removeToast} />

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
                <>
                  {uploadedFile.previewType === 'image' ? (
                    <img
                      src={uploadedFile.preview}
                      alt='Uploaded preview'
                      className='max-w-full max-h-64 mx-auto rounded-lg mb-6'
                    />
                  ) : uploadedFile.previewType === 'video' ? (
                    <video
                      src={uploadedFile.preview}
                      controls
                      className='max-w-full max-h-96 mx-auto rounded-lg mb-6'
                      preload='metadata'
                    >
                      Your browser does not support the video tag.
                    </video>
                  ) : null}
                </>
              )}

              {/* Show Analysis Progress when analyzing, otherwise show upload progress */}
              {isAnalyzing ? (
                <div className='mb-6'>
                  <AnalysisProgress 
                    progress={analysisProgress} 
                    status={analysisStatus} 
                    elapsedTime={elapsedTime}
                    detectionStatus={currentDetection?.status}
                    uploadComplete={uploadComplete}
                  />
                </div>
              ) : (
                <>
                  {/* Progress Bar for upload only */}
                  {(isUploading || isUploadingToServer || uploadComplete) && (
                    <ProgressBar progress={uploadProgress} status={uploadStatus} className='mb-6' />
                  )}

                  {/* Upload Complete Status */}
                  {uploadComplete && !isAnalyzing && (
                    <div className='text-green-400 mb-6'>
                      <p className='text-lg font-semibold'>✅ {uploadStatus}</p>
                    </div>
                  )}
                </>
              )}

              {errorMessage && (
                <div className='text-red-400 mb-4'>
                  <p className='text-lg font-semibold'>⚠️ {errorMessage}</p>
                </div>
              )}

              {/* File Info and Clear Button */}
              <div className='flex justify-between items-center mb-4'>
                <div className='text-gray-300'>
                  <p className='font-semibold'>{uploadedFile.file.name}</p>
                  <p className='text-sm text-gray-400'>{formatFileSize(uploadedFile.file.size)}</p>
                </div>
                <button
                  onClick={handleClearFile}
                  className='px-4 py-2 text-sm bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors'
                >
                  Change File
                </button>
              </div>
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

          {uploadedFile && (
            <FuturisticButton variant='secondary' onClick={handleCheckDeepfake} disabled={isUploadingToServer}>
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
              {isUploadingToServer ? 'Uploading...' : 'Check Deepfake'}
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
