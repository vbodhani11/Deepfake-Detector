import React from 'react';
import { useNavigate } from 'react-router-dom';
import { DetectionRecord, DetectionResult } from '../api/detection';
import { mockDetectionRecords } from '../data/mock-detection-records';

const resultColors: Record<DetectionResult, { text: string; dot: string; label: string }> = {
  real: { text: 'text-emerald-300', dot: 'bg-emerald-400', label: 'Real' },
  fake: { text: 'text-rose-300', dot: 'bg-rose-400', label: 'Fake' },
  uncertain: { text: 'text-amber-300', dot: 'bg-amber-400', label: 'Uncertain' },
};

const formatDateTime = (value: string): string => {
  return new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
};

const formatConfidence = (value?: number | null): string => {
  if (typeof value !== 'number') {
    return '—';
  }
  return `${value}%`;
};

const ReportsPage: React.FC = () => {
  const navigate = useNavigate();

  const handleNavigateToDetail = (recordId: DetectionRecord['id']) => {
    navigate(`/reports/${recordId}`);
  };

  const resolveResultStyles = (result?: DetectionResult | null) => {
    if (!result) {
      return { text: 'text-slate-200', dot: 'bg-slate-400', label: 'Pending' };
    }
    return resultColors[result];
  };

  return (
    <div className='min-h-screen bg-animated text-gray-200 deepfake-app relative overflow-hidden'>
      <div className='max-w-6xl mx-auto py-16 px-6 relative z-10'>
        <div className='flex flex-col gap-4 mb-10'>
          <button
            type='button'
            onClick={() => navigate('/')}
            className='inline-flex items-center gap-2 text-sm text-blue-300 hover:text-blue-200 transition-colors'
          >
            ← Back to Home
          </button>
          <div>
            <p className='uppercase tracking-[0.3em] text-xs text-blue-200/60 mb-2'>Report Library</p>
            <h1 className='text-4xl font-semibold text-blue-100 mb-3'>Detailed Detection Reports</h1>
            <p className='text-slate-300 max-w-3xl'>
              Review every video analysis performed by the detector. Each report summarizes the detection result,
              confidence, processing status, and timestamp so you can quickly triage suspicious media.
            </p>
          </div>
        </div>

        <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
          {mockDetectionRecords.map(record => {
            const resultStyle = resolveResultStyles(record.result ?? undefined);
            return (
              <button
                type='button'
                key={record.id}
                onClick={() => handleNavigateToDetail(record.id)}
                className='text-left bg-slate-900/60 border border-slate-700/60 rounded-2xl p-6 hover:border-blue-500/60 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-300 group backdrop-blur-sm'
              >
                <div className='flex items-start justify-between gap-3 mb-4'>
                  <div>
                    <p className='text-xs uppercase tracking-widest text-slate-400'>File</p>
                    <h2 className='text-xl font-semibold text-blue-50 mt-1'>{record.file_name}</h2>
                  </div>
                  <span className='text-xs text-slate-400'>{formatDateTime(record.created_at)}</span>
                </div>

                <div className='flex items-center gap-3 mb-6'>
                  <span className={`inline-flex items-center gap-2 font-semibold ${resultStyle.text}`}>
                    <span className={`h-2.5 w-2.5 rounded-full ${resultStyle.dot}`} />
                    {resultStyle.label}
                  </span>
                  <span className='text-xs uppercase tracking-widest text-slate-500'>|</span>
                  <span className='text-xs uppercase tracking-widest text-slate-300'>{record.status}</span>
                </div>

                <div className='grid grid-cols-2 gap-6'>
                  <div>
                    <p className='text-xs uppercase tracking-widest text-slate-400 mb-1'>Confidence</p>
                    <p className='text-3xl font-bold text-blue-300'>{formatConfidence(record.confidence_score)}</p>
                  </div>
                  <div className='text-right'>
                    <p className='text-xs uppercase tracking-widest text-slate-400 mb-1'>Processing</p>
                    <p className='text-lg font-semibold text-slate-200'>
                      {record.processing_time_seconds ? `${record.processing_time_seconds}s` : 'N/A'}
                    </p>
                    <p className='text-xs text-slate-400'>Elapsed time</p>
                  </div>
                </div>

                <div className='mt-6 flex items-center justify-between text-sm text-slate-400'>
                  <span>ID: {record.id}</span>
                  <span className='inline-flex items-center gap-1 text-blue-300 group-hover:text-blue-200'>
                    View report →
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;
