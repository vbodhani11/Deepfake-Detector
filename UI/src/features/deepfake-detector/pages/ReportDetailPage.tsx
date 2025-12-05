import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ProgressBar from '../components/ProgressBar';
import { DetectionRecord, DetectionResult, fetchDetectionById } from '../api/detection';
import { useEffect, useState } from 'react';

const formatFileSize = (size: number): string => {
  if (!Number.isFinite(size)) {
    return '—';
  }
  if (size >= 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(2)} MB`;
  }
  if (size >= 1024) {
    return `${(size / 1024).toFixed(2)} KB`;
  }
  return `${size} B`;
};

const formatResultLabel = (result?: DetectionResult | null) => {
  if (!result) {
    return { label: 'Pending', badge: 'bg-slate-600 text-slate-100' };
  }
  if (result === 'fake') return { label: 'Fake', badge: 'bg-rose-500/30 text-rose-200' };
  if (result === 'real') return { label: 'Real', badge: 'bg-emerald-500/30 text-emerald-200' };
  return { label: 'Uncertain', badge: 'bg-amber-500/30 text-amber-100' };
};

const metricCard = (label: string, value: string | number | null | undefined) => (
  <div className='bg-slate-900/60 border border-slate-800/80 rounded-xl p-4'>
    <p className='text-xs uppercase tracking-widest text-slate-400 mb-1'>{label}</p>
    <p className='text-2xl font-semibold text-blue-100'>{value ?? '—'}</p>
  </div>
);

const ReportDetailPage: React.FC = () => {
  const { reportId } = useParams<{ reportId: string }>();
  const navigate = useNavigate();

  const [report, setReport] = useState<DetectionRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;
    const id = reportId;
    if (!id) return;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const r = await fetchDetectionById(id);
        if (!isActive) return;
        setReport(r);
      } catch (err) {
        if (!isActive) return;
        setError(err instanceof Error ? err.message : 'Failed to load report');
      } finally {
        if (isActive) setLoading(false);
      }
    };

    load();
    return () => {
      isActive = false;
    };
  }, [reportId]);

  if (loading) {
    return (
      <div className='min-h-screen bg-animated text-gray-200 flex items-center justify-center deepfake-app'>
        <div className='text-slate-400'>Loading report...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className='min-h-screen bg-animated text-gray-200 flex flex-col items-center justify-center gap-6 deepfake-app'>
        <p className='text-xl text-rose-300'>Error: {error}</p>
        <button
          type='button'
          onClick={() => navigate('/reports')}
          className='px-6 py-3 rounded-lg bg-blue-600/80 hover:bg-blue-500 text-white transition-colors'
        >
          Back to Reports
        </button>
      </div>
    );
  }

  if (!report) {
    return (
      <div className='min-h-screen bg-animated text-gray-200 flex flex-col items-center justify-center gap-6 deepfake-app'>
        <p className='text-xl text-slate-200'>Report not found.</p>
        <button
          type='button'
          onClick={() => navigate('/reports')}
          className='px-6 py-3 rounded-lg bg-blue-600/80 hover:bg-blue-500 text-white transition-colors'
        >
          Back to Reports
        </button>
      </div>
    );
  }

  const resultLabel = formatResultLabel(report.result ?? undefined);
  const fakeRatioPercent = report.fake_ratio ? `${Math.round(report.fake_ratio * 100)}%` : '\u2014';
  const confidenceValue = report.confidence_score ?? 0;
  const framePredictions = report.frame_predictions?.frames ?? [];

  return (
    <div className='min-h-screen bg-animated text-gray-200 deepfake-app relative overflow-hidden'>
      <div className='max-w-6xl mx-auto py-16 px-6 relative z-10 space-y-10'>
        <div className='flex items-center justify-between gap-4'>
          <button
            type='button'
            onClick={() => navigate('/reports')}
            className='inline-flex items-center gap-2 text-sm text-blue-300 hover:text-blue-200 transition-colors'
          >
            ← Back to Reports
          </button>
          <div className='text-xs uppercase tracking-[0.3em] text-blue-200/60'>Report {report.id}</div>
        </div>

        <header className='space-y-4'>
          <p className='uppercase tracking-[0.3em] text-xs text-blue-200/60'>Analysis Summary</p>
          <h1 className='text-4xl font-semibold text-blue-100'>{report.file_name}</h1>
          <div className='inline-flex items-center gap-3 px-4 py-2 rounded-full bg-slate-900/60 border border-slate-800/70 text-sm text-slate-300'>
            <span>{report.media_type.toUpperCase()}</span>
            <span className='text-slate-500'>•</span>
            <span>{formatFileSize(report.file_size)}</span>
            <span className='text-slate-500'>•</span>
            <span>{new Date(report.created_at).toLocaleString()}</span>
          </div>
        </header>

        <section className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
          <div className='lg:col-span-2 bg-slate-900/60 border border-slate-800/70 rounded-2xl p-6 space-y-6 min-w-0'>
            <div className='flex flex-wrap items-center gap-3'>
              <span className={`px-4 py-1.5 rounded-full text-sm font-semibold ${resultLabel.badge}`}>
                {resultLabel.label}
              </span>
              <span className='text-xs uppercase tracking-widest text-slate-400'>
                Status: <strong className='text-slate-100 ml-1'>{report.status}</strong>
              </span>
            </div>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
              <div className='min-w-0'>
                <p className='text-xs uppercase tracking-widest text-slate-400 mb-2'>Confidence Score</p>
                <p className='text-4xl md:text-5xl font-semibold text-blue-100 mb-4 break-words'>
                  {report.confidence_score ?? '—'}%
                </p>
                <ProgressBar progress={confidenceValue} status={`${confidenceValue}% certainty`} />
              </div>
              <div className='bg-slate-950/40 border border-slate-800/80 rounded-xl p-4 space-y-2 min-w-0'>
                <p className='text-xs uppercase tracking-widest text-slate-400'>Processing Time</p>
                <p className='text-2xl md:text-3xl font-semibold text-blue-100 break-words'>
                  {report.processing_time_seconds 
                    ? `${Number(report.processing_time_seconds).toFixed(1)}s` 
                    : '—'}
                </p>
                <p className='text-xs text-slate-400 break-words'>
                  Model evaluated frames at {report.fps_used ?? '—'} FPS with threshold {report.threshold_used ?? '—'}.
                </p>
              </div>
            </div>
          </div>
          <div className='bg-slate-900/60 border border-slate-800/70 rounded-2xl p-6 space-y-4 min-w-0'>
            <p className='text-xs uppercase tracking-widest text-slate-400'>File Details</p>
            <div className='space-y-3 text-slate-200 text-sm'>
              <div className='flex justify-between gap-2 text-slate-300'>
                <span className='flex-shrink-0'>File name</span>
                <span className='font-medium text-blue-100 truncate text-right' title={report.file_name}>
                  {report.file_name}
                </span>
              </div>
              <div className='flex justify-between gap-2 text-slate-300'>
                <span className='flex-shrink-0'>Media type</span>
                <span className='font-medium uppercase text-blue-100 text-right'>{report.media_type}</span>
              </div>
              <div className='flex justify-between gap-2 text-slate-300'>
                <span className='flex-shrink-0'>File size</span>
                <span className='font-medium text-blue-100 text-right'>{formatFileSize(report.file_size)}</span>
              </div>
              <div className='flex justify-between gap-2 text-slate-300'>
                <span className='flex-shrink-0'>Created</span>
                <span className='font-medium text-blue-100 text-right break-words'>
                  {new Date(report.created_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className='space-y-4'>
          <div>
            <p className='uppercase tracking-[0.3em] text-xs text-blue-200/60 mb-2'>Analysis Metrics</p>
            <h2 className='text-2xl font-semibold text-blue-100'>Detection Breakdown</h2>
          </div>
          <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
            {metricCard('Total Frames', report.total_frames_processed ?? '—')}
            {metricCard('Fake Frames', report.fake_frames ?? '—')}
            {metricCard('Real Frames', report.real_frames ?? '—')}
            {metricCard('Fake Ratio', fakeRatioPercent)}
            {metricCard('Avg Fake Probability', report.average_fake_probability?.toFixed(2) ?? '—')}
            {metricCard('Threshold Used', report.threshold_used ?? '—')}
          </div>
        </section>

        <section className='space-y-4'>
          <div className='flex flex-col md:flex-row md:items-center md:justify-between gap-2'>
            <div>
              <p className='uppercase tracking-[0.3em] text-xs text-blue-200/60 mb-2'>Frame-Level Details</p>
              <h2 className='text-2xl font-semibold text-blue-100'>Frame-by-Frame Predictions</h2>
            </div>
            <p className='text-sm text-slate-400'>
              Showing {framePredictions.length} predictions sampled across the analyzed video.
            </p>
          </div>

          {framePredictions.length ? (
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
              {framePredictions.map(frame => {
                // Derive classification from fake_probability if not provided
                const classification: DetectionResult = frame.classification ?? 
                  (frame.fake_probability >= 0.5 ? 'fake' : 'real');
                
                return (
                  <div
                    key={frame.frame_index}
                    className='bg-slate-900/60 border border-slate-800/70 rounded-xl p-4 space-y-3'
                  >
                    <div className='flex items-center justify-between text-sm text-slate-300'>
                      <span>Frame #{frame.frame_index}</span>
                      <span>{((frame.timestamp_ms ?? 0) / 1000).toFixed(2)}s</span>
                    </div>
                    <div className='h-2 bg-slate-800 rounded-full overflow-hidden'>
                      <div
                        className={`h-full rounded-full ${
                          classification === 'fake' ? 'bg-rose-400' : 'bg-emerald-400'
                        }`}
                        style={{ width: `${frame.fake_probability * 100}%` }}
                      />
                    </div>
                    <div className='flex items-center justify-between text-sm'>
                      <span className='text-slate-400'>Fake probability</span>
                      <span className='font-semibold text-blue-100'>
                        {(frame.fake_probability * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className='text-xs uppercase tracking-widest text-slate-400'>
                      Classified as{' '}
                      <span className='text-slate-100 font-semibold'>{classification.toUpperCase()}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className='bg-slate-900/60 border border-slate-800/70 rounded-xl p-6 text-slate-300 text-center'>
              Frame-level predictions will appear here once this analysis finishes processing.
            </div>
          )}
        </section>

        <section className='flex flex-wrap gap-4 justify-end pt-6 border-t border-slate-800/40'>
          <button
            type='button'
            onClick={() => navigate('/reports')}
            className='px-6 py-3 rounded-lg border border-slate-600/80 text-slate-200 hover:text-white hover:border-blue-400 transition-colors'
          >
            Back to Reports List
          </button>
          <button
            type='button'
            disabled
            className='px-6 py-3 rounded-lg bg-slate-700/70 text-slate-400 cursor-not-allowed'
            title='Download support coming soon'
          >
            Download Report (coming soon)
          </button>
        </section>
      </div>
    </div>
  );
};

export default ReportDetailPage;

