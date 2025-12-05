import React from 'react';
import { useNavigate } from 'react-router-dom';
import { DetectionRecord, DetectionResult, fetchUserDetections } from '../api/detection';
import { useEffect, useState } from 'react';

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
  const [reports, setReports] = useState<DetectionRecord[]>([]);
  const [page, setPage] = useState(1);
  const [perPage] = useState(12);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleNavigateToDetail = (recordId: DetectionRecord['id']) => {
    navigate(`/reports/${recordId}`);
  };

  useEffect(() => {
    let isActive = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const resp = await fetchUserDetections(page, perPage);
        if (!isActive) return;
        setReports(resp?.items ?? []);
        setTotal(resp?.total ?? resp?.items?.length ?? 0);
      } catch (err) {
        if (!isActive) return;
        setError(err instanceof Error ? err.message : 'Failed to load reports');
        setReports([]); // Ensure reports is always an array
        setTotal(0);
      } finally {
        if (isActive) setLoading(false);
      }
    };

    load();
    return () => {
      isActive = false;
    };
  }, [page, perPage]);

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

        <div className='min-h-[200px]'>
          {loading ? (
            <div className='py-12 text-center text-slate-400'>Loading reports...</div>
          ) : error ? (
            <div className='py-12 text-center'>
              <div className='bg-red-900/30 border border-red-500/50 rounded-lg p-6 max-w-2xl mx-auto'>
                <p className='text-rose-300 text-lg font-semibold mb-2'>Error loading reports</p>
                <p className='text-rose-400 text-sm'>{error}</p>
                <button
                  onClick={() => window.location.reload()}
                  className='mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors'
                >
                  Retry
                </button>
              </div>
            </div>
          ) : !reports || !reports.length ? (
            <div className='py-24 text-center text-slate-400'>No saved reports yet.</div>
          ) : (
            <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
              {reports.map(record => {
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
                        View report 
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
        {/* Pagination */}
        {total > perPage && (
          <div className='max-w-6xl mx-auto mt-8 flex items-center justify-between'>
            <div className='text-sm text-slate-400'>Showing page {page}</div>
            <div className='flex gap-2'>
              <button
                type='button'
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className='px-3 py-1 rounded bg-slate-800 text-slate-200 disabled:opacity-40'
              >
                Previous
              </button>
              <button
                type='button'
                onClick={() => setPage(p => p + 1)}
                disabled={page * perPage >= total}
                className='px-3 py-1 rounded bg-slate-800 text-slate-200 disabled:opacity-40'
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportsPage;
