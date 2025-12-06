import React, { useRef, useEffect, useState } from 'react';
import { FramePrediction } from '../api/detection';

interface FrameByFramePlayerProps {
  videoUrl: string;
  framePredictions: FramePrediction[];
  fps?: number; // Frames per second used during extraction
}

const FrameByFramePlayer: React.FC<FrameByFramePlayerProps> = ({
  videoUrl,
  framePredictions,
  fps = 3,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentProbability, setCurrentProbability] = useState<number | null>(null);
  const [videoLoaded, setVideoLoaded] = useState(false);

  // Map frame predictions by time (approximate)
  const frameMap = React.useMemo(() => {
    const map = new Map<number, FramePrediction>();
    if (!framePredictions || framePredictions.length === 0) return map;
    
    framePredictions.forEach((pred) => {
      // Calculate approximate time: frame_index / fps
      const timeInSeconds = pred.frame_index / fps;
      map.set(Math.floor(timeInSeconds * 10) / 10, pred); // Round to 0.1s precision
    });
    return map;
  }, [framePredictions, fps]);

  // Update current frame based on video time
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateFrame = () => {
      const currentTime = video.currentTime;
      const roundedTime = Math.floor(currentTime * 10) / 10;
      const prediction = frameMap.get(roundedTime);

      if (prediction) {
        setCurrentFrameIndex(prediction.frame_index);
        setCurrentProbability(prediction.fake_probability);
      } else {
        // Find closest frame
        const times = Array.from(frameMap.keys());
        const closestTime = times.reduce((prev, curr) =>
          Math.abs(curr - currentTime) < Math.abs(prev - currentTime) ? curr : prev
        );
        const closestPred = frameMap.get(closestTime);
        if (closestPred) {
          setCurrentFrameIndex(closestPred.frame_index);
          setCurrentProbability(closestPred.fake_probability);
        }
      }
    };

    const handleLoaded = () => {
      setVideoLoaded(true);
      updateFrame();
    };

    video.addEventListener('timeupdate', updateFrame);
    video.addEventListener('loadedmetadata', handleLoaded);
    video.addEventListener('play', () => setIsPlaying(true));
    video.addEventListener('pause', () => setIsPlaying(false));

    return () => {
      video.removeEventListener('timeupdate', updateFrame);
      video.removeEventListener('loadedmetadata', handleLoaded);
      video.removeEventListener('play', () => setIsPlaying(true));
      video.removeEventListener('pause', () => setIsPlaying(false));
    };
  }, [frameMap]);


  const formatProbability = (prob: number) => {
    const percentage = prob * 100;
    // Show more precision for very high/low values
    if (percentage >= 99.9 || percentage <= 0.1) {
      return percentage.toFixed(2);
    }
    return percentage.toFixed(1);
  };

  const getProbabilityColor = (prob: number) => {
    if (prob >= 0.8) return 'text-red-400';
    if (prob >= 0.6) return 'text-orange-400';
    if (prob >= 0.4) return 'text-yellow-400';
    return 'text-green-400';
  };

  const getProbabilityBgColor = (prob: number) => {
    if (prob >= 0.8) return 'bg-red-500';
    if (prob >= 0.6) return 'bg-orange-500';
    if (prob >= 0.4) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className='w-full max-w-5xl mx-auto'>
      {/* Video Player Container */}
      <div className='relative bg-black rounded-xl overflow-hidden shadow-2xl mb-6'>
        {!videoLoaded && (
          <div className='absolute inset-0 flex items-center justify-center bg-gray-900 z-10'>
            <div className='text-center'>
              <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4'></div>
              <p className='text-gray-400'>Loading video...</p>
            </div>
          </div>
        )}
        <video
          ref={videoRef}
          src={videoUrl}
          className='w-full h-auto max-h-[70vh]'
          controls
          preload='metadata'
          onLoadedMetadata={() => setVideoLoaded(true)}
        />

        {/* Overlay Probability Display */}
        {currentProbability !== null && (
          <div className='absolute top-4 right-4'>
            <div
              className={`px-6 py-4 rounded-xl backdrop-blur-md bg-black bg-opacity-70 border-2 ${
                currentProbability >= 0.5
                  ? 'border-red-500 shadow-lg shadow-red-500/50'
                  : 'border-green-500 shadow-lg shadow-green-500/50'
              }`}
            >
              <div className='text-xs text-gray-400 mb-1'>Frame #{currentFrameIndex}</div>
              <div className={`text-3xl font-bold ${getProbabilityColor(currentProbability)}`}>
                {formatProbability(currentProbability)}%
              </div>
              {currentProbability >= 0.999 && (
                <div className='text-xs text-yellow-300 mt-1'>Very High Confidence</div>
              )}
              <div className='text-xs text-gray-300 mt-1'>
                {currentProbability >= 0.5 ? 'FAKE' : 'REAL'}
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Frame-by-Frame Probability Timeline */}
      <div className='bg-gray-800 bg-opacity-60 rounded-xl p-6 backdrop-blur-sm'>
        <h3 className='text-xl font-bold text-blue-400 mb-4'>Frame-by-Frame Analysis</h3>
        
        {/* Statistics Summary */}
        {framePredictions && framePredictions.length > 0 && (
          <div className='mb-4 p-4 bg-gray-900 bg-opacity-50 rounded-lg'>
            <div className='grid grid-cols-3 gap-4 text-sm'>
              <div>
                <div className='text-gray-400'>Min Probability</div>
                <div className='text-lg font-bold text-green-400'>
                  {formatProbability(Math.min(...framePredictions.map(p => p.fake_probability)))}%
                </div>
              </div>
              <div>
                <div className='text-gray-400'>Average</div>
                <div className='text-lg font-bold text-blue-400'>
                  {formatProbability(
                    framePredictions.reduce((sum, p) => sum + p.fake_probability, 0) / framePredictions.length
                  )}%
                </div>
              </div>
              <div>
                <div className='text-gray-400'>Max Probability</div>
                <div className='text-lg font-bold text-red-400'>
                  {formatProbability(Math.max(...framePredictions.map(p => p.fake_probability)))}%
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Current Frame Info */}
        {currentProbability !== null && (
          <div className='mb-6'>
            <div className='flex items-center justify-between mb-2'>
              <span className='text-gray-300'>Current Frame: #{currentFrameIndex}</span>
              <span className={`text-lg font-bold ${getProbabilityColor(currentProbability)}`}>
                {formatProbability(currentProbability)}% Fake
              </span>
            </div>
            <div className='w-full bg-gray-700 rounded-full h-3 overflow-hidden'>
              <div
                className={`h-full transition-all duration-300 ${getProbabilityBgColor(currentProbability)}`}
                style={{ width: `${currentProbability * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* All Frames Grid */}
        <div className='grid grid-cols-8 sm:grid-cols-12 md:grid-cols-16 gap-2 max-h-64 overflow-y-auto'>
          {framePredictions.map((pred, idx) => {
            const isCurrent = pred.frame_index === currentFrameIndex;
            const bgColorClass = getProbabilityBgColor(pred.fake_probability);
            return (
              <div
                key={idx}
                className={`relative aspect-square rounded-lg cursor-pointer transition-all ${bgColorClass} opacity-80 ${
                  isCurrent
                    ? 'ring-2 ring-blue-400 scale-110 z-10 opacity-100'
                    : 'hover:scale-105 hover:opacity-100'
                }`}
                onClick={() => {
                  const video = videoRef.current;
                  if (video) {
                    video.currentTime = pred.frame_index / fps;
                  }
                }}
                title={`Frame ${pred.frame_index}: ${formatProbability(pred.fake_probability)}%`}
              >
                <div className='absolute inset-0 flex items-center justify-center'>
                  <span className='text-xs font-bold text-white drop-shadow-lg'>
                    {pred.frame_index}
                  </span>
                </div>
                {isCurrent && (
                  <div className='absolute -top-1 -right-1 w-3 h-3 bg-blue-400 rounded-full animate-pulse' />
                )}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className='mt-4 flex items-center justify-center gap-6 text-sm'>
          <div className='flex items-center gap-2'>
            <div className='w-4 h-4 bg-red-500 rounded' />
            <span className='text-gray-300'>High Fake Probability</span>
          </div>
          <div className='flex items-center gap-2'>
            <div className='w-4 h-4 bg-yellow-500 rounded' />
            <span className='text-gray-300'>Uncertain</span>
          </div>
          <div className='flex items-center gap-2'>
            <div className='w-4 h-4 bg-green-500 rounded' />
            <span className='text-gray-300'>Low Fake Probability</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FrameByFramePlayer;

